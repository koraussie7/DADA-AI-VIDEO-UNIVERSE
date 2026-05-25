/**
 * login.js — DADA-Video-Universe (Minima MDS 로그인)
 * 
 * Avalon/Steem/Hive/Blurt 로그인을 Minima MDS 기반 sign-in으로 교체
 */

// ── 초기화 ──
Template.login.rendered = () => {
  Session.set('loginSelectionStep', true)
  Session.set('loginAvalonStep', false)
  Session.set('loginStep', false)
  Session.set('minimaSignatureStep', false)

  if (!Session.get('currentNonLoginPath') || Session.get('currentNonLoginPath').startsWith('/login'))
    Session.set('currentNonLoginPath', '/')
}

Template.login.helpers({
  noMinimaLogin: () => !Session.get('activeUsername'),
  isSelectingNetwork: () => Session.get('loginSelectionStep'),
  isLoggingInMinima: () => Session.get('loginAvalonStep'),
  isMinimaSignaturePending: () => Session.get('minimaSignatureStep'),
  
  // Minima MDS 연결 상태
  isMinimaConnected: () => {
    return localStorage.getItem('minimaMDSHost') || false
  }
})

Template.login.events({
  // Minima 로그인 버튼
  'click .loginOption[data-network="Minima"]': async (event) => {
    Session.set('loginSelectionStep', false)
    Session.set('loginAvalonStep', true)
    
    try {
      // Minima MDS에 주소 요청
      const res = await fetch(
        (localStorage.getItem('minimaMDSHost') || 'http://127.0.0.1:9003') + '/mds/cmd/address',
        { method: 'POST' }
      )
      const text = await res.text()
      let data
      
      try { data = JSON.parse(text) } 
      catch { data = { error: 'Failed to parse response' } }
      
      if (data && data.address) {
        // Minima 주소를 세션에 저장
        const address = data.address
        Session.set('activeUsername', address)
        Session.set('loginAvalonStep', false)
        Session.set('minimaSignatureStep', true)
        
        // 간단한 signature 검증 요청
        const sigRes = await fetch(
          (localStorage.getItem('minimaMDSHost') || 'http://127.0.0.1:9003') + '/mds/cmd/sign',
          {
            method: 'POST',
            body: new URLSearchParams({
              data: 'DADA-Video-Universe-Login-' + Date.now()
            }).toString()
          }
        )
        const sigText = await sigRes.text()
        let sigData
        try { sigData = JSON.parse(sigText) } 
        catch { sigData = { error: 'Failed to parse signature' } }
        
        if (sigData && sigData.signature) {
          // 로그인 성공 — 사용자 등록
          await registerWithMinima(address)
          
          Session.set('minimaSignatureStep', false)
          Session.set('activeUsername', address)
          
          // DTC (Minima) 활성화
          Session.set('isDTCDisabled', false)
          Session.set('isHiveDisabled', true)
          Session.set('isSteemDisabled', true)
          Session.set('isBlurtDisabled', true)
          
          // 홈으로 이동
          FlowRouter.go(Session.get('currentNonLoginPath'))
        }
      }
    } catch (e) {
      console.error('Minima login error:', e)
      Session.set('loginSelectionStep', true)
      Session.set('loginAvalonStep', false)
      alert('Minima connection failed. Is Minima MDS running? (port 9003)')
    }
  }
})

// ── Minima 주소로 사용자 등록 ──
async function registerWithMinima(address) {
  try {
    const res = await minima.mds('MDS_insert', {
      data: JSON.stringify({
        address: address,
        username: address.substring(0, 12) + '...',
        registered: Date.now()
      }),
      scope: 'DADA_USER'
    })
    return res
  } catch (e) {
    console.error('User registration error:', e)
    return null
  }
}

// ── Minima 수동 주소 입력 ──
Template.loginMinima.helpers({
  isLoggingIn: function() {
    return Session.get('loginAvalonStep') && !Session.get('minimaSignatureStep')
  }
})

Template.loginMinima.events({
  'click #loginMinimaDirect': async function(event) {
    const address = $('#minimaAddressInput').val().trim()
    if (!address || address.length < 10) {
      alert('Please enter a valid Minima address')
      return
    }
    
    Session.set('activeUsername', address)
    Session.set('isDTCDisabled', false)
    
    FlowRouter.go(Session.get('currentNonLoginPath'))
  }
})

// ── Minima 로그인 상태 템플릿 ──
Template.loginMinimaSignature.helpers({
  signaturePending: function() {
    return Session.get('minimaSignatureStep')
  }
})
