import { useState, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { motion } from "framer-motion";
import { Moon, Mail, Lock, LogIn, Loader2, Eye, EyeOff, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@workspace/replit-auth-web";

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");

export default function LoginPage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const returnTo = params.get("returnTo") ?? "/";

  const { isAuthenticated, isLoading, refreshUser } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(returnTo);
    }
  }, [isLoading, isAuthenticated, navigate, returnTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("이메일과 비밀번호를 입력해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${BASE}/api/auth/login-local`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
        credentials: "include",
      });
      const data = await res.json() as Record<string, unknown>;

      if (!res.ok) {
        setError((data.error as string) ?? "로그인에 실패했습니다.");
        return;
      }

      await refreshUser();
      navigate(returnTo);
    } catch {
      setError("서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 font-sans">
      {/* 배경 오버레이 */}
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

        {/* 카드 */}
        <div className="glass-panel border border-primary/25 rounded-3xl p-8 shadow-2xl">
          <div className="mb-7 text-center">
            <h1 className="text-2xl font-serif font-bold text-primary mb-1.5">로그인</h1>
            <p className="text-sm text-muted-foreground">이메일과 비밀번호로 입장하세요</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                  autoFocus
                  disabled={submitting}
                />
              </div>
            </div>

            {/* 비밀번호 */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground/80">비밀번호</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호 입력"
                  className="pl-10 pr-10 h-11 bg-background/40 border-primary/20 focus:border-primary/50"
                  autoComplete="current-password"
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

            {/* 비밀번호 찾기 링크 */}
            <div className="text-right -mt-1">
              <Link href="/forgot-password" className="text-xs text-muted-foreground/70 hover:text-primary transition-colors">
                비밀번호를 잊으셨나요?
              </Link>
            </div>

            {/* 로그인 버튼 */}
            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-11 text-base font-semibold gap-2 bg-primary hover:bg-primary/90 text-primary-foreground mt-2"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              {submitting ? "로그인 중..." : "로그인"}
            </Button>
          </form>

          {/* 회원가입 링크 */}
          <div className="mt-6 text-center text-sm text-muted-foreground">
            아직 계정이 없으신가요?{" "}
            <Link href="/register" className="text-primary hover:underline font-medium">
              회원가입
            </Link>
          </div>

          {/* 홈으로 */}
          <div className="mt-3 text-center">
            <Link href="/" className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors">
              ← 홈으로 돌아가기
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
