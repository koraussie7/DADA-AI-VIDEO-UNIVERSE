import fetch from 'node-fetch'
import express from 'express'
import { AccessDeniedError } from 'oauth2-server'
import { PluginManager } from '@server/lib/plugins/plugin-manager'
import { ActorModel } from '@server/models/actor/actor'
import { MOAuthClient, MUserDefault } from '@server/types/models'
import { MOAuthTokenUser } from '@server/types/models/oauth/oauth-token'
import { MUser } from '@server/types/models/user/user'
import { UserAdminFlag } from '@shared/models/users/user-flag.model'
import { UserRole } from '@shared/models/users/user-role'
import { CONSTRAINTS_FIELDS, PEERTUBE_VERSION, WEBSERVER } from '@server/initializers/constants'
import { logger } from '../../helpers/logger'
import { CONFIG } from '../../initializers/config'
import { UserModel } from '../../models/user/user'
import { OAuthClientModel } from '../../models/oauth/oauth-client'
import { OAuthTokenModel } from '../../models/oauth/oauth-token'
import { createUserAccountAndChannelAndPlaylist } from '../user'
import { TokensCache } from './tokens-cache'

type TokenInfo = {
  accessToken: string
  refreshToken: string
  accessTokenExpiresAt: Date
  refreshTokenExpiresAt: Date
}

export type BypassLogin = {
  bypass: boolean
  pluginName: string
  authName?: string
  user: {
    username: string
    email: string
    displayName: string
    role: UserRole
  }
}

async function getAccessToken (bearerToken: string) {
  logger.debug('Getting access token (bearerToken: ' + bearerToken + ').')

  if (!bearerToken) return undefined

  let tokenModel: MOAuthTokenUser

  if (TokensCache.Instance.hasToken(bearerToken)) {
    tokenModel = TokensCache.Instance.getByToken(bearerToken)
  } else {
    tokenModel = await OAuthTokenModel.getByTokenAndPopulateUser(bearerToken)

    if (tokenModel) TokensCache.Instance.setToken(tokenModel)
  }

  if (!tokenModel) return undefined

  if (tokenModel.User.pluginAuth) {
    const valid = await PluginManager.Instance.isTokenValid(tokenModel, 'access')

    if (valid !== true) return undefined
  }

  return tokenModel
}

function getClient (clientId: string, clientSecret: string) {
  logger.debug('Getting Client (clientId: ' + clientId + ', clientSecret: ' + clientSecret + ').')

  return OAuthClientModel.getByIdAndSecret(clientId, clientSecret)
}

async function getRefreshToken (refreshToken: string) {
  logger.debug('Getting RefreshToken (refreshToken: ' + refreshToken + ').')

  const tokenInfo = await OAuthTokenModel.getByRefreshTokenAndPopulateClient(refreshToken)
  if (!tokenInfo) return undefined

  const tokenModel = tokenInfo.token

  if (tokenModel.User.pluginAuth) {
    const valid = await PluginManager.Instance.isTokenValid(tokenModel, 'refresh')

    if (valid !== true) return undefined
  }

  return tokenInfo
}

const USERS_CONSTRAINTS_FIELDS = CONSTRAINTS_FIELDS.USERS

async function generateUntakenUsername (username: string, email: string) {
  const newUsernameFromEmail = `${(email || '').split('@')[0].toLowerCase().replace(/\s/g, '_').replace(/[^a-z0-9._]/g, '').trim()}`
  let newUsernameFromName = `${(username || newUsernameFromEmail).toLowerCase().replace(/\s/g, '_').replace(/[^a-z0-9._]/g, '').trim()}`

  // Commented code so it always uses new username from email.
  // if (newUsernameFromName.length > (USERS_CONSTRAINTS_FIELDS.USERNAME.max - USERS_CONSTRAINTS_FIELDS.USERNAME.min)) {
  newUsernameFromName = newUsernameFromEmail // Use username generated from email if username generated from name exceeds a reasonable length
  // }

  let testUser = {} as any
  do {
    if (newUsernameFromName.length >= USERS_CONSTRAINTS_FIELDS.USERNAME.min) {
      testUser = await UserModel.loadByUsername(newUsernameFromName) // Check for username conflicts with other users
      if (!testUser) { testUser = await ActorModel.loadLocalByName(newUsernameFromName) } // Check for username conflicts with other actors
      if (!testUser) { break }
    }
    newUsernameFromName = newUsernameFromName + `${Math.floor(Math.random() * 10)}`
  } while (testUser)

  return newUsernameFromName
}

