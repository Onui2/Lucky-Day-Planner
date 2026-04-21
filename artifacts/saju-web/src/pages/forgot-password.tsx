import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Mail,
  Moon,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getSupabaseClient,
  isSupabaseEnabled,
} from "@/lib/supabase-auth";

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !email.includes("@")) {
      setError("올바른 이메일 주소를 입력해 주세요.");
      return;
    }

    setSubmitting(true);

    try {
      if (isSupabaseEnabled()) {
        const client = getSupabaseClient();
        const { error: resetError } = await client!.auth.resetPasswordForEmail(
          email.trim(),
          {
            redirectTo: `${window.location.origin}${BASE}/reset-password`,
          },
        );

        if (resetError) {
          setError(resetError.message);
          return;
        }
      } else {
        const response = await fetch(`${BASE}/api/auth/forgot-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim() }),
        });

        if (!response.ok) {
          const data = (await response.json()) as Record<string, unknown>;
          setError((data.error as string) ?? "요청 처리 중 오류가 발생했습니다.");
          return;
        }
      }

      setDone(true);
    } catch {
      setError("요청 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

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
            명해사주
          </span>
        </Link>

        <div className="glass-panel border border-primary/25 rounded-3xl p-8 shadow-2xl">
          {done ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-4 py-4"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <p className="text-xl font-semibold text-foreground">이메일을 확인해 주세요</p>
              <p className="text-sm text-muted-foreground text-center leading-relaxed">
                <strong className="text-foreground">{email}</strong>
                로 비밀번호 재설정 안내를 보냈습니다.
              </p>
              <Link href="/login">
                <Button variant="outline" className="mt-2 gap-2 border-primary/30 text-primary">
                  <ArrowLeft className="w-4 h-4" />
                  로그인으로 돌아가기
                </Button>
              </Link>
            </motion.div>
          ) : (
            <>
              <div className="mb-7 text-center">
                <h1 className="text-2xl font-serif font-bold text-primary mb-1.5">
                  비밀번호 재설정
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  가입한 이메일을 입력하면 재설정 링크를 보내드립니다.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground/80">이메일</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="가입한 이메일 주소"
                      className="pl-10 h-11 bg-background/40 border-primary/20 focus:border-primary/50"
                      autoFocus
                      autoComplete="email"
                      disabled={submitting}
                    />
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

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-11 text-base font-semibold gap-2 bg-primary hover:bg-primary/90 text-primary-foreground mt-2"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {submitting ? "전송 중..." : "재설정 링크 보내기"}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  href="/login"
                  className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  로그인으로 돌아가기
                </Link>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
