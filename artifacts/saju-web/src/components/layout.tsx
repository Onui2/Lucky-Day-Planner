import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Moon, Sun, Sparkles, Calendar, Heart,
  UserCircle2, LogIn, LogOut, Menu, X, ChevronUp,
  BookMarked, MessageSquare, ShieldCheck, Bell,
  CalendarDays, Type, Orbit, ChevronDown, Settings,
  MoonStar, TrendingUp, BookOpen, Star, TableProperties,
} from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { useAuth } from "@workspace/replit-auth-web";
import ProfileModal from "@/components/ProfileModal";
import { useMyUnreadCount, useAdminUnreadCount } from "@workspace/api-client-react";

interface LayoutProps {
  children: React.ReactNode;
}

const ELEM_COLOR: Record<string, string> = {
  목: "text-green-400", 화: "text-red-400",
  토: "text-yellow-400", 금: "text-gray-300", 수: "text-blue-400",
};

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center leading-none shadow-md">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { profile } = useUser();
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const { data: myUnread } = useMyUnreadCount(isAuthenticated);
  const { data: adminUnread } = useAdminUnreadCount(isAdmin);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const scrollY = window.scrollY;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyOverflow = document.body.style.overflow;
    const originalBodyPosition = document.body.style.position;
    const originalBodyTop = document.body.style.top;
    const originalBodyLeft = document.body.style.left;
    const originalBodyRight = document.body.style.right;
    const originalBodyWidth = document.body.style.width;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";

    return () => {
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.overflow = originalBodyOverflow;
      document.body.style.position = originalBodyPosition;
      document.body.style.top = originalBodyTop;
      document.body.style.left = originalBodyLeft;
      document.body.style.right = originalBodyRight;
      document.body.style.width = originalBodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, [mobileMenuOpen]);

  const navItems = [
    { href: "/saju", label: "사주팔자", icon: Sparkles },
    { href: "/daily-fortune", label: "오늘의 일진", icon: Sun },
    { href: "/manseryok", label: "만세력", icon: Calendar },
    ...(isAuthenticated ? [
      { href: "/gungap", label: "궁합", icon: Heart },
      { href: "/saved", label: "저장함", icon: BookMarked },
      {
        href: "/inquiries",
        label: "문의 관리",
        icon: MessageSquare,
        badge: myUnread?.count ?? 0,
      },
    ] : []),
  ];

  // 추가 서비스 (더보기 드롭다운)
  const extraServices = [
    // 로그인 사용자 전용
    ...(isAuthenticated ? [
      { href: "/daeun", label: "대운 계산기", icon: TrendingUp, desc: "10년 단위 대운 타임라인" },
      { href: "/monthly-fortune", label: "월운 분석", icon: CalendarDays, desc: "세운·월건 십신 분석" },
      { href: "/lucky-calendar", label: "길일 달력", icon: Calendar, desc: "목적별 최적 날짜 선택" },
    ] : []),
    // 공개 교육 콘텐츠
    { href: "/sinsal-guide", label: "신살 안내", icon: Star, desc: "도화·역마·천을귀인 등 해설" },
    { href: "/glossary", label: "사주 용어 사전", icon: BookOpen, desc: "천간·지지·십신 용어 정리" },
    { href: "/saju-tables", label: "이론 조견표", icon: TableProperties, desc: "합충형·삼재·귀문살·장간 등" },
    // 관리자 전용
    ...[
      { href: "/year-fortune", label: "연간 운세", icon: CalendarDays, desc: "올 한 해의 운세 흐름" },
      { href: "/name-analysis", label: "이름 풀이", icon: Type, desc: "수리사주 성명 분석" },
      { href: "/zodiac", label: "띠별 운세", icon: Orbit, desc: "12지신 오늘의 운세" },
      { href: "/dream", label: "꿈 해몽", icon: MoonStar, desc: "꿈 키워드로 길흉 풀이" },
    ],
  ];

  const adminNavItem = {
    href: "/admin",
    label: "관리자",
    icon: ShieldCheck,
    badge: adminUnread?.count ?? 0,
  };

  const closeMobile = () => setMobileMenuOpen(false);

  const renderNavLink = (item: {
    href: string; label: string; icon: React.ElementType;
    badge?: number;
  }, onClick?: () => void) => {
    const isActive = location === item.href;
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary relative py-2",
          isActive ? "text-primary" : "text-muted-foreground"
        )}
        onClick={onClick}
      >
        <span className="relative">
          <Icon className="w-4 h-4" />
          {!!item.badge && <UnreadBadge count={item.badge} />}
        </span>
        {item.label}
        {isActive && (
          <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full shadow-[0_-2px_10px_rgba(212,175,55,0.5)]" />
        )}
      </Link>
    );
  };

  const renderMobileNavLink = (item: {
    href: string; label: string; icon: React.ElementType; badge?: number;
  }, onClick?: () => void) => {
    const isActive = location === item.href;
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClick ?? closeMobile}
        className={cn(
          "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors",
          isActive ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-primary/8 hover:text-primary"
        )}
      >
        <span className="relative">
          <Icon className="w-4 h-4" />
          {!!item.badge && <UnreadBadge count={item.badge} />}
        </span>
        {item.label}
        {!!item.badge && (
          <span className="ml-auto text-xs bg-rose-500 text-white rounded-full px-1.5 py-0.5 min-w-[20px] text-center font-bold">
            {item.badge > 99 ? "99+" : item.badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-primary/30 selection:text-primary">
      <div
        className="fixed inset-0 z-[-1] opacity-40 mix-blend-screen pointer-events-none"
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}images/mystical-bg.png)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      <header className="sticky top-0 z-50 w-full border-b border-primary/10 bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/40">
        <div className="container mx-auto px-4 h-16 md:h-20 flex items-center justify-between">
          {/* 로고 */}
          <Link href="/" className="flex items-center gap-3 group" onClick={closeMobile}>
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/30 group-hover:scale-110 transition-transform duration-300">
              <Moon className="w-4 h-4 md:w-5 md:h-5 text-primary" />
            </div>
            <span className="font-serif text-xl md:text-2xl font-bold text-gradient-gold tracking-wider">
              명해원 (命海苑)
            </span>
          </Link>

          {/* 데스크탑 내비 */}
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => renderNavLink(item))}

            {/* 더보기 드롭다운 — 관리자 전용 */}
            {extraServices.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setServicesOpen(o => !o)}
                onBlur={() => setTimeout(() => setServicesOpen(false), 150)}
                className={cn(
                  "flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-primary py-2",
                  extraServices.some(s => location === s.href) ? "text-primary" : "text-muted-foreground"
                )}
              >
                더보기 <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", servicesOpen && "rotate-180")} />
              </button>
              <AnimatePresence>
                {servicesOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full mt-2 right-0 w-52 glass-panel border border-primary/20 rounded-2xl p-2 shadow-xl z-50"
                  >
                    {extraServices.map(s => {
                      const Icon = s.icon;
                      const isActive = location === s.href;
                      return (
                        <Link
                          key={s.href}
                          href={s.href}
                          onClick={() => setServicesOpen(false)}
                          className={cn(
                            "flex items-start gap-3 px-3 py-2.5 rounded-xl transition-colors",
                            isActive ? "bg-primary/15 text-primary" : "hover:bg-primary/8 text-muted-foreground hover:text-primary"
                          )}
                        >
                          <Icon className="w-4 h-4 shrink-0 mt-0.5" />
                          <div>
                            <div className="text-sm font-medium">{s.label}</div>
                            <div className="text-[11px] opacity-70">{s.desc}</div>
                          </div>
                        </Link>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            )}

            {isAuthenticated && isAdmin && renderNavLink(adminNavItem)}

            <div className="w-px h-5 bg-primary/20" />

            {/* 알림 벨 — 관리자만 표시 */}
            {!isLoading && isAuthenticated && isAdmin && (
              <Link href="/admin" className="relative text-muted-foreground hover:text-primary transition-colors">
                <Bell className="w-5 h-5" />
                <UnreadBadge count={adminUnread?.count ?? 0} />
              </Link>
            )}

            {/* 로그인 / 사용자 영역 (데스크탑) */}
            {!isLoading && (isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(o => !o)}
                  onBlur={() => setTimeout(() => setUserMenuOpen(false), 150)}
                  className={cn(
                    "flex items-center gap-2 text-sm font-medium transition-all py-1.5 px-3 rounded-full border",
                    profile
                      ? "border-primary/50 bg-primary/10 text-primary hover:bg-primary/20"
                      : "border-primary/20 text-muted-foreground hover:text-primary hover:border-primary/40"
                  )}
                >
                  <UserCircle2 className="w-4 h-4" />
                  {profile ? (
                    <span>
                      {profile.name ?? (user?.firstName ?? "내 사주")}
                      {profile.dayMasterElement && (
                        <span className={cn("ml-1 font-serif font-bold", ELEM_COLOR[profile.dayMasterElement])}>
                          {profile.dayMasterStem}{profile.dayMasterBranch ?? ""}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span>{user?.firstName ?? "내 정보"}</span>
                  )}
                  <ChevronDown className={cn("w-3 h-3 transition-transform", userMenuOpen && "rotate-180")} />
                </button>
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full mt-2 right-0 w-52 glass-panel border border-primary/20 rounded-2xl p-2 shadow-xl z-50"
                    >
                      <Link
                        href="/account"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-primary/8 hover:text-primary transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        회원정보 관리
                      </Link>
                      <button
                        onClick={() => { setUserMenuOpen(false); setProfileOpen(true); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-primary/8 hover:text-primary transition-colors"
                      >
                        <UserCircle2 className="w-4 h-4" />
                        {profile ? "내 사주 수정" : "내 사주 등록"}
                      </button>
                      <div className="h-px bg-primary/10 my-1" />
                      <button
                        onClick={() => { setUserMenuOpen(false); logout(); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        로그아웃
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button
                onClick={login}
                className="flex items-center gap-2 text-sm font-medium transition-all py-2 px-4 rounded-full border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 hover:border-primary/60"
              >
                <LogIn className="w-4 h-4" />
                로그인
              </button>
            ))}
          </nav>

          {/* 모바일: 오른쪽 영역 */}
          <div className="flex md:hidden items-center gap-2">
            {!isLoading && !isAuthenticated && (
              <button
                onClick={login}
                className="flex items-center gap-1.5 text-xs font-medium py-1.5 px-3 rounded-full border border-primary/40 bg-primary/10 text-primary"
              >
                <LogIn className="w-3.5 h-3.5" />
                로그인
              </button>
            )}
            {!isLoading && isAuthenticated && isAdmin && (
              <Link href="/admin" className="relative text-muted-foreground hover:text-primary transition-colors p-1">
                <Bell className="w-5 h-5" />
                <UnreadBadge count={adminUnread?.count ?? 0} />
              </Link>
            )}
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="w-9 h-9 flex items-center justify-center rounded-full border border-primary/20 bg-primary/5 text-primary hover:bg-primary/15 transition-colors"
              aria-label="메뉴"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

      </header>

      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <motion.button
              type="button"
              aria-label="메뉴 닫기"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-x-0 top-16 bottom-0 bg-background/75 backdrop-blur-sm"
              onClick={closeMobile}
            />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-x-0 top-16 bottom-0 border-t border-primary/10 bg-background/95 backdrop-blur-xl overflow-y-auto overscroll-contain"
            >
              <div className="container mx-auto min-h-full px-4 py-3 pb-8 flex flex-col gap-1">
                {navItems.map((item) => renderMobileNavLink(item, closeMobile))}

                {extraServices.length > 0 && extraServices.map(s => renderMobileNavLink(s, closeMobile))}

                <div className="h-px bg-primary/10 my-1" />

                {isAuthenticated && isAdmin && renderMobileNavLink(adminNavItem, closeMobile)}

                <div className="h-px bg-primary/10 my-1" />

                {!isLoading && (isAuthenticated ? (
                  <>
                    <Link
                      href="/account"
                      onClick={closeMobile}
                      className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-primary/8 hover:text-primary transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      회원정보 관리
                    </Link>
                    <button
                      onClick={() => { setProfileOpen(true); closeMobile(); }}
                      className={cn(
                        "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors w-full text-left",
                        profile
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-primary/8 hover:text-primary"
                      )}
                    >
                      <UserCircle2 className="w-4 h-4" />
                      {profile ? (
                        <span>
                          {profile.name ?? (user?.firstName ?? "내 사주")}
                          {profile.dayMasterElement && (
                            <span className={cn("ml-1 font-serif font-bold", ELEM_COLOR[profile.dayMasterElement])}>
                              {profile.dayMasterStem}{profile.dayMasterBranch ?? ""}
                            </span>
                          )}
                          <span className="ml-2 text-xs text-muted-foreground font-normal">사주 수정</span>
                        </span>
                      ) : (
                        <span>내 사주 등록하기</span>
                      )}
                    </button>
                    <button
                      onClick={() => { logout(); closeMobile(); }}
                      className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-colors w-full text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      로그아웃
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => { login(); closeMobile(); }}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium bg-primary/10 text-primary border border-primary/30 w-full"
                  >
                    <LogIn className="w-4 h-4" />
                    로그인
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="flex-1 container mx-auto px-4 py-8 md:py-12">
        {children}
      </main>

      <footer className="border-t border-primary/10 py-5 text-center text-muted-foreground/60 text-sm mt-auto glass-panel rounded-t-3xl">
        <p className="font-serif tracking-widest">© {new Date().getFullYear()} 명해원(命海苑). 운명의 바다, 지혜가 모이는 곳.</p>
      </footer>

      {isAuthenticated && (
        <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
      )}

      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-6 right-6 z-50 w-11 h-11 rounded-full bg-primary/90 hover:bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center transition-colors"
            aria-label="맨 위로"
          >
            <ChevronUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