async function getUserFirebase (usernameOrEmail: string, password: string, user?: MUserDefault) {
  if (!usernameOrEmail.includes('@')) {
    return null // Firebase only allows email login. Above is a quick check
  }
  const userResult = await fetch('https://us-central1-bittube-airtime-extension.cloudfunctions.net/verifyPassword', {
    headers: {
      'User-Agent': `PeerTube/${PEERTUBE_VERSION} (+${WEBSERVER.URL})`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email: usernameOrEmail, password }),
    method: 'POST'
  }).then(response => response.json())

  if (userResult.success && userResult.user && userResult.decodedIdToken) {
    const email = userResult.user.email
    const firebaseInfo = userResult.decodedIdToken.firebase

    if ((firebaseInfo || {}).identities && firebaseInfo.sign_in_provider) {
      if ([ 'google.com', 'facebook.com', 'twitter.com' ].includes(firebaseInfo.sign_in_provider)) {
        if ((firebaseInfo.identities[firebaseInfo.sign_in_provider] || []).length) {
          userResult.user.emailVerified = true
        }
      }
    }
    const emailVerified = userResult.user.emailVerified || false
    const userDisplayName = userResult.user.displayName || undefined

    if (!user) {
      const userData = {
        username: await generateUntakenUsername(userDisplayName, email),
        email,
        password,
        role: UserRole.USER,
        emailVerified: CONFIG.SIGNUP.REQUIRES_EMAIL_VERIFICATION ? emailVerified : null,
        nsfwPolicy: CONFIG.INSTANCE.DEFAULT_NSFW_POLICY,
        videoQuota: CONFIG.USER.VIDEO_QUOTA,
        videoQuotaDaily: CONFIG.USER.VIDEO_QUOTA_DAILY
      }

      const userToCreate = new UserModel(userData)
      const userCreationResult = await createUserAccountAndChannelAndPlaylist({
        userToCreate,
        userDisplayName
      })

      user = userCreationResult.user
    }

    if (user.blocked) throw new AccessDeniedError('User is blocked.')

    if (CONFIG.SIGNUP.REQUIRES_EMAIL_VERIFICATION && user.emailVerified === false) {
      throw new AccessDeniedError('User email is not verified.')
    }

    return user
  }
  return null
}

async function getUser (usernameOrEmail?: string, password?: string, bypassLogin?: BypassLogin) {
  // Special treatment coming from a plugin
  if (bypassLogin && bypassLogin.bypass === true) {
    logger.info('Bypassing oauth login by plugin %s.', bypassLogin.pluginName)

    let user = await UserModel.loadByEmail(bypassLogin.user.email)
    if (!user) user = await createUserFromExternal(bypassLogin.pluginName, bypassLogin.user)

    // Cannot create a user
    if (!user) throw new AccessDeniedError('Cannot create such user: an actor with that name already exists.')

    // If the user does not belongs to a plugin, it was created before its installation
    // Then we just go through a regular login process
    if (user.pluginAuth !== null) {
      // This user does not belong to this plugin, skip it
      if (user.pluginAuth !== bypassLogin.pluginName) return null

      checkUserValidityOrThrow(user)

      return user
    }
  }

  logger.debug('Getting User (username/email: ' + usernameOrEmail + ', password: ******).')

  const user = await UserModel.loadByUsernameOrEmail(usernameOrEmail)
  // If we don't find the user, or if the user belongs to a plugin
  if (!user) return getUserFirebase(usernameOrEmail, password, null)
  if (!user || user.pluginAuth !== null || !password) return null

  const passwordMatch = await user.isPasswordMatch(password)
  if (passwordMatch !== true) return getUserFirebase(usernameOrEmail, password, user)

  checkUserValidityOrThrow(user)

  if (CONFIG.SIGNUP.REQUIRES_EMAIL_VERIFICATION && user.emailVerified === false) {
    throw new AccessDeniedError('User email is not verified.')
  }

  return user
}

