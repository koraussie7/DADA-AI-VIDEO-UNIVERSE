/**
 * rewards.js — DADA-Video-Universe DADAPOINT 보상 처리
 * 
 * 조회수/좋아요 기반으로 DADAPOINT 토큰 자동 지급
 */

const REWARD_RATE_VIEWS = 1000    // 1000 views → 1 DADAPOINT
const REWARD_RATE_LIKES = 10      // 10 likes → 1 DADAPOINT
const REWARD_MAX_PER_POST = 100   // 전체 보상 상한

// ── 특정 비디오 보상 계산 ──
async function calculateReward(videoId, author) {
  try {
    const res = await mds('MDS_select', {
      data: JSON.stringify({ videoId, type: 'view' }),
      scope: 'DADA_REACTION'
    })
    const views = Array.isArray(res) ? res.length : 0
    
    const likesRes = await mds('MDS_select', {
      data: JSON.stringify({ videoId, type: 'like' }),
      scope: 'DADA_REACTION'
    })
    const likes = Array.isArray(likesRes) ? likesRes.length : 0
    
    const viewReward = Math.floor(views / REWARD_RATE_VIEWS)
    const likeReward = Math.floor(likes / REWARD_RATE_LIKES)
    
    return {
      views,
      likes,
      viewReward,
      likeReward,
      total: Math.min(viewReward + likeReward, REWARD_MAX_PER_POST)
    }
  } catch (e) {
    return { error: e.message }
  }
}

// ── 보상 청구 ──
async function claimReward(videoId, author) {
  const reward = await calculateReward(videoId, author)
  if (reward.total <= 0) {
    return { error: 'No rewards to claim' }
  }
  
  // DADA Hermes API 서버로 보상 전송 요청
  try {
    const res = await fetch('/reward/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoId,
        to: author,
        amount: reward.total,
        memo: `DADA Video Reward: ${videoId}`
      })
    })
    const data = await res.json()
    
    // 보상 내역 저장
    await mds('MDS_insert', {
      data: JSON.stringify({
        videoId,
        to: author,
        amount: reward.total,
        views: reward.views,
        likes: reward.likes,
        claimed: Date.now()
      }),
      scope: 'DADA_REWARD'
    })
    
    return data
  } catch (e) {
    return { error: e.message }
  }
}

// ── 글로벌 노출 ──
window.dadaRewards = {
  calculateReward,
  claimReward,
  REWARD_RATE_VIEWS,
  REWARD_RATE_LIKES
}
