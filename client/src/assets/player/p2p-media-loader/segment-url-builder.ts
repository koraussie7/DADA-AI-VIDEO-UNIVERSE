import { Segment } from 'p2p-media-loader-core'
import { RedundancyUrlManager } from './redundancy-url-manager'

// Cloudflare IPFS 게이트웨이 설정
const CF_IPFS_GATEWAY = 'https://cloudflare-ipfs.com/ipfs'
let firstSegmentCid: string | null = null

export function setFirstSegmentCid(cid: string) {
  firstSegmentCid = cid
}

function segmentUrlBuilderFactory (redundancyUrlManager: RedundancyUrlManager) {
  return function segmentBuilder (segment: Segment): string {
    // 첫 번째 세그먼트만 IPFS에서 로드 (버퍼링 제로)
    if (firstSegmentCid && segment.index === 0) {
      return `${CF_IPFS_GATEWAY}/${firstSegmentCid}`
    }
    // 나머지 세그먼트는 기존 CDN/P2P
    return redundancyUrlManager.buildUrl(segment.url)
  }
}

export {
  segmentUrlBuilderFactory
}
