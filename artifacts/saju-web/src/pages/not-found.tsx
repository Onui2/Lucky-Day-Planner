import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center max-w-md"
      >
        <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-6">
          <Sparkles className="w-9 h-9 text-primary" />
        </div>
        <h1 className="font-serif text-5xl font-bold text-primary mb-2">404</h1>
        <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
          페이지를 찾을 수 없습니다
        </h2>
        <p className="text-muted-foreground text-sm mb-8 leading-7">
          요청하신 페이지가 존재하지 않거나 이동되었습니다.<br />
          링크를 다시 확인하거나 홈으로 돌아가주세요.
        </p>
        <Link href="/">
          <Button className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            홈으로 돌아가기
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}
