# DTube → DADA-Video-Universe: Minima Migration Plan

## 개요
DTube의 Avalon/Hive/Steem/Blurt 블록체인 레이어를 Minima MDS로 전면 교체

## 작업 단계

### Phase 1: 코어 모듈 교체 ✅ 완료
1. **`client/minima.js`** (← avalon.js 대체) ✅
   - Minima MDS RPC 클라이언트
   - 사용자 등록/조회, 비디오 게시, 댓글, 좋아요
   - DADAPOINT 보상 연동 API

### Phase 2: 블록체인 레이어 제거 (필요)
2. **`package.json`** — `javalon2`, `steem`, `@hiveio/hive-js`, `@blurtfoundation/blurtjs` 제거
3. **`client/avalon.js`** → `client/minima.js`로 교체 (import 전환)
4. **`client/broadcast.js`** — broadcast 시그니처 단순화 (Minima-only)
5. **`client/settings.js`** — 블록체인 RPC URL 제거, Minima MDS + DADA-API 주소만 남김

### Phase 3: 로그인 시스템 교체 (필요)
6. **`client/views/pages/login/`** — loginavalon/loginhive/loginsteem/loginblurt 제거
7. **`login.js` / `login.html`** — Minima MDS 서명 기반 로그인으로 교체

### Phase 4: UI 참조 정리 (많음)
8. 각 `*.html`/`*.js`에서 Avalon/Hive/Steem/Blurt 참조 제거
9. 브라우저 세션 상태 (`activeUsername`, `isDTCDisabled` 등) → `minima.js` 기반으로 변경

### Phase 5: 보상 시스템 (필요)
10. DADAPOINT 보상 연동 (시청 → 토큰 지급)

## 현재 작업 상태
- [x] Phase 1: minima.js 생성 완료
- [ ] Phase 2-5: 미시작

## 다음 실행
Phase 2부터 순차 진행. 각 파일 수정 시 원본 유지.
