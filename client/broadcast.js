/**
 * broadcast.js — DADA-Video-Universe (Minima-only)
 *
 * Avalon / Hive / Steem / Blurt broadcast 레이어를 Minima MDS로 완전 교체
 */

broadcast = {
  /**
   * Minima MDS에 비디오/댓글 게시
   * @param {string} author - Minima 주소
   * @param {string} permlink - 고유 퍼머링크
   * @param {string} title - 제목
   * @param {string} body - 내용
   * @param {object} jsonMetadata - 메타데이터
   * @param {string} tag - 태그
   * @param {function} cb - 콜백
   */
  comment: function(author, permlink, title, body, jsonMetadata, tag, cb) {
    if (!tag) tag = ''
    tag = tag.toLowerCase().trim()

    // Minima MDS에 게시
    minima.publishVideo(
      author,
      title || 'Untitled',
      body || '',
      jsonMetadata?.video?.url || '',
      jsonMetadata?.video?.thumbnailUrl || '',
      [tag]
    ).then(result => {
      if (result && result.error) {
        cb && cb(result.error)
      } else {
        cb && cb(null, result)
      }
    }).catch(err => {
      cb && cb(err)
    })
  },

  /**
   * 댓글 게시
   */
  commentEdit: function(permlink, jsonMetadata, cb) {
    // Minima에서는 edit도 MDS_insert (덮어쓰기)
    minima.publishVideo(
      Session.get('activeUsername'), 
      jsonMetadata?.title || 'Updated',
      jsonMetadata?.body || '',
      jsonMetadata?.video?.url || '',
      jsonMetadata?.video?.thumbnailUrl || '',
      [jsonMetadata?.tags?.[0] || '']
    ).then(r => cb && cb(null, r))
     .catch(e => cb && cb(e))
  },

  /**
   * 투표 (좋아요)
   */
  vote: function(author, permlink, weight, tag, tip, cb) {
    const user = Session.get('activeUsername')
    if (!user) {
      cb && cb('Not logged in')
      return
    }
    
    minima.likeVideo(user, permlink).then(result => {
      cb && cb(null, result)
    }).catch(err => cb && cb(err))
  },

  /**
   * 팔로우
   */
  follow: function(name, cb) {
    const user = Session.get('activeUsername')
    if (!user) {
      cb && cb('Not logged in')
      return
    }
    
    // Minima MDS에 팔로우 관계 저장
    minima.mds('MDS_insert', {
      data: JSON.stringify({
        follower: user,
        following: name,
        type: 'follow',
        created: Date.now()
      }),
      scope: 'DADA_RELATION'
    }).then(r => cb && cb(null, r))
      .catch(e => cb && cb(e))
  },

  unfollow: function(name, cb) {
    const user = Session.get('activeUsername')
    if (!user) {
      cb && cb('Not logged in')
      return
    }
    
    minima.mds('MDS_delete', {
      data: JSON.stringify({
        follower: user,
        following: name,
        type: 'follow'
      }),
      scope: 'DADA_RELATION'
    }).then(r => cb && cb(null, r))
      .catch(e => cb && cb(e))
  },

  /**
   * 콘텐츠 업데이트
   */
  update: function(author, permlink, data, cb) {
    minima.publishVideo(
      author,
      data.title || 'Updated',
      data.body || '',
      data.videoUrl || '',
      data.thumbnail || '',
      data.tags || []
    ).then(r => cb && cb(null, r))
     .catch(e => cb && cb(e))
  },

  /**
   * DADAPOINT 보상 전송 (시청/좋아요 리워드)
   */
  reward: function(to, amount, memo, cb) {
    minima.rewardTokens(to, amount, memo)
      .then(r => cb && cb(null, r))
      .catch(e => cb && cb(e))
  }
}

// Minima-only 모드 설정 (Avalon/Hive/Steem/Blurt 비활성화)
Session.set('isDTCDisabled', false)   // Minima = 새로운 DTC
Session.set('isHiveDisabled', true)
Session.set('isSteemDisabled', true)
Session.set('isBlurtDisabled', true)
