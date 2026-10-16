import { useEffect, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { motion } from "framer-motion";
import { AlertCircle, Eye, EyeOff, Loader2, Moon, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SignupConsent, SocialLoginButtons } from "@/components/SignupConsent";
import { useAuth } from "@workspace/replit-auth-web";
import {
  type AuthSetupStatus,
  type PendingSocialSignup,
  SIGNUP_CONSENT_VERSION,
  completeSocialSignup,
  getAuthSetupStatus,
  getPendingSocialSignup,
  registerWithPassword,
} from "@/lib/auth-client";
import { buildAuthHref, sanitizeReturnTo } from "@/lib/auth-redirect";

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");

export default function RegisterPage() {
  const [, navigate] = useLocation();
  const params = new URLSearchParams(useSearch());
  const social = params.get("social") === "1";
  const requestedReturnTo = sanitizeReturnTo(params.get("returnTo"));
  const { isAuthenticated, isLoading, refreshUser, setAuthenticatedUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupStatus, setSetupStatus] = useState<AuthSetupStatus | null>(null);
  const [pending, setPending] = useState<PendingSocialSignup | null>(null);
  const [pendingLoading, setPendingLoading] = useState(social);
  const returnTo = sanitizeReturnTo(pending?.returnTo ?? requestedReturnTo);

  useEffect(() => {
    if (!isLoading && isAuthenticated) navigate(returnTo);
  }, [isAuthenticated, isLoading, navigate, returnTo]);

  useEffect(() => {
    let active = true;
    setTerms(false);
    setPrivacy(false);
    setError(null);
    if (social) {
      setPendingLoading(true);
      void getPendingSocialSignup().then((result) => {
        if (!active) return;
        setPending(result);
        if (!result.pending) setError("가입 연결 시간이 지났습니다. 간편 로그인을 다시 시작해 주세요.");
        else if (result.consentVersion !== SIGNUP_CONSENT_VERSION) setError("가입 안내가 변경되었습니다. 페이지를 새로고침한 뒤 다시 확인해 주세요.");
      }).catch(() => {
        if (active) setError("가입 정보를 확인하지 못했습니다. 간편 로그인을 다시 시작해 주세요.");
      }).finally(() => {
        if (active) setPendingLoading(false);
      });
    } else {
      setPending(null);
      setPendingLoading(false);
      void getAuthSetupStatus().then((result) => {
        if (active) setSetupStatus(result);
      }).catch(() => {
        if (active) setSetupStatus(null);
      });
    }
    return () => { active = false; };
  }, [social]);

  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const signupUnavailable = social
    ? !pending?.pending || pending.consentVersion !== SIGNUP_CONSENT_VERSION
    : setupStatus?.localPasswordAuthEnabled === false;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting || signupUnavailable) return;
    setError(null);
    if (!terms || !privacy) {
      setError("이용약관 동의와 개인정보 처리 안내 확인이 필요합니다.");
      return;
    }
    if (!social) {
      if (!email.trim() || !password) { setError("이메일과 비밀번호를 입력해 주세요."); return; }
      if (password.length < 6) { setError("비밀번호는 6자 이상이어야 합니다."); return; }
      if (password !== confirmPassword) { setError("비밀번호 확인이 일치하지 않습니다."); return; }
    }
    setSubmitting(true);
    try {
      const consent = { terms, privacy, version: SIGNUP_CONSENT_VERSION };
      const user = social
        ? await completeSocialSignup(consent)
        : await registerWithPassword({ email: email.trim(), password, consent });
      if (user) setAuthenticatedUser(user);
      else await refreshUser();
      navigate(returnTo);
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : "가입 처리 중 문제가 발생했습니다. 다시 시도해 주세요.");
    } finally { setSubmitting(false); }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8 font-sans">
      <div className="pointer-events-none fixed inset-0 z-[-1] opacity-40 mix-blend-screen" style={{ backgroundImage: `url(${BASE}/images/mystical-bg.webp)`, backgroundSize: "cover", backgroundPosition: "center" }} />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-3">
          <Moon className="h-6 w-6 text-primary" /><span className="font-serif text-2xl font-bold text-gradient-gold">명해원</span>
        </Link>
        <div className="glass-panel rounded-3xl border border-primary/25 p-6 shadow-2xl sm:p-8">
          <div className="mb-7 text-center">
            <h1 className="mb-2 font-serif text-2xl font-bold text-primary">{social ? "가입 전 마지막 확인" : "회원가입"}</h1>
            <p className="text-sm leading-6 text-muted-foreground">{social ? "처음 이용하시는 경우, 아래 안내 확인 후 가입을 완료합니다." : "풀이를 저장하고, 필요할 때 PDF 리포트로 보관하세요."}</p>
          </div>
          {!social && <SocialLoginButtons returnTo={returnTo} disabled={submitting} onError={setError} />}
          {!social && signupUnavailable && <p role="alert" className="mb-4 text-sm text-rose-700">현재 이메일 가입을 이용할 수 없습니다. 잠시 후 다시 시도해 주세요.</p>}
          {pendingLoading ? <p role="status" className="flex items-center justify-center gap-2 py-8 text-sm"><Loader2 className="h-4 w-4 animate-spin" />가입 정보를 확인하고 있습니다.</p> : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {!social && <>
                <div className="space-y-1.5">
                  <label htmlFor="signup-email" className="text-sm font-medium">이메일</label>
                  <Input id="signup-email" name="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="example@email.com" autoComplete="email" disabled={submitting} className="h-11" />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="signup-password" className="text-sm font-medium">비밀번호</label>
                  <div className="relative">
                    <Input id="signup-password" name="password" type={showPassword ? "text" : "password"} required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="6자 이상 입력해 주세요" autoComplete="new-password" disabled={submitting} className="h-11 pr-12" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"} className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-muted-foreground">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="signup-password-confirm" className="text-sm font-medium">비밀번호 확인</label>
                  <Input id="signup-password-confirm" name="password-confirm" type={showPassword ? "text" : "password"} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="비밀번호를 다시 입력해 주세요" autoComplete="new-password" disabled={submitting} className="h-11" />
                </div>
                {passwordMismatch && <p role="status" className="text-sm text-rose-700">비밀번호 확인이 일치하지 않습니다.</p>}
              </>}
              {(!social || pending?.pending) && <SignupConsent terms={terms} privacy={privacy} onTermsChange={setTerms} onPrivacyChange={setPrivacy} disabled={submitting || signupUnavailable} provider={pending?.provider} />}
              {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
              <Button type="submit" disabled={submitting || pendingLoading || signupUnavailable || !terms || !privacy || (!social && passwordMismatch)} className="h-12 w-full gap-2 text-base">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                {submitting ? "가입 중..." : "동의하고 회원가입"}
              </Button>
            </form>
          )}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-3 text-sm text-muted-foreground">
            <Link href={buildAuthHref("/login", returnTo)} className="inline-flex min-h-11 items-center text-primary hover:underline">{social ? "로그인으로 돌아가기" : "이미 회원이라면 로그인"}</Link>
            <Link href="/saju" className="inline-flex min-h-11 items-center hover:underline">가입 없이 먼저 보기</Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
