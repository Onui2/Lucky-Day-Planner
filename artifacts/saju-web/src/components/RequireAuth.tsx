import { motion } from "framer-motion";
import { Lock, LogIn } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { Button } from "@/components/ui/button";
import { buildAuthHref } from "@/lib/auth-redirect";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    const loginHref = buildAuthHref("/login");
    const registerHref = buildAuthHref("/register");

    return (
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center justify-center min-h-[60vh] px-4"
      >
        <div className="glass-panel border border-primary/25 rounded-3xl p-10 text-center max-w-sm w-full shadow-xl">
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/25 flex items-center justify-center mx-auto mb-5">
            <Lock className="w-7 h-7 text-primary/70" />
          </div>
          <h2 className="text-xl font-serif font-bold mb-2">로그인이 필요합니다</h2>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            이 기능은 회원 전용입니다.
            <br />
            로그인 후 이용할 수 있습니다.
          </p>
          <div className="flex flex-col gap-2">
            <Link href={loginHref}>
              <Button className="w-full gap-2">
                <LogIn className="w-4 h-4" />
                로그인하기
              </Button>
            </Link>
            <Link href={registerHref}>
              <Button variant="outline" className="w-full border-primary/30 hover:bg-primary/10">
                회원가입
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>
    );
  }

  return <>{children}</>;
}
