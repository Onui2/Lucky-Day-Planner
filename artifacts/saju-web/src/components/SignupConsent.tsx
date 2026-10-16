import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  getSocialAuthProviders,
  startSocialLogin,
  type SocialAuthProvider,
  type SocialProvider,
} from "@/lib/auth-client";

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");

export function SignupConsent({ terms, privacy, onTermsChange, onPrivacyChange, disabled, provider }: {
  terms: boolean;
  privacy: boolean;
  onTermsChange: (checked: boolean) => void;
  onPrivacyChange: (checked: boolean) => void;
  disabled?: boolean;
  provider?: SocialProvider;
}) {
  return (
    <fieldset disabled={disabled} className="space-y-3 rounded-2xl border border-primary/20 bg-background/30 p-4">
      <legend className="px-1 text-sm font-semibold">가입 전 확인</legend>
      <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm leading-6">
        <input type="checkbox" checked={terms} onChange={(event) => onTermsChange(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-primary" />
        <span>[필수] 이용약관에 동의합니다.</span>
      </label>
      <a href={`${BASE}/terms`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-sm text-primary underline underline-offset-4">이용약관 전문 보기 (새 창)</a>
      <div className="space-y-2 border-t border-primary/15 pt-3 text-xs leading-6 text-muted-foreground">
        <p><strong className="text-foreground">목적:</strong> 회원 식별, 로그인, 계정 관리 및 요청한 회원 서비스 제공</p>
        <p><strong className="text-foreground">항목:</strong> {provider === "kakao" ? "카카오 회원 식별번호, 로그인 제공자" : provider === "google" ? "구글 회원 식별번호, 이메일, 로그인 제공자" : "이메일, 비밀번호(암호화 저장)"}, 약관 동의·안내 확인 버전과 시각</p>
        <p><strong className="text-foreground">보유:</strong> 회원 탈퇴 시까지. 법령에 따라 보관할 거래 기록은 별도 보관합니다.</p>
        <p>회원 서비스 계약 이행에 필요한 정보입니다. 회원가입을 원하지 않으면 가입을 중단하고 비회원 사주 분석을 이용할 수 있습니다.</p>
      </div>
      <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm leading-6">
        <input type="checkbox" checked={privacy} onChange={(event) => onPrivacyChange(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-primary" />
        <span>[필수 확인] 위 개인정보 처리 안내를 확인했습니다.</span>
      </label>
      <a href={`${BASE}/privacy`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-sm text-primary underline underline-offset-4">개인정보처리방침 전문 보기 (새 창)</a>
    </fieldset>
  );
}

export function SocialLoginButtons({ returnTo, disabled, onError }: {
  returnTo: string;
  disabled?: boolean;
  onError: (message: string) => void;
}) {
  const [providers, setProviders] = useState<SocialAuthProvider[]>([]);
  const [starting, setStarting] = useState<SocialProvider | null>(null);
  useEffect(() => {
    let active = true;
    void getSocialAuthProviders().then((result) => {
      if (active) setProviders(result);
    }).catch(() => {
      if (active) setProviders([]);
    });
    return () => { active = false; };
  }, []);

  if (!providers.length) return null;

  return (
    <div className="mb-6 space-y-3">
      {providers.map((provider) => (
        <button
          key={provider.id}
          type="button"
          disabled={disabled || starting !== null}
          className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-opacity disabled:opacity-50 ${provider.id === "kakao" ? "border-[#FEE500] bg-[#FEE500] text-[#191919]" : "border-slate-300 bg-white text-slate-800"}`}
          onClick={async () => {
            setStarting(provider.id);
            try {
              await startSocialLogin(provider.id, returnTo);
            } catch (error) {
              onError(error instanceof Error ? error.message : "간편 로그인 연결에 실패했습니다.");
              setStarting(null);
            }
          }}
        >
          {starting === provider.id && <Loader2 className="h-4 w-4 animate-spin" />}
          {provider.id === "kakao" ? "카카오" : "Google"}로 계속하기
        </button>
      ))}
      <p className="text-center text-xs leading-5 text-muted-foreground">처음 이용하면 로그인 후 가입 안내를 확인합니다.</p>
      <div className="flex items-center gap-3 pt-2 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />또는 이메일로 이용<span className="h-px flex-1 bg-border" /></div>
    </div>
  );
}
