import { Suspense, lazy } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AuthProvider } from "@workspace/replit-auth-web";
import { UserProvider } from "@/contexts/UserContext";
import { Layout } from "@/components/layout";
import RequireAuth from "@/components/RequireAuth";
import RequireAdmin from "@/components/RequireAdmin";

const Home = lazy(() => import("@/pages/home"));
const SajuPage = lazy(() => import("@/pages/saju"));
const DailyFortunePage = lazy(() => import("@/pages/daily-fortune"));
const ManseryokPage = lazy(() => import("@/pages/manseryok"));
const GungapPage = lazy(() => import("@/pages/gungap"));
const SavedPage = lazy(() => import("@/pages/saved"));
const InquiriesPage = lazy(() => import("@/pages/inquiries"));
const AdminPage = lazy(() => import("@/pages/admin"));
const YearFortunePage = lazy(() => import("@/pages/year-fortune"));
const NameAnalysisPage = lazy(() => import("@/pages/name-analysis"));
const ZodiacPage = lazy(() => import("@/pages/zodiac"));
const AccountPage = lazy(() => import("@/pages/account"));
const DreamPage = lazy(() => import("@/pages/dream"));
const LoginPage = lazy(() => import("@/pages/login"));
const RegisterPage = lazy(() => import("@/pages/register"));
const ForgotPasswordPage = lazy(() => import("@/pages/forgot-password"));
const ResetPasswordPage = lazy(() => import("@/pages/reset-password"));
const PaymentSuccessPage = lazy(() => import("@/pages/payment-success"));
const PaymentFailPage = lazy(() => import("@/pages/payment-fail"));
const DaeunPage = lazy(() => import("@/pages/daeun"));
const MonthlyFortunePage = lazy(() => import("@/pages/monthly-fortune"));
const LuckyCalendarPage = lazy(() => import("@/pages/lucky-calendar"));
const SinsalGuidePage = lazy(() => import("@/pages/sinsal-guide"));
const GlossaryPage = lazy(() => import("@/pages/glossary"));
const SajuTablesPage = lazy(() => import("@/pages/saju-tables"));
const DayPillarAnalysisPage = lazy(() => import("@/pages/day-pillar-analysis"));
const LoveFortunePage = lazy(() => import("@/pages/love-fortune"));
const NotFound = lazy(() => import("@/pages/not-found"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 3 * 60 * 1000,   // 3분간 fresh 유지 — 불필요 재호출 방지
      gcTime: 10 * 60 * 1000,     // 10분간 캐시 보존
    },
  },
});

function RouteLoadingFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="flex items-center gap-2 rounded-2xl border border-primary/15 bg-card/35 px-4 py-3 text-sm text-muted-foreground backdrop-blur-xl">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        페이지 불러오는 중...
      </div>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Switch>
        <Route path="/login" component={LoginPage} />
        <Route path="/register" component={RegisterPage} />
        <Route path="/forgot-password" component={ForgotPasswordPage} />
        <Route path="/reset-password" component={ResetPasswordPage} />
        <Route path="/payments/success" component={PaymentSuccessPage} />
        <Route path="/payments/fail" component={PaymentFailPage} />
        <Route>
          <Layout>
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/daily-fortune" component={DailyFortunePage} />
              <Route path="/saju" component={SajuPage} />
              <Route path="/manseryok" component={ManseryokPage} />
              <Route
                path="/account"
                component={() => (
                  <RequireAuth>
                    <AccountPage />
                  </RequireAuth>
                )}
              />
              <Route path="/gungap" component={GungapPage} />
              <Route path="/love-fortune" component={LoveFortunePage} />
              <Route
                path="/year-fortune"
                component={() => (
                  <RequireAuth>
                    <YearFortunePage />
                  </RequireAuth>
                )}
              />
              <Route
                path="/name-analysis"
                component={() => (
                  <RequireAuth>
                    <NameAnalysisPage />
                  </RequireAuth>
                )}
              />
              <Route
                path="/zodiac"
                component={() => (
                  <RequireAuth>
                    <ZodiacPage />
                  </RequireAuth>
                )}
              />
              <Route
                path="/dream"
                component={() => (
                  <RequireAuth>
                    <DreamPage />
                  </RequireAuth>
                )}
              />
              <Route path="/saved" component={SavedPage} />
              <Route
                path="/daeun"
                component={() => (
                  <RequireAuth>
                    <DaeunPage />
                  </RequireAuth>
                )}
              />
              <Route
                path="/monthly-fortune"
                component={() => (
                  <RequireAuth>
                    <MonthlyFortunePage />
                  </RequireAuth>
                )}
              />
              <Route
                path="/lucky-calendar"
                component={() => (
                  <RequireAuth>
                    <LuckyCalendarPage />
                  </RequireAuth>
                )}
              />
              <Route
                path="/sinsal-guide"
                component={() => (
                  <RequireAdmin>
                    <SinsalGuidePage />
                  </RequireAdmin>
                )}
              />
              <Route
                path="/glossary"
                component={() => (
                  <RequireAdmin>
                    <GlossaryPage />
                  </RequireAdmin>
                )}
              />
              <Route
                path="/saju-tables"
                component={() => (
                  <RequireAdmin>
                    <SajuTablesPage />
                  </RequireAdmin>
                )}
              />
              <Route
                path="/day-pillar-analysis"
                component={() => (
                  <RequireAdmin>
                    <DayPillarAnalysisPage />
                  </RequireAdmin>
                )}
              />
              <Route path="/inquiries" component={InquiriesPage} />
              <Route
                path="/admin"
                component={() => (
                  <RequireAdmin>
                    <AdminPage />
                  </RequireAdmin>
                )}
              />
              <Route component={NotFound} />
            </Switch>
          </Layout>
        </Route>
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <UserProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </UserProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
