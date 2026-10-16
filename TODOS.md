# 할 일 목록

마지막 갱신: 2026-10-16

## 1. 카카오·구글 로그인 인증 키 설정 (코드 완료, 키만 필요)

상세 설명: `docs/social-login-setup.md`
코드 위치: `artifacts/api-server/src/lib/social-auth.ts`, `artifacts/api-server/src/routes/social-auth.ts`

### 서버 환경변수 5개 (Vercel → Settings → Environment Variables, 로컬은 `.env`)

```
APP_URL=https://실제도메인                 # origin만, 끝 슬래시·경로 없음, 운영은 HTTPS 필수
SOCIAL_AUTH_COOKIE_SECRET=<64자리 hex>      # 아래 명령으로 생성
GOOGLE_OAUTH_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=GOCSPX-xxxx
KAKAO_OAUTH_CLIENT_ID=<카카오 REST API 키>   # JavaScript 키 아님
KAKAO_OAUTH_CLIENT_SECRET=<카카오 Client Secret>
```

- 5개가 모두 있어야 로그인 버튼이 나타남. 하나라도 빠지면 해당 버튼은 조용히 숨겨짐.
- `VITE_` 접두사로 넣지 말 것. 저장소에 커밋하지 말 것.
- 쿠키 비밀키 생성: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- 변수 등록 후 Vercel 재배포 필요.

### 구글 (https://console.cloud.google.com)

- [ ] 프로젝트 생성/선택
- [ ] API 및 서비스 → OAuth 동의 화면: 앱 이름, 지원 이메일, 홈페이지, 개인정보처리방침·이용약관 URL 등록
- [ ] 사용자 인증 정보 → OAuth 클라이언트 ID 생성 → 유형 "웹 애플리케이션"
- [ ] 승인된 리디렉션 URI에 정확히 추가: `https://실제도메인/api/auth/social/google/callback`
- [ ] 발급된 클라이언트 ID / 비밀번호를 환경변수에 등록
- [ ] 동의 화면을 "테스트"에서 "게시"로 전환 (테스트 상태면 등록된 테스트 사용자만 로그인 가능)
- 코드는 `openid email` 범위만 요청하므로 민감 범위 검수 불필요

### 카카오 (https://developers.kakao.com)

- [ ] 내 애플리케이션 → 애플리케이션 추가
- [ ] 앱 설정 → 플랫폼 → Web: 사이트 도메인 `https://실제도메인` 등록
- [ ] 제품 설정 → 카카오 로그인: 활성화 ON
- [ ] 같은 화면에서 **OpenID Connect 활성화 ON** (안 켜면 동작 안 함)
- [ ] Redirect URI에 정확히 등록: `https://실제도메인/api/auth/social/kakao/callback`
- [ ] 카카오 로그인 → 보안: Client Secret 생성 후 활성화 상태 "사용함"
- [ ] 앱 설정 → 앱 키의 **REST API 키**를 클라이언트 ID로 사용
- 동의항목(닉네임·프로필·이메일)은 추가 설정하지 않음. 코드는 `openid`만 요청하고 식별자만 저장함.

### 로컬 테스트 시

- 각 콘솔에 `http://localhost:3000/api/auth/social/google/callback`, `http://localhost:3000/api/auth/social/kakao/callback`도 별도 등록
- 로컬 `.env`의 `APP_URL=http://localhost:3000` (localhost http만 허용)

### 설정 후 실제 브라우저 검증

- [ ] 제공자별 신규 가입
- [ ] 기존 회원 로그인
- [ ] 인증 취소
- [ ] 동일 이메일 충돌 (자동 연결 안 됨, 의도된 동작)
- [ ] 동의 미선택 차단
- [ ] 모바일 복귀
- 리다이렉트 URI가 한 글자라도 다르면 `redirect_uri_mismatch`. 끝 슬래시, http/https, www 유무 확인.

## 2. 개인정보처리방침 보완

- [ ] 전용 문의 이메일 주소 생성 후 개인정보처리방침에 추가 (현재는 기존 문의하기 경로 안내)
- [ ] 실제 이용 중인 인증·호스팅·DB·AI·결제 처리업체(개인정보 위탁) 목록 반영
- [ ] 국외 이전 여부와 국가·항목·기간 반영
- [ ] 법정 보관기간 반영
- [ ] 회원가입 연령 제한·만 14세 미만 법정대리인 확인 정책 확정

## 3. 버그 확인

- [ ] 검증 중 발견된 메뉴 클릭 무반응 원인 확인

## 완료

- [x] 가입 약관 동의·개인정보 안내 확인 반영
- [x] 첫 무료 PDF 다운로드·재다운로드 확인
- [x] 카카오·구글 로그인 코드 구현 (`c11f1da`)
- [x] 성능 최적화: DB 스키마 초기화, API 캐싱, 번들 분할, 렌더링 (`252f090`)
