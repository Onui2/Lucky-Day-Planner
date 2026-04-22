import { useEffect, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Moon,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  resetPasswordWithToken,
  verifyResetPasswordToken,
} from "@/lib/auth-client";

type PageState = "verifying" | "valid" | "invalid" | "submitting" | "done";

export default function ResetPasswordPage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const token = new URLSearchParams(search).get("token") ?? "";

  const [pageState, setPageState] = useState<PageState>("verifying");
  const [invalidMessage, setInvalidMessage] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setPageState("invalid");
      setInvalidMessage("재설정 토큰이 없습니다.");
      return;
    }

    void verifyResetPasswordToken(token)
      .then((data) => {
        if (data.valid) {
          setPageState("valid");
        } else {
          setPageState("invalid");
          setInvalidMessage(data.error ?? "재설정 링크가 만료되었거나 유효하지 않습니다.");
        }
      })
      .catch(() => {
        setPageState("invalid");
        setInvalidMessage("링크 확인 중 오류가 발생했습니다.");
      });

    return undefined;
  }, [token]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.");
      return;
    }

    if (password !== confirmPassword) {
      setError("비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setPageState("submitting");

    try {
      await resetPasswordWithToken({ token, password });
      setPageState("done");
    } catch (resetError) {
      setPageState("valid");
      setError(
        resetError instanceof Error
          ? resetError.message
          : "비밀번호 변경 중 문제가 발생했습니다.",
      );
    }
  };

  const passwordMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 font-sans">
      <div
        className="fixed inset-0 z-[-1] opacity-40 mix-blend-screen pointer-events-none"
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL.replace(/\/+$/, "")}/images/mystical-bg.png)`,
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
          {pageState === "verifying" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">링크를 확인하고 있습니다...</p>
            </div>
          )}

          {pageState === "invalid" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-4 py-4"
            >
              <div className="w-16 h-16 rounded-full bg-rose-500/15 border border-rose-500/40 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-rose-400" />
              </div>
              <p className="text-xl font-semibold text-foreground">
                재설정 링크를 사용할 수 없습니다
              </p>
              <p className="text-sm text-muted-foreground text-center">{invalidMessage}</p>
              <Link href="/forgot-password">
                <Button className="mt-2 bg-primary hover:bg-primary/90 text-primary-foreground">
                  재설정 메일 다시 받기
                </Button>
              </Link>
            </motion.div>
          )}

          {(pageState === "valid" || pageState === "submitting") && (
            <>
              <div className="mb-7 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-primary" />
                </div>
                <h1 className="text-2xl font-serif font-bold text-primary mb-1.5">
                  새 비밀번호 설정
                </h1>
                <p className="text-sm text-muted-foreground">
                  새로 사용할 비밀번호를 입력해 주세요.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground/80">새 비밀번호</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="6자 이상 입력해 주세요"
                      className="pl-10 pr-10 h-11 bg-background/40 border-primary/20 focus:border-primary/50"
                      autoFocus
                      autoComplete="new-password"
                      disabled={pageState === "submitting"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground/80">
                    비밀번호 확인
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="비밀번호를 다시 입력해 주세요"
                      className="pl-10 pr-10 h-11 bg-background/40 border-primary/20 focus:border-primary/50"
                      autoComplete="new-password"
                      disabled={pageState === "submitting"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((value) => !value)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {passwordMismatch && (
                  <div className="flex items-center gap-2.5 p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    비밀번호 확인이 일치하지 않습니다.
                  </div>
                )}

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

                <Button
                  type="submit"
                  disabled={pageState === "submitting" || passwordMismatch}
                  className="w-full h-11 text-base font-semibold gap-2 bg-primary hover:bg-primary/90 text-primary-foreground mt-2"
                >
                  {pageState === "submitting" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )}
                  {pageState === "submitting" ? "변경 중..." : "비밀번호 변경"}
                </Button>
              </form>
            </>
          )}

          {pageState === "done" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-4 py-4"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <p className="text-xl font-semibold text-foreground">비밀번호가 변경되었습니다</p>
              <p className="text-sm text-muted-foreground text-center">
                새 비밀번호로 다시 로그인해 주세요.
              </p>
              <Button
                onClick={() => navigate("/login")}
                className="mt-2 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                로그인하러 가기
              </Button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
