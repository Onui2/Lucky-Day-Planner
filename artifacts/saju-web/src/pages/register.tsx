import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Moon, Mail, Lock, User, UserPlus, Loader2, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@workspace/replit-auth-web";

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");

export default function RegisterPage() {
  const [, navigate] = useLocation();
  const { isAuthenticated, isLoading, refreshUser } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate("/");
    }
  }, [isLoading, isAuthenticated, navigate]);

  const passwordMatch = confirmPassword && password === confirmPassword;
  const passwordMismatch = confirmPassword && password !== confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("이메일과 비밀번호를 입력해주세요.");
      return;
    }
    if (!email.includes("@")) {
      setError("유효한 이메일 주소를 입력해주세요.");
      return;
    }
    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, name: name.trim() }),
        credentials: "include",
      });
      const data = await res.json() as Record<string, unknown>;

      if (!res.ok) {
        setError((data.error as string) ?? "회원가입에 실패했습니다.");
        return;
      }

      setSuccess(true);
      await refreshUser();
      setTimeout(() => navigate("/"), 1500);
    } catch {
      setError("서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 font-sans py-8">
      <div
        className="fixed inset-0 z-[-1] opacity-40 mix-blend-screen pointer-events-none"
        style={{
          backgroundImage: `url(${BASE}/images/mystical-bg.png)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        {/* 로고 */}
        <Link href="/" className="flex items-center justify-center gap-3 mb-8 group">
          <div className="w-11 h-11 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
            <Moon className="w-5 h-5 text-primary" />
          </div>
          <span className="font-serif text-2xl font-bold text-gradient-gold tracking-wider">
            명해원 (命海苑)
          </span>
        </Link>

        <div className="glass-panel border border-primary/25 rounded-3xl p-8 shadow-2xl">
          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-4 py-8"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <p className="text-xl font-semibold text-foreground">가입 완료!</p>
              <p className="text-sm text-muted-foreground text-center">명해원에 오신 것을 환영합니다.<br />잠시 후 이동합니다...</p>
            </motion.div>
          ) : (
            <>
              <div className="mb-7 text-center">
                <h1 className="text-2xl font-serif font-bold text-primary mb-1.5">회원가입</h1>
                <p className="text-sm text-muted-foreground">계정을 만들어 사주 분석을 시작하세요</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 이름 (선택) */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground/80">
                    이름 <span className="text-muted-foreground/60 font-normal text-xs">(선택)</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="홍길동"
                      className="pl-10 h-11 bg-background/40 border-primary/20 focus:border-primary/50"
                      autoComplete="name"
                      autoFocus
                      disabled={submitting}
                      maxLength={30}
                    />
                  </div>
                </div>

                {/* 이메일 */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground/80">이메일</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@email.com"
                      className="pl-10 h-11 bg-background/40 border-primary/20 focus:border-primary/50"
                      autoComplete="email"
                      disabled={submitting}
                    />
                  </div>
                </div>

                {/* 비밀번호 */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground/80">
                    비밀번호 <span className="text-muted-foreground/60 font-normal text-xs">(6자 이상)</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="비밀번호 입력"
                      className="pl-10 pr-10 h-11 bg-background/40 border-primary/20 focus:border-primary/50"
                      autoComplete="new-password"
                      disabled={submitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* 비밀번호 확인 */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground/80">비밀번호 확인</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="비밀번호 재입력"
                      className={`pl-10 pr-10 h-11 bg-background/40 transition-colors ${
                        passwordMismatch
                          ? "border-rose-500/50 focus:border-rose-500"
                          : passwordMatch
                          ? "border-emerald-500/50 focus:border-emerald-500"
                          : "border-primary/20 focus:border-primary/50"
                      }`}
                      autoComplete="new-password"
                      disabled={submitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordMatch && (
                    <p className="flex items-center gap-1 text-xs text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 비밀번호가 일치합니다
                    </p>
                  )}
                  {passwordMismatch && (
                    <p className="flex items-center gap-1 text-xs text-rose-400">
                      <AlertCircle className="w-3.5 h-3.5" /> 비밀번호가 일치하지 않습니다
                    </p>
                  )}
                </div>

                {/* 오류 메시지 */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2.5 p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-sm"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </motion.div>
                )}

                {/* 가입 버튼 */}
                <Button
                  type="submit"
                  disabled={submitting || !!passwordMismatch}
                  className="w-full h-11 text-base font-semibold gap-2 bg-primary hover:bg-primary/90 text-primary-foreground mt-2"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  {submitting ? "가입 처리 중..." : "회원가입"}
                </Button>
              </form>

              {/* 로그인 링크 */}
              <div className="mt-6 text-center text-sm text-muted-foreground">
                이미 계정이 있으신가요?{" "}
                <Link href="/login" className="text-primary hover:underline font-medium">
                  로그인
                </Link>
              </div>

              <div className="mt-3 text-center">
                <Link href="/" className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors">
                  ← 홈으로 돌아가기
                </Link>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
