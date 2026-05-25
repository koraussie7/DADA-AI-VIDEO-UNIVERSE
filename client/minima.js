/**
 * Minima MDS Client — DADA-Video-Universe (DTube Minima 포크)
 *
 * Avalon / Hive / Steem / Blurt 블록체인을 Minima MDS로 완전 교체
 * 로그인, 글 작성, 보상 모두 MDS RPC + DADAPOINT 토큰 사용
 */

// ── 설정 ──
const MINIMA_MDS_HOST = localStorage.getItem('minimaMDSHost') || 'http://127.0.0.1:9003'
const MINIMA_RPC_HOST = 'http://185.55.240.110:9005'
const DADAPOINT_TOKEN_COIN = '0x16FAC6DF9F8F406973A2C0C9AAF66CACEC62E2C3C96BEB6CB85A6D5F8EC557C2'

// ── MDS RPC 유틸 ──
async function mds(command, params = {}) {
  try {
    const res = await fetch(`${MINIMA_MDS_HOST}/mds/cmd/${command}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ ...params }).toString()
    })
    const text = await res.text()
    try { return JSON.parse(text) } catch { return text }
  } catch (e) {
    console.error('Minima MDS error:', e)
    return { error: e.message }
  }
}

// ── 신규 사용자 등록 / 프로필 저장 ──
async function registerUser(address, username, profile) {
  return mds('MDS_insert', {
    data: JSON.stringify({
      address,
      username,
      profile: profile || {},
      registered: Date.now()
    }),
    scope: 'DADA_USER'
  })
}

async function getUser(address) {
  return mds('MDS_select', {
    data: JSON.stringify({ address }),
    scope: 'DADA_USER'
  })
}

// ── 글 (비디오) 게시 ──
async function publishVideo(author, title, description, videoUrl, thumbnail, tags) {
  return mds('MDS_insert', {
    data: JSON.stringify({
      author,
      title,
      description,
      videoUrl,
      thumbnail,
      tags: tags || [],
      created: Date.now(),
      active: true
    }),
    scope: 'DADA_VIDEO'
  })
}

async function getVideos(options = {}) {
  return mds('MDS_select', {
    data: JSON.stringify({}),
    scope: 'DADA_VIDEO'
  })
}

// ── 댓글 ──
async function addComment(author, videoId, body) {
  return mds('MDS_insert', {
    data: JSON.stringify({ author, videoId, body, created: Date.now() }),
    scope: 'DADA_COMMENT'
  })
}

async function getComments(videoId) {
  return mds('MDS_select', {
    data: JSON.stringify({ videoId }),
    scope: 'DADA_COMMENT'
  })
}

// ── 좋아요 / 조회수 ──
async function likeVideo(user, videoId) {
  return mds('MDS_insert', {
    data: JSON.stringify({ user, videoId, type: 'like', created: Date.now() }),
    scope: 'DADA_REACTION'
  })
}

async function recordView(user, videoId) {
  return mds('MDS_insert', {
    data: JSON.stringify({ user, videoId, type: 'view', created: Date.now() }),
    scope: 'DADA_REACTION'
  })
}

// ── DADAPOINT 보상 (API 서버를 통해) ──
async function rewardTokens(toAddress, amount, memo) {
  // DADA AI Reward API 서버로 전송 위임
  try {
    const res = await fetch('/reward/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: toAddress,
        amount: parseFloat(amount),
        token: DADAPOINT_TOKEN_COIN,
        memo: memo || ''
      })
    })
    return await res.json()
  } catch (e) {
    console.error('Reward API error:', e)
    return { error: e.message }
  }
}



// ── DADAPOINT 토큰 조회 / 전송 ──
async function getDADABalance(address) {
  return mds("balance", { address, tokenid: DADAPOINT_TOKEN_COIN });
}

async function getDADASupply() {
  try {
    const res = await fetch(`${MINIMA_RPC_HOST}/minima/coin?coinid=${DADAPOINT_TOKEN_COIN}`);
    const json = await res.json();
    return json && json.coins ? json.coins.length : 0;
  } catch(e) { return 0; }
}

async function transferTokens(fromAddress, toAddress, amount, memo) {
  // Delegate to DADA API server for secure signing
  try {
    const res = await fetch("/reward/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from: fromAddress,
        to: toAddress,
        amount: parseFloat(amount),
        token: DADAPOINT_TOKEN_COIN,
        memo: memo || ""
      })
    });
    return await res.json();
  } catch(e) { return { error: e.message }; }
}

// ── avalon 호환 함수 (chain users 등) ──
async function getBlockHeight() {
  try {
    const res = await fetch(`${MINIMA_RPC_HOST}/minima/block`);
    const json = await res.json();
    return json?.block?.chainheight || 0;
  } catch(e) { return 0; }
}

// ── 조회수 기반 DADAPOINT 보상 계산 ──
async function calculateViewReward(videoId) {
  const views = await mds("MDS_select", {
    data: JSON.stringify({ videoId, type: "view" }),
    scope: "DADA_REACTION"
  });
  const viewCount = Array.isArray(views) ? views.length : 0;
  // 1000 views = 1 DADAPOINT
  return Math.floor(viewCount / 1000);
}

// ── 글로벌 객체로 노출 (avalon.js 대체) ──
window.minima = {
  config: { host: MINIMA_MDS_HOST, coin: DADAPOINT_TOKEN_COIN },

  // 사용자
  registerUser,
  getUser,

  // 비디오
  publishVideo,
  getVideos,

  // 댓글
  addComment,
  getComments,

  // 반응
  likeVideo,
  recordView,

  // 토큰
  rewardTokens,
  getDADABalance,
  getDADASupply,
  transferTokens,
  getBlockHeight,
  calculateViewReward,
  DADAPOINT_TOKEN_COIN,

  // 유틸
  mds
}