async function revokeToken (
  tokenInfo: { refreshToken: string },
  options: {
    req?: express.Request
    explicitLogout?: boolean
  } = {}
): Promise<{ success: boolean, redirectUrl?: string }> {
  const { req, explicitLogout } = options

  const token = await OAuthTokenModel.getByRefreshTokenAndPopulateUser(tokenInfo.refreshToken)

  if (token) {
    let redirectUrl: string

    if (explicitLogout === true && token.User.pluginAuth && token.authName) {
      redirectUrl = await PluginManager.Instance.onLogout(token.User.pluginAuth, token.authName, token.User, req)
    }

    TokensCache.Instance.clearCacheByToken(token.accessToken)

    token.destroy()
         .catch(err => logger.error('Cannot destroy token when revoking token.', { err }))

    return { success: true, redirectUrl }
  }

  return { success: false }
}

async function saveToken (
  token: TokenInfo,
  client: MOAuthClient,
  user: MUser,
  options: {
    refreshTokenAuthName?: string
    bypassLogin?: BypassLogin
  } = {}
) {
  const { refreshTokenAuthName, bypassLogin } = options
  let authName: string = null

  if (bypassLogin?.bypass === true) {
    authName = bypassLogin.authName
  } else if (refreshTokenAuthName) {
    authName = refreshTokenAuthName
  }

  logger.debug('Saving token ' + token.accessToken + ' for client ' + client.id + ' and user ' + user.id + '.')

  const tokenToCreate = {
    accessToken: token.accessToken,
    accessTokenExpiresAt: token.accessTokenExpiresAt,
    refreshToken: token.refreshToken,
    refreshTokenExpiresAt: token.refreshTokenExpiresAt,
    authName,
    oAuthClientId: client.id,
    userId: user.id
  }

  const tokenCreated = await OAuthTokenModel.create(tokenToCreate)

  user.lastLoginDate = new Date()
  await user.save()

  return {
    accessToken: tokenCreated.accessToken,
    accessTokenExpiresAt: tokenCreated.accessTokenExpiresAt,
    refreshToken: tokenCreated.refreshToken,
    refreshTokenExpiresAt: tokenCreated.refreshTokenExpiresAt,
    client,
    user,
    accessTokenExpiresIn: buildExpiresIn(tokenCreated.accessTokenExpiresAt),
    refreshTokenExpiresIn: buildExpiresIn(tokenCreated.refreshTokenExpiresAt)
  }
}

export {
  getAccessToken,
  getClient,
  getRefreshToken,
  getUser,
  revokeToken,
  saveToken
}

// ---------------------------------------------------------------------------

async function createUserFromExternal (pluginAuth: string, options: {
  username: string
  email: string
  role: UserRole
  displayName: string
}) {
  // Check an actor does not already exists with that name (removed user)
  const actor = await ActorModel.loadLocalByName(options.username)
  if (actor) return null

  const userToCreate = new UserModel({
    username: options.username,
    password: null,
    email: options.email,
    nsfwPolicy: CONFIG.INSTANCE.DEFAULT_NSFW_POLICY,
    autoPlayVideo: true,
    role: options.role,
    videoQuota: CONFIG.USER.VIDEO_QUOTA,
    videoQuotaDaily: CONFIG.USER.VIDEO_QUOTA_DAILY,
    adminFlags: UserAdminFlag.NONE,
    pluginAuth
  }) as MUser

  const { user } = await createUserAccountAndChannelAndPlaylist({
    userToCreate,
    userDisplayName: options.displayName
  })

  return user
}

function checkUserValidityOrThrow (user: MUser) {
  if (user.blocked) throw new AccessDeniedError('User is blocked.')
}

function buildExpiresIn (expiresAt: Date) {
  return Math.floor((expiresAt.getTime() - new Date().getTime()) / 1000)
}
