import { useEffect, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  LogIn,
  Mail,
  Moon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@workspace/replit-auth-web";
import {
  type AuthSetupStatus,
  getAuthSetupStatus,
  loginWithPassword,
} from "@/lib/auth-client";

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
  const [setupStatus, setSetupStatus] = useState<AuthSetupStatus | null>(null);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(returnTo);
    }
  }, [isAuthenticated, isLoading, navigate, returnTo]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const setup = await getAuthSetupStatus();
        if (!cancelled) {
          setSetupStatus(setup);
        }
      } catch {
        if (!cancelled) {
          setSetupStatus(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("이메일과 비밀번호를 입력해 주세요.");
      return;
    }

    setSubmitting(true);

    try {
      await loginWithPassword({ email: email.trim(), password });
      await refreshUser();
      navigate(returnTo);
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "로그인 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) return null;

  const localLoginUnavailable = setupStatus?.localPasswordAuthEnabled === false;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 font-sans">
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
        <Link href="/" className="flex items-center justify-center gap-3 mb-8 group">
          <div className="w-11 h-11 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
            <Moon className="w-5 h-5 text-primary" />
          </div>
          <span className="font-serif text-2xl font-bold text-gradient-gold tracking-wider">
            명해원
          </span>
        </Link>

        <div className="glass-panel border border-primary/25 rounded-3xl p-8 shadow-2xl">
          <div className="mb-7 text-center">
            <h1 className="text-2xl font-serif font-bold text-primary mb-1.5">로그인</h1>
            <p className="text-sm text-muted-foreground">
              이메일과 비밀번호로 로그인해 주세요.
            </p>
          </div>

          {localLoginUnavailable && (
            <div className="mb-5 flex items-start gap-2.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
              <p className="leading-relaxed">
                로컬 로그인을 사용하려면 서버 데이터베이스 연결이 필요합니다.
                `DATABASE_URL` 또는 `POSTGRES_URL` 환경변수를 먼저 설정해 주세요.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground/80">이메일</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="example@email.com"
                  className="pl-10 h-11 bg-background/40 border-primary/20 focus:border-primary/50"
                  autoComplete="email"
                  autoFocus
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground/80">비밀번호</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="비밀번호를 입력해 주세요"
                  className="pl-10 pr-10 h-11 bg-background/40 border-primary/20 focus:border-primary/50"
                  autoComplete="current-password"
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

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

            <div className="text-right -mt-1">
              <Link
                href="/forgot-password"
                className="text-xs text-muted-foreground/70 hover:text-primary transition-colors"
              >
                비밀번호를 잊으셨나요?
              </Link>
            </div>

            <Button
              type="submit"
              disabled={submitting || localLoginUnavailable}
              className="w-full h-11 text-base font-semibold gap-2 bg-primary hover:bg-primary/90 text-primary-foreground mt-2"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              {submitting
                ? "로그인 중..."
                : localLoginUnavailable
                  ? "데이터베이스 연결 필요"
                  : "로그인"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            아직 계정이 없으신가요?{" "}
            <Link href="/register" className="text-primary hover:underline font-medium">
              회원가입
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
