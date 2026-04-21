import { motion } from "framer-motion";
import { ShieldAlert, LogIn } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { Button } from "@/components/ui/button";

export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading, login } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center justify-center min-h-[60vh] px-4"
      >
        <div className="glass-panel border border-primary/25 rounded-3xl p-10 text-center max-w-sm w-full shadow-xl">
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/25 flex items-center justify-center mx-auto mb-5">
            <ShieldAlert className="w-7 h-7 text-primary/70" />
          </div>
          <h2 className="text-xl font-serif font-bold mb-2">로그인이 필요합니다</h2>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            이 기능은 회원 전용입니다.
            <br />
            로그인 후 이용할 수 있습니다.
          </p>
          <div className="flex flex-col gap-2">
            <Button className="w-full gap-2" onClick={login}>
              <LogIn className="w-4 h-4" />
              로그인하기
            </Button>
            <Link href="/register">
              <Button variant="outline" className="w-full border-primary/30 hover:bg-primary/10">
                회원가입
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!isAdmin) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center justify-center min-h-[60vh] px-4"
      >
        <div className="glass-panel border border-primary/25 rounded-3xl p-10 text-center max-w-sm w-full shadow-xl">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-5">
            <ShieldAlert className="w-7 h-7 text-amber-400" />
          </div>
          <h2 className="text-xl font-serif font-bold mb-2">관리자 전용 기능입니다</h2>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            이 기능은 관리자만 사용할 수 있습니다.
            <br />
            사주풀이와 오늘의 운세 메뉴를 이용해 주세요.
          </p>
          <div className="flex flex-col gap-2">
            <Link href="/saju">
              <Button className="w-full">사주 보러가기</Button>
            </Link>
            <Link href="/daily-fortune">
              <Button variant="outline" className="w-full border-primary/30 hover:bg-primary/10">
                오늘의 운세 보기
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>
    );
  }

  return <>{children}</>;
}
