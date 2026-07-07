import { useState, useEffect } from "react";
import { flushSync } from "react-dom";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { buildAuthHref } from "@/lib/auth-redirect";
import {
  Moon,
  Sun,
  Sparkles,
  Calendar,
  Heart,
  UserCircle2,
  LogIn,
  LogOut,
  Menu,
  X,
  ChevronUp,
  BookMarked,
  MessageSquare,
  ShieldCheck,
  Bell,
  CalendarDays,
  Type,
  Orbit,
  ChevronDown,
  Settings,
  MoonStar,
  TrendingUp,
  BookOpen,
  Star,
  TableProperties,
  Search,
} from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { useAuth } from "@workspace/replit-auth-web";
import ProfileModal from "@/components/ProfileModal";
import {
  useMyUnreadCount,
  useAdminUnreadCount,
  useGetAnnouncements,
} from "@workspace/api-client-react";

interface LayoutProps {
  children: React.ReactNode;
}

const ELEM_COLOR: Record<string, string> = {
  목: "text-green-600",
  화: "text-red-600",
  토: "text-yellow-600",
  금: "text-gray-700",
  수: "text-blue-600",
};

const footerLinks = [
  { href: "/terms", label: "이용약관" },
  { href: "/privacy", label: "개인정보처리방침" },
  { href: "/refund-policy", label: "환불 및 취소 정책" },
  { href: "/inquiries", label: "문의하기" },
];

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center leading-none shadow-md">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function Layout({ children }: LayoutProps) {
  const [location, navigate] = useLocation();
  const { profile } = useUser();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileServiceGroupOpen, setMobileServiceGroupOpen] = useState<
    string | null
  >(null);

  const { data: myUnread } = useMyUnreadCount(isAuthenticated);
  const { data: announcements = [] } = useGetAnnouncements();
  const [dismissedIds, setDismissedIds] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem("dismissed_announcements") ?? "[]"); } catch { return []; }
  });
  const visibleAnnouncements = announcements.filter((a) => !dismissedIds.includes(a.id));

  function dismissAnnouncement(id: number) {
    const next = [...dismissedIds, id];
    setDismissedIds(next);
    try { localStorage.setItem("dismissed_announcements", JSON.stringify(next)); } catch {}
  }
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
    ...(isAuthenticated
      ? [
          { href: "/gungap", label: "궁합", icon: Heart },
          { href: "/saved", label: "저장함", icon: BookMarked },
          {
            href: "/inquiries",
            label: "문의 관리",
            icon: MessageSquare,
            badge: myUnread?.count ?? 0,
          },
        ]
      : []),
  ];

  const memberExtraServices = isAuthenticated
    ? [
        {
          href: "/daeun",
          label: "대운 계산기",
          icon: TrendingUp,
          desc: "10년 단위 대운 타임라인",
        },
        {
          href: "/monthly-fortune",
          label: "월운 분석",
          icon: CalendarDays,
          desc: "세운·월건 십신 분석",
        },
        {
          href: "/lucky-calendar",
          label: "길일 달력",
          icon: Calendar,
          desc: "목적별 최적 날짜 선택",
        },
        {
          href: "/year-fortune",
          label: "연간 운세",
          icon: CalendarDays,
          desc: "올 한 해의 운세 흐름",
        },
        {
          href: "/name-analysis",
          label: "이름 풀이",
          icon: Type,
          desc: "수리사주 성명 분석",
        },
        {
          href: "/zodiac",
          label: "띠별 운세",
          icon: Orbit,
          desc: "12지신 오늘의 운세",
        },
        {
          href: "/dream",
          label: "꿈 해몽",
          icon: MoonStar,
          desc: "꿈 키워드로 길흉 풀이",
        },
        {
          href: "/love-fortune",
          label: "연애운",
          icon: Heart,
          desc: "솔로·연애중 맞춤 연애 분석",
        },
      ]
    : [];

  const publicExtraServices = [
    {
      href: "/sinsal-guide",
      label: "신살 안내",
      icon: Star,
      desc: "도화·역마·천을귀인 등 23종 해설",
    },
    {
      href: "/glossary",
      label: "사주 용어 사전",
      icon: BookOpen,
      desc: "천간·지지·십신 등 용어 61가지",
    },
  ];

  const adminExtraServices = isAdmin
    ? [
        {
          href: "/saju-tables",
          label: "이론 조견표",
          icon: TableProperties,
          desc: "합충형·삼재·귀문살·장간 등",
        },
        {
          href: "/day-pillar-analysis",
          label: "일주 분석 검색",
          icon: Search,
          desc: "60갑자 일주 해석 검색",
        },
      ]
    : [];

  const extraServiceGroups = [
    ...(memberExtraServices.length > 0
      ? [{ key: "member", label: "회원 전용", items: memberExtraServices }]
      : []),
    { key: "reference", label: "사주 자료실", items: publicExtraServices },
    ...(adminExtraServices.length > 0
      ? [{ key: "admin", label: "관리자 전용", items: adminExtraServices }]
      : []),
  ];
  const extraServices = extraServiceGroups.flatMap((group) => group.items);
  const activeExtraServiceGroupKey =
    extraServiceGroups.find((group) =>
      group.items.some((item) => item.href === location),
    )?.key ??
    extraServiceGroups[0]?.key ??
    null;

  useEffect(() => {
    if (!mobileMenuOpen) {
      setMobileServiceGroupOpen(null);
      return;
    }

    setMobileServiceGroupOpen(activeExtraServiceGroupKey);
  }, [activeExtraServiceGroupKey, mobileMenuOpen]);

  const adminNavItem = {
    href: "/admin",
    label: "관리자",
    icon: ShieldCheck,
    badge: adminUnread?.count ?? 0,
  };

  const closeMobile = () => {
    setMobileMenuOpen(false);
    setMobileServiceGroupOpen(null);
    setServicesOpen(false);
    setUserMenuOpen(false);
  };

  useEffect(() => {
    setMobileMenuOpen(false);
    setMobileServiceGroupOpen(null);
    setServicesOpen(false);
    setUserMenuOpen(false);
  }, [location]);

  const handleMenuNavigation =
    (href: string, beforeNavigate: () => void) =>
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.shiftKey ||
        event.button !== 0
      ) {
        return;
      }

      event.preventDefault();
      flushSync(() => {
        beforeNavigate();
      });
      navigate(href);
    };

  const renderNavLink = (
    item: {
      href: string;
      label: string;
      icon: React.ElementType;
      badge?: number;
    },
    onClick?: () => void,
  ) => {
    const isActive = location === item.href;
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary relative py-2",
          isActive ? "text-primary" : "text-muted-foreground",
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

  const renderMobileNavLink = (
    item: {
      href: string;
      label: string;
      icon: React.ElementType;
      badge?: number;
    },
    onClick?: () => void,
  ) => {
    const isActive = location === item.href;
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={handleMenuNavigation(item.href, onClick ?? closeMobile)}
        className={cn(
          "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors",
          isActive
            ? "bg-primary/15 text-primary"
            : "text-muted-foreground hover:bg-primary/8 hover:text-primary",
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
        className="fixed inset-0 z-[-1] opacity-40 mix-blend-screen pointer-events-none bg-layout-pattern"
        style={{
          backgroundSize: "cover",
          backgroundPosition: "center",
          // 배경 이미지를 paint 이후 로드 (렌더 블로킹 방지)
          contentVisibility: "auto",
        }}
      />
      <header className="sticky top-0 z-50 w-full border-b border-primary/10 bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/40">
        <div className="container mx-auto px-4 h-16 md:h-20 flex items-center justify-between">
          {/* 로고 */}
          <Link
            href="/"
            className="flex items-center gap-3 group"
            onClick={closeMobile}
          >
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

            {/* 더보기 드롭다운 */}
            {extraServices.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setServicesOpen((o) => !o)}
                  onBlur={() => setTimeout(() => setServicesOpen(false), 150)}
                  className={cn(
                    "flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-primary py-2",
                    extraServices.some((s) => location === s.href)
                      ? "text-primary"
                      : "text-muted-foreground",
                  )}
                >
                  더보기{" "}
                  <ChevronDown
                    className={cn(
                      "w-3.5 h-3.5 transition-transform",
                      servicesOpen && "rotate-180",
                    )}
                  />
                </button>
                {servicesOpen && (
                  <div className="absolute top-full mt-2 right-0 w-56 max-h-[min(32rem,calc(100vh-7rem))] overflow-y-auto overscroll-contain glass-panel border border-primary/20 rounded-2xl p-2 shadow-xl z-50 animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 duration-150">
                      {extraServiceGroups.map((group) => (
                        <div key={group.key} className="px-1">
                          <div className="px-2 pt-1 pb-1.5 text-[10px] font-semibold tracking-[0.18em] text-primary/60 uppercase">
                            {group.label}
                          </div>
                          {group.items.map((s) => {
                            const Icon = s.icon;
                            const isActive = location === s.href;
                            return (
                              <Link
                                key={s.href}
                                href={s.href}
                                onClick={handleMenuNavigation(s.href, () =>
                                  setServicesOpen(false),
                                )}
                                className={cn(
                                  "flex items-start gap-3 px-3 py-2.5 rounded-xl transition-colors",
                                  isActive
                                    ? "bg-primary/15 text-primary"
                                    : "hover:bg-primary/8 text-muted-foreground hover:text-primary",
                                )}
                              >
                                <Icon className="w-4 h-4 shrink-0 mt-0.5" />
                                <div>
                                  <div className="text-sm font-medium">
                                    {s.label}
                                  </div>
                                  <div className="text-[11px] opacity-70">
                                    {s.desc}
                                  </div>
                                </div>
                              </Link>
                            );
                          })}
                          {group.key !==
                            extraServiceGroups[extraServiceGroups.length - 1]
                              ?.key && (
                            <div className="h-px bg-primary/10 my-1" />
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {isAuthenticated && isAdmin && renderNavLink(adminNavItem)}

            <div className="w-px h-5 bg-primary/20" />

            {/* 알림 벨 — 관리자만 표시 */}
            {!isLoading && isAuthenticated && isAdmin && (
              <Link
                href="/admin"
                className="relative text-muted-foreground hover:text-primary transition-colors"
              >
                <Bell className="w-5 h-5" />
                <UnreadBadge count={adminUnread?.count ?? 0} />
              </Link>
            )}

            {/* 로그인 / 사용자 영역 (데스크탑) */}
            {!isLoading &&
              (isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen((o) => !o)}
                    onBlur={() => setTimeout(() => setUserMenuOpen(false), 150)}
                    className={cn(
                      "flex items-center gap-2 text-sm font-medium transition-all py-1.5 px-3 rounded-full border",
                      profile
                        ? "border-primary/50 bg-primary/10 text-primary hover:bg-primary/20"
                        : "border-primary/20 text-muted-foreground hover:text-primary hover:border-primary/40",
                    )}
                  >
                    <UserCircle2 className="w-4 h-4" />
                    {profile ? (
                      <span>
                        {profile.name ?? user?.firstName ?? "내 사주"}
                        {profile.dayMasterElement && (
                          <span
                            className={cn(
                              "ml-1 font-serif font-bold",
                              ELEM_COLOR[profile.dayMasterElement],
                            )}
                          >
                            {profile.dayMasterStem}
                            {profile.dayMasterBranch ?? ""}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span>{user?.firstName ?? "내 정보"}</span>
                    )}
                    <ChevronDown
                      className={cn(
                        "w-3 h-3 transition-transform",
                        userMenuOpen && "rotate-180",
                      )}
                    />
                  </button>
                  {userMenuOpen && (
                    <div className="absolute top-full mt-2 right-0 w-52 glass-panel border border-primary/20 rounded-2xl p-2 shadow-xl z-50 animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 duration-150">
                        <Link
                          href="/account"
                          onClick={handleMenuNavigation("/account", () =>
                            setUserMenuOpen(false),
                          )}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-primary/8 hover:text-primary transition-colors"
                        >
                          <Settings className="w-4 h-4" />
                          회원정보 관리
                        </Link>
                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
                            setProfileOpen(true);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-primary/8 hover:text-primary transition-colors"
                        >
                          <UserCircle2 className="w-4 h-4" />
                          {profile ? "내 사주 수정" : "내 사주 등록"}
                        </button>
                        <div className="h-px bg-primary/10 my-1" />
                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
                            logout();
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          로그아웃
                        </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => navigate(buildAuthHref("/login"))}
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
                onClick={() => navigate(buildAuthHref("/login"))}
                className="flex items-center gap-1.5 text-xs font-medium py-1.5 px-3 rounded-full border border-primary/40 bg-primary/10 text-primary"
              >
                <LogIn className="w-3.5 h-3.5" />
                로그인
              </button>
            )}
            {!isLoading && isAuthenticated && isAdmin && (
              <Link
                href="/admin"
                className="relative text-muted-foreground hover:text-primary transition-colors p-1"
              >
                <Bell className="w-5 h-5" />
                <UnreadBadge count={adminUnread?.count ?? 0} />
              </Link>
            )}
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="w-9 h-9 flex items-center justify-center rounded-full border border-primary/20 bg-primary/5 text-primary hover:bg-primary/15 transition-colors"
              aria-label="메뉴"
            >
              {mobileMenuOpen ? (
                <X className="w-4 h-4" />
              ) : (
                <Menu className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <button
              type="button"
              aria-label="메뉴 닫기"
              className="absolute inset-x-0 top-16 bottom-0 bg-background/75 backdrop-blur-sm animate-in fade-in-0 duration-150"
              onClick={closeMobile}
            />
            <div className="absolute inset-x-0 top-16 bottom-0 border-t border-primary/10 bg-background/95 backdrop-blur-xl overflow-y-auto overscroll-contain animate-in fade-in-0 slide-in-from-top-2 duration-200">
              <div className="container mx-auto min-h-full px-4 py-3 pb-24 flex flex-col gap-1">
                {navItems.map((item) => renderMobileNavLink(item, closeMobile))}

                {extraServiceGroups.length > 0 && (
                  <div className="flex flex-col gap-2 pt-2">
                    {extraServiceGroups.map((group) => {
                      const isOpen = mobileServiceGroupOpen === group.key;

                      return (
                        <div
                          key={group.key}
                          className="rounded-2xl border border-primary/15 bg-card/30 backdrop-blur-sm overflow-hidden"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setMobileServiceGroupOpen((current) =>
                                current === group.key ? null : group.key,
                              )
                            }
                            className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
                          >
                            <div>
                              <div className="text-[10px] font-semibold tracking-[0.18em] text-primary/60 uppercase">
                                {group.label}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {group.items.length}개 메뉴
                              </div>
                            </div>
                            <ChevronDown
                              className={cn(
                                "w-4 h-4 text-muted-foreground transition-transform",
                                isOpen && "rotate-180",
                              )}
                            />
                          </button>

                          {isOpen && (
                            <div className="overflow-hidden animate-in fade-in-0 slide-in-from-top-1 duration-150">
                                <div className="px-2 pb-2 flex flex-col gap-1">
                                  {group.items.map((s) =>
                                    renderMobileNavLink(s, closeMobile),
                                  )}
                                </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="h-px bg-primary/10 my-1" />

                {isAuthenticated &&
                  isAdmin &&
                  renderMobileNavLink(adminNavItem, closeMobile)}

                <div className="h-px bg-primary/10 my-1" />

                {!isLoading &&
                  (isAuthenticated ? (
                    <>
                      <Link
                        href="/account"
                        onClick={handleMenuNavigation("/account", closeMobile)}
                        className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-primary/8 hover:text-primary transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        회원정보 관리
                      </Link>
                      <button
                        onClick={() => {
                          setProfileOpen(true);
                          closeMobile();
                        }}
                        className={cn(
                          "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors w-full text-left",
                          profile
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-primary/8 hover:text-primary",
                        )}
                      >
                        <UserCircle2 className="w-4 h-4" />
                        {profile ? (
                          <span>
                            {profile.name ?? user?.firstName ?? "내 사주"}
                            {profile.dayMasterElement && (
                              <span
                                className={cn(
                                  "ml-1 font-serif font-bold",
                                  ELEM_COLOR[profile.dayMasterElement],
                                )}
                              >
                                {profile.dayMasterStem}
                                {profile.dayMasterBranch ?? ""}
                              </span>
                            )}
                            <span className="ml-2 text-xs text-muted-foreground font-normal">
                              사주 수정
                            </span>
                          </span>
                        ) : (
                          <span>내 사주 등록하기</span>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          logout();
                          closeMobile();
                        }}
                        className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-colors w-full text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        로그아웃
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        navigate(buildAuthHref("/login"));
                        closeMobile();
                      }}
                      className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium bg-primary/10 text-primary border border-primary/30 w-full"
                    >
                      <LogIn className="w-4 h-4" />
                      로그인
                    </button>
                  ))}
              </div>
            </div>
          </div>
      )}

      {/* 공지사항 배너 */}
      {visibleAnnouncements.slice(0, 2).map((a) => {
          const typeStyle =
            a.type === "warning"
              ? "bg-amber-500/15 border-amber-500/40 text-amber-700"
              : a.type === "notice"
                ? "bg-primary/15 border-primary/40 text-primary-foreground"
                : "bg-sky-500/10 border-sky-500/30 text-sky-700";
          return (
            <div
              key={a.id}
              className={`border-b px-4 py-2.5 text-sm flex items-center gap-3 animate-in fade-in-0 slide-in-from-top-1 duration-150 ${typeStyle}`}
            >
              <Bell className="w-3.5 h-3.5 shrink-0 opacity-80" />
              {a.isPinned && <span className="text-xs font-bold opacity-70">[공지]</span>}
              <span className="flex-1 truncate">{a.title} — {a.content}</span>
              <button
                onClick={() => dismissAnnouncement(a.id)}
                className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}

      <main className="flex-1 container mx-auto px-4 py-8 md:py-12">
        {children}
      </main>

      <footer className="border-t border-primary/10 px-4 py-6 text-center text-sm text-muted-foreground/60 mt-auto glass-panel rounded-t-3xl">
        <div className="mx-auto max-w-5xl">
          <div className="mb-4 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs font-medium text-muted-foreground/75">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-primary"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <p className="font-serif tracking-widest">
            Copyright © {new Date().getFullYear()} 명해원(命海苑). All rights reserved.
          </p>
          <p className="mt-1 text-xs tracking-[0.2em]">
            운명의 바다, 지혜가 모이는 곳.
          </p>
          <p className="mx-auto mt-3 max-w-3xl text-xs leading-6 text-muted-foreground/55">
            명해원의 사주 분석 결과는 참고용 콘텐츠이며, 의료·법률·투자·진로·결혼 등
            중요한 의사결정을 대신하지 않습니다.
          </p>
        </div>
      </footer>

      {isAuthenticated && (
        <ProfileModal
          open={profileOpen}
          onClose={() => setProfileOpen(false)}
        />
      )}

      {showScrollTop && (
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-6 right-6 z-50 w-11 h-11 rounded-full bg-primary/90 hover:bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center transition-colors animate-in fade-in-0 zoom-in-95 duration-200"
            aria-label="맨 위로"
          >
            <ChevronUp className="w-5 h-5" />
          </button>
        )}
    </div>
  );
}
