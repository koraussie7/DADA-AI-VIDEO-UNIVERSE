import * as crypto from 'crypto'
import * as fs from 'fs-extra'
import { pipeline } from 'stream/promises'

const IPFS_API_URL = process.env.IPFS_API_URL || 'http://127.0.0.1:5001'
const CF_IPFS_GATEWAY = 'https://cloudflare-ipfs.com/ipfs'

export interface IpfsPinResult {
  cid: string
  gatewayUrl: string
  size: number
}

/**
 * Pin first HLS segment to IPFS via local IPFS node or Pinata
 */
export async function pinFirstSegment (segmentPath: string): Promise<IpfsPinResult> {
  const stats = await fs.stat(segmentPath)
  
  // Try local IPFS node first, fallback to Pinata
  try {
    return await pinToLocalIpfs(segmentPath)
  } catch (err) {
    console.log('Local IPFS unavailable, trying Pinata...', err)
    return await pinToPinata(segmentPath)
  }
}

async function pinToLocalIpfs (filePath: string): Promise<IpfsPinResult> {
  const fileContent = await fs.readFile(filePath)
  const formData = new FormData()
  const blob = new Blob([fileContent])
  formData.append('file', blob, 'init.mp4')

  const res = await fetch(`${IPFS_API_URL}/api/v0/add`, {
    method: 'POST',
    body: formData
  })
  
  const data = await res.json() as any
  return {
    cid: data.Hash || data.cid,
    gatewayUrl: `${CF_IPFS_GATEWAY}/${data.Hash || data.cid}`,
    size: fileContent.length
  }
}

async function pinToPinata (filePath: string): Promise<IpfsPinResult> {
  const pinataJwt = process.env.PINATA_JWT
  if (!pinataJwt) throw new Error('PINATA_JWT not set')

  const fileContent = await fs.readFile(filePath)
  const formData = new FormData()
  const blob = new Blob([fileContent])
  formData.append('file', blob, 'init.mp4')

  const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: { Authorization: `Bearer ${pinataJwt}` },
    body: formData
  })
  
  const data = await res.json() as any
  return {
    cid: data.IpfsHash || data.cid,
    gatewayUrl: `${CF_IPFS_GATEWAY}/${data.IpfsHash || data.cid}`,
    size: fileContent.length
  }
}

export { CF_IPFS_GATEWAY }
