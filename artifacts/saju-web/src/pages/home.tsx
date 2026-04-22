import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Sparkles, Sun, Calendar, ArrowRight, MessageCircle, Heart, FileQuestion, CalendarDays, Type, Orbit, MoonStar, TrendingUp, BookOpen, Star, TableProperties, Search } from "lucide-react";
import { useAuth } from "@workspace/replit-auth-web";
import HomeInquiryModal from "@/components/HomeInquiryModal";

type InquiryType = "general" | "saju" | "gungap";

export default function Home() {
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [inquiryType, setInquiryType] = useState<InquiryType>("general");
  const { user, isAuthenticated } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  function openInquiry(type: InquiryType) {
    setInquiryType(type);
    setInquiryOpen(true);
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh]">
      <motion.div 
        className="text-center max-w-3xl mx-auto mb-16"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 backdrop-blur-md mb-8">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">당신의 운명을 비추는 빛</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-serif font-bold mb-6 text-gradient-gold drop-shadow-2xl">
          하늘의 뜻을 읽어<br className="hidden md:block" /> 내일을 준비하다
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground leading-relaxed font-light">
          정통 명리학을 바탕으로 당신의 사주팔자와 오늘의 운세, <br className="hidden md:block" />
          그리고 인생의 흐름을 정확하게 짚어드립니다.
        </p>
      </motion.div>

      {/* 메인 기능 카드 */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl"
        variants={container}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={item}>
          <Link href="/saju" className="block group h-full">
            <div className="h-full rounded-3xl border border-primary/20 bg-card/40 backdrop-blur-xl p-8 transition-all duration-500 hover:bg-card/60 hover:shadow-[0_0_40px_rgba(212,175,55,0.15)] hover:-translate-y-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-colors" />
              <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center mb-6 border border-primary/30 group-hover:scale-110 transition-transform">
                <Sparkles className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-serif text-2xl font-semibold mb-3 text-foreground">사주팔자 (四柱八字)</h3>
              <p className="text-muted-foreground mb-8">태어난 연월일시를 바탕으로 당신의 평생 운의 흐름과 오행의 조화를 분석합니다.</p>
              <div className="flex items-center text-primary font-medium group-hover:gap-3 transition-all gap-2">
                분석하기 <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </Link>
        </motion.div>

        <motion.div variants={item}>
          <Link href="/daily-fortune" className="block group h-full">
            <div className="h-full rounded-3xl border border-primary/20 bg-card/40 backdrop-blur-xl p-8 transition-all duration-500 hover:bg-card/60 hover:shadow-[0_0_40px_rgba(212,175,55,0.15)] hover:-translate-y-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-3xl group-hover:bg-accent/20 transition-colors" />
              <div className="w-14 h-14 rounded-2xl bg-accent/20 flex items-center justify-center mb-6 border border-accent/30 group-hover:scale-110 transition-transform">
                <Sun className="w-7 h-7 text-accent" />
              </div>
              <h3 className="font-serif text-2xl font-semibold mb-3 text-foreground">오늘의 일진 (日辰)</h3>
              <p className="text-muted-foreground mb-8">오늘의 천간지지가 내 사주와 어떻게 맞물리는지 풀어드립니다. 재물·애정·건강·직업 운은 물론, 오늘 특히 조심해야 할 것과 적극적으로 나서면 좋은 분야까지 구체적으로 안내합니다.</p>
              <div className="flex items-center text-accent font-medium group-hover:gap-3 transition-all gap-2">
                확인하기 <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </Link>
        </motion.div>

        <motion.div variants={item}>
          <Link href="/manseryok" className="block group h-full">
            <div className="h-full rounded-3xl border border-primary/20 bg-card/40 backdrop-blur-xl p-8 transition-all duration-500 hover:bg-card/60 hover:shadow-[0_0_40px_rgba(212,175,55,0.15)] hover:-translate-y-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-colors" />
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-6 border border-emerald-500/30 group-hover:scale-110 transition-transform">
                <Calendar className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="font-serif text-2xl font-semibold mb-3 text-foreground">만세력 (萬年曆)</h3>
              <p className="text-muted-foreground mb-8">한 달의 날마다 깃든 오행 기운과 운세 점수를 달력 위에 펼칩니다. 길일·흉일을 한눈에 파악해 이사, 계약, 중요한 만남 등 결정적인 날을 현명하게 고르세요.</p>
              <div className="flex items-center text-emerald-400 font-medium group-hover:gap-3 transition-all gap-2">
                달력보기 <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </Link>
        </motion.div>

        <motion.div variants={item}>
          <Link href="/gungap" className="block group h-full">
            <div className="h-full rounded-3xl border border-primary/20 bg-card/40 backdrop-blur-xl p-8 transition-all duration-500 hover:bg-card/60 hover:shadow-[0_0_40px_rgba(251,113,133,0.15)] hover:-translate-y-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-400/10 rounded-full blur-3xl group-hover:bg-rose-400/20 transition-colors" />
              <div className="w-14 h-14 rounded-2xl bg-rose-400/20 flex items-center justify-center mb-6 border border-rose-400/30 group-hover:scale-110 transition-transform">
                <Heart className="w-7 h-7 text-rose-400" />
              </div>
              <h3 className="font-serif text-2xl font-semibold mb-3 text-foreground">궁합 &amp; 연애운</h3>
              <p className="text-muted-foreground mb-8">솔로라면 언제 인연을 만날지 월별 흐름으로, 연인이 있다면 두 사람의 오행 궁합을 종합 점수와 지지 관계로 풀어드립니다.</p>
              <div className="flex items-center text-rose-400 font-medium group-hover:gap-3 transition-all gap-2">
                분석하기 <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </Link>
        </motion.div>

      </motion.div>

      {isAuthenticated && (
        <motion.div
          className="w-full max-w-5xl mt-16"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6, ease: "easeOut" }}
        >
          <div className="text-center mb-8">
            <p className="text-xs tracking-widest text-primary/60 uppercase mb-2">member only</p>
            <h2 className="font-serif text-3xl font-bold text-foreground mb-2">회원 전용 서비스</h2>
            <p className="text-muted-foreground text-sm">로그인한 회원만 볼 수 있는 분석 화면만 따로 모았습니다</p>
          </div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6"
            variants={container}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={item}>
              <Link href="/daeun" className="block group h-full">
                <div className="h-full rounded-3xl border border-teal-400/20 bg-card/40 backdrop-blur-xl p-8 transition-all duration-500 hover:bg-card/60 hover:shadow-[0_0_40px_rgba(45,212,191,0.15)] hover:-translate-y-2 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-teal-400/10 rounded-full blur-3xl group-hover:bg-teal-400/20 transition-colors" />
                  <div className="w-14 h-14 rounded-2xl bg-teal-400/20 flex items-center justify-center mb-6 border border-teal-400/30 group-hover:scale-110 transition-transform">
                    <TrendingUp className="w-7 h-7 text-teal-400" />
                  </div>
                  <h3 className="font-serif text-2xl font-semibold mb-3 text-foreground">대운 계산기</h3>
                  <p className="text-muted-foreground mb-8">10년 단위로 변화하는 인생의 큰 흐름을 타임라인으로 확인하고, 현재 내가 어떤 대운 안에 있는지 한눈에 파악합니다.</p>
                  <div className="flex items-center text-teal-400 font-medium group-hover:gap-3 transition-all gap-2">
                    확인하기 <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            </motion.div>

            <motion.div variants={item}>
              <Link href="/monthly-fortune" className="block group h-full">
                <div className="h-full rounded-3xl border border-purple-400/20 bg-card/40 backdrop-blur-xl p-8 transition-all duration-500 hover:bg-card/60 hover:shadow-[0_0_40px_rgba(192,132,252,0.15)] hover:-translate-y-2 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-purple-400/10 rounded-full blur-3xl group-hover:bg-purple-400/20 transition-colors" />
                  <div className="w-14 h-14 rounded-2xl bg-purple-400/20 flex items-center justify-center mb-6 border border-purple-400/30 group-hover:scale-110 transition-transform">
                    <CalendarDays className="w-7 h-7 text-purple-400" />
                  </div>
                  <h3 className="font-serif text-2xl font-semibold mb-3 text-foreground">월운 분석</h3>
                  <p className="text-muted-foreground mb-8">세운(歲運)과 월건(月建)이 내 일주와 어떤 십신 관계를 맺는지 분석하여 이달의 재물·직업·애정·건강 흐름을 풀어드립니다.</p>
                  <div className="flex items-center text-purple-400 font-medium group-hover:gap-3 transition-all gap-2">
                    분석하기 <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            </motion.div>

            <motion.div variants={item}>
              <Link href="/lucky-calendar" className="block group h-full">
                <div className="h-full rounded-3xl border border-emerald-400/20 bg-card/40 backdrop-blur-xl p-8 transition-all duration-500 hover:bg-card/60 hover:shadow-[0_0_40px_rgba(52,211,153,0.15)] hover:-translate-y-2 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400/10 rounded-full blur-3xl group-hover:bg-emerald-400/20 transition-colors" />
                  <div className="w-14 h-14 rounded-2xl bg-emerald-400/20 flex items-center justify-center mb-6 border border-emerald-400/30 group-hover:scale-110 transition-transform">
                    <Calendar className="w-7 h-7 text-emerald-400" />
                  </div>
                  <h3 className="font-serif text-2xl font-semibold mb-3 text-foreground">길일 달력</h3>
                  <p className="text-muted-foreground mb-8">이사·개업·결혼·계약 등 목적별로 내 사주에 맞는 최적의 날을 달력 위에서 바로 확인하고 현명하게 선택하세요.</p>
                  <div className="flex items-center text-emerald-400 font-medium group-hover:gap-3 transition-all gap-2">
                    날짜 고르기 <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            </motion.div>

            <motion.div variants={item}>
              <Link href="/year-fortune" className="block group h-full">
                <div className="h-full rounded-3xl border border-primary/20 bg-card/40 backdrop-blur-xl p-8 transition-all duration-500 hover:bg-card/60 hover:shadow-[0_0_40px_rgba(212,175,55,0.15)] hover:-translate-y-2 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-colors" />
                  <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-6 border border-blue-500/30 group-hover:scale-110 transition-transform">
                    <CalendarDays className="w-7 h-7 text-blue-400" />
                  </div>
                  <h3 className="font-serif text-2xl font-semibold mb-3 text-foreground">연간 운세</h3>
                  <p className="text-muted-foreground mb-8">올 한 해의 운세를 분기·월별로 상세 분석합니다.</p>
                  <div className="flex items-center text-blue-400 font-medium group-hover:gap-3 transition-all gap-2">
                    확인하기 <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            </motion.div>

            <motion.div variants={item}>
              <Link href="/zodiac" className="block group h-full">
                <div className="h-full rounded-3xl border border-primary/20 bg-card/40 backdrop-blur-xl p-8 transition-all duration-500 hover:bg-card/60 hover:shadow-[0_0_40px_rgba(212,175,55,0.15)] hover:-translate-y-2 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl group-hover:bg-amber-500/20 transition-colors" />
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/20 flex items-center justify-center mb-6 border border-amber-500/30 group-hover:scale-110 transition-transform">
                    <Orbit className="w-7 h-7 text-amber-400" />
                  </div>
                  <h3 className="font-serif text-2xl font-semibold mb-3 text-foreground">띠별 운세</h3>
                  <p className="text-muted-foreground mb-8">12지신의 오늘 운세를 순위별로 한눈에 확인합니다.</p>
                  <div className="flex items-center text-amber-400 font-medium group-hover:gap-3 transition-all gap-2">
                    확인하기 <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            </motion.div>

            <motion.div variants={item}>
              <Link href="/dream" className="block group h-full">
                <div className="h-full rounded-3xl border border-primary/20 bg-card/40 backdrop-blur-xl p-8 transition-all duration-500 hover:bg-card/60 hover:shadow-[0_0_40px_rgba(212,175,55,0.15)] hover:-translate-y-2 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-colors" />
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 flex items-center justify-center mb-6 border border-indigo-500/30 group-hover:scale-110 transition-transform">
                    <MoonStar className="w-7 h-7 text-indigo-400" />
                  </div>
                  <h3 className="font-serif text-2xl font-semibold mb-3 text-foreground">꿈 해몽</h3>
                  <p className="text-muted-foreground mb-8">꿈에 나타난 키워드로 오늘의 길흉을 풀이합니다.</p>
                  <div className="flex items-center text-indigo-400 font-medium group-hover:gap-3 transition-all gap-2">
                    풀이하기 <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            </motion.div>

            <motion.div variants={item}>
              <Link href="/name-analysis" className="block group h-full">
                <div className="h-full rounded-3xl border border-primary/20 bg-card/40 backdrop-blur-xl p-8 transition-all duration-500 hover:bg-card/60 hover:shadow-[0_0_40px_rgba(212,175,55,0.15)] hover:-translate-y-2 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-3xl group-hover:bg-violet-500/20 transition-colors" />
                  <div className="w-14 h-14 rounded-2xl bg-violet-500/20 flex items-center justify-center mb-6 border border-violet-500/30 group-hover:scale-110 transition-transform">
                    <Type className="w-7 h-7 text-violet-400" />
                  </div>
                  <h3 className="font-serif text-2xl font-semibold mb-3 text-foreground">이름 풀이</h3>
                  <p className="text-muted-foreground mb-8">수리사주와 오행으로 이름의 운세와 성격을 분석합니다.</p>
                  <div className="flex items-center text-violet-400 font-medium group-hover:gap-3 transition-all gap-2">
                    분석하기 <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>
      )}

      {isAdmin && (
        <motion.div
          className="w-full max-w-5xl mt-16"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.6, ease: "easeOut" }}
        >
          <div className="text-center mb-8">
            <p className="text-xs tracking-widest text-primary/60 uppercase mb-2">admin only</p>
            <h2 className="font-serif text-3xl font-bold text-foreground mb-2">관리자 전용 자료실</h2>
            <p className="text-muted-foreground text-sm">일반 회원에게는 숨겨진 내부 참고 화면만 따로 분리했습니다</p>
          </div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
            variants={container}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={item}>
              <Link href="/sinsal-guide" className="block group h-full">
                <div className="h-full rounded-3xl border border-amber-400/20 bg-card/40 backdrop-blur-xl p-8 transition-all duration-500 hover:bg-card/60 hover:shadow-[0_0_40px_rgba(251,191,36,0.15)] hover:-translate-y-2 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-3xl group-hover:bg-amber-400/20 transition-colors" />
                  <div className="w-14 h-14 rounded-2xl bg-amber-400/20 flex items-center justify-center mb-6 border border-amber-400/30 group-hover:scale-110 transition-transform">
                    <Star className="w-7 h-7 text-amber-400" />
                  </div>
                  <h3 className="font-serif text-2xl font-semibold mb-3 text-foreground">신살(神殺) 안내</h3>
                  <p className="text-muted-foreground mb-8">천을귀인·도화살·역마살·화개살·양인살·겁살·삼재 등 7종 신살의 의미, 긍정적 활용법, 주의사항을 상세히 해설합니다.</p>
                  <div className="flex items-center text-amber-400 font-medium group-hover:gap-3 transition-all gap-2">
                    알아보기 <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            </motion.div>

            <motion.div variants={item}>
              <Link href="/glossary" className="block group h-full">
                <div className="h-full rounded-3xl border border-sky-400/20 bg-card/40 backdrop-blur-xl p-8 transition-all duration-500 hover:bg-card/60 hover:shadow-[0_0_40px_rgba(56,189,248,0.15)] hover:-translate-y-2 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-sky-400/10 rounded-full blur-3xl group-hover:bg-sky-400/20 transition-colors" />
                  <div className="w-14 h-14 rounded-2xl bg-sky-400/20 flex items-center justify-center mb-6 border border-sky-400/30 group-hover:scale-110 transition-transform">
                    <BookOpen className="w-7 h-7 text-sky-400" />
                  </div>
                  <h3 className="font-serif text-2xl font-semibold mb-3 text-foreground">사주 용어 사전</h3>
                  <p className="text-muted-foreground mb-8">천간·지지·오행·십신·격국 등 사주 핵심 용어 47가지를 카테고리별로 쉽고 정확하게 정리했습니다.</p>
                  <div className="flex items-center text-sky-400 font-medium group-hover:gap-3 transition-all gap-2">
                    찾아보기 <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            </motion.div>

            <motion.div variants={item}>
              <Link href="/saju-tables" className="block group h-full">
                <div className="h-full rounded-3xl border border-orange-400/20 bg-card/40 backdrop-blur-xl p-8 transition-all duration-500 hover:bg-card/60 hover:shadow-[0_0_40px_rgba(251,146,60,0.15)] hover:-translate-y-2 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-orange-400/10 rounded-full blur-3xl group-hover:bg-orange-400/20 transition-colors" />
                  <div className="w-14 h-14 rounded-2xl bg-orange-400/20 flex items-center justify-center mb-6 border border-orange-400/30 group-hover:scale-110 transition-transform">
                    <TableProperties className="w-7 h-7 text-orange-300" />
                  </div>
                  <h3 className="font-serif text-2xl font-semibold mb-3 text-foreground">이론 조견표</h3>
                  <p className="text-muted-foreground mb-8">합충형·삼재·귀문살·장간처럼 자주 찾는 이론 표를 관리자 화면에서 빠르게 확인합니다.</p>
                  <div className="flex items-center text-orange-300 font-medium group-hover:gap-3 transition-all gap-2">
                    열어보기 <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            </motion.div>

            <motion.div variants={item}>
              <Link href="/day-pillar-analysis" className="block group h-full">
                <div className="h-full rounded-3xl border border-cyan-400/20 bg-card/40 backdrop-blur-xl p-8 transition-all duration-500 hover:bg-card/60 hover:shadow-[0_0_40px_rgba(34,211,238,0.15)] hover:-translate-y-2 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-400/10 rounded-full blur-3xl group-hover:bg-cyan-400/20 transition-colors" />
                  <div className="w-14 h-14 rounded-2xl bg-cyan-400/20 flex items-center justify-center mb-6 border border-cyan-400/30 group-hover:scale-110 transition-transform">
                    <Search className="w-7 h-7 text-cyan-300" />
                  </div>
                  <h3 className="font-serif text-2xl font-semibold mb-3 text-foreground">일주 분석 검색</h3>
                  <p className="text-muted-foreground mb-8">계묘·癸卯처럼 60갑자 일주를 직접 검색해서 다른 사람의 일주 해석도 바로 찾아봅니다.</p>
                  <div className="flex items-center text-cyan-300 font-medium group-hover:gap-3 transition-all gap-2">
                    검색하기 <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>
      )}

      {/* 문의하기 섹션 */}
      <motion.div
        className="w-full max-w-5xl mt-16"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.6, ease: "easeOut" }}
      >
        <div className="text-center mb-8">
          <p className="text-xs tracking-widest text-primary/60 uppercase mb-2">consultation</p>
          <h2 className="font-serif text-3xl font-bold text-foreground mb-2">상담 문의</h2>
          <p className="text-muted-foreground text-sm">궁금하신 사항을 문의해 주시면 정성껏 답변해 드립니다</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 사주 문의 */}
          <button
            onClick={() => openInquiry("saju")}
            className="group text-left rounded-2xl border border-primary/25 bg-card/30 backdrop-blur-xl p-6 transition-all duration-400 hover:bg-card/50 hover:border-primary/50 hover:shadow-[0_0_30px_rgba(212,175,55,0.12)] hover:-translate-y-1 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/8 rounded-full blur-2xl group-hover:bg-primary/15 transition-colors" />
            <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center mb-4 border border-primary/25 group-hover:scale-110 transition-transform">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-semibold text-base mb-1.5 text-foreground">사주 문의</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">생년월일시를 바탕으로 사주·운세·적성 등 궁금한 점을 상담하세요.</p>
            <div className="flex items-center gap-1 mt-4 text-primary text-xs font-medium group-hover:gap-2 transition-all">
              문의하기 <ArrowRight className="w-3 h-3" />
            </div>
          </button>

          {/* 궁합 문의 */}
          <button
            onClick={() => openInquiry("gungap")}
            className="group text-left rounded-2xl border border-rose-400/25 bg-card/30 backdrop-blur-xl p-6 transition-all duration-400 hover:bg-card/50 hover:border-rose-400/50 hover:shadow-[0_0_30px_rgba(251,113,133,0.12)] hover:-translate-y-1 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-400/8 rounded-full blur-2xl group-hover:bg-rose-400/15 transition-colors" />
            <div className="w-11 h-11 rounded-xl bg-rose-400/15 flex items-center justify-center mb-4 border border-rose-400/25 group-hover:scale-110 transition-transform">
              <Heart className="w-5 h-5 text-rose-400" />
            </div>
            <h3 className="font-semibold text-base mb-1.5 text-foreground">궁합 문의</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">연인·배우자·비즈니스 파트너와의 궁합을 전문가에게 직접 물어보세요.</p>
            <div className="flex items-center gap-1 mt-4 text-rose-400 text-xs font-medium group-hover:gap-2 transition-all">
              문의하기 <ArrowRight className="w-3 h-3" />
            </div>
          </button>

          {/* 일반 문의 */}
          <button
            onClick={() => openInquiry("general")}
            className="group text-left rounded-2xl border border-sky-400/25 bg-card/30 backdrop-blur-xl p-6 transition-all duration-400 hover:bg-card/50 hover:border-sky-400/50 hover:shadow-[0_0_30px_rgba(56,189,248,0.12)] hover:-translate-y-1 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-sky-400/8 rounded-full blur-2xl group-hover:bg-sky-400/15 transition-colors" />
            <div className="w-11 h-11 rounded-xl bg-sky-400/15 flex items-center justify-center mb-4 border border-sky-400/25 group-hover:scale-110 transition-transform">
              <FileQuestion className="w-5 h-5 text-sky-400" />
            </div>
            <h3 className="font-semibold text-base mb-1.5 text-foreground">일반 문의</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">서비스 이용이나 기타 궁금한 점을 자유롭게 남겨주세요.</p>
            <div className="flex items-center gap-1 mt-4 text-sky-400 text-xs font-medium group-hover:gap-2 transition-all">
              문의하기 <ArrowRight className="w-3 h-3" />
            </div>
          </button>
        </div>
      </motion.div>

      <HomeInquiryModal
        open={inquiryOpen}
        type={inquiryType}
        onClose={() => setInquiryOpen(false)}
      />
    </div>
  );
}
