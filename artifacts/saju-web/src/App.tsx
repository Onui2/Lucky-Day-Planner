import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { UserProvider } from "@/contexts/UserContext";
import { Layout } from "@/components/layout";
import RequireAuth from "@/components/RequireAuth";
import RequireAdmin from "@/components/RequireAdmin";
import Home from "@/pages/home";
import SajuPage from "@/pages/saju";
import DailyFortunePage from "@/pages/daily-fortune";
import ManseryokPage from "@/pages/manseryok";
import GungapPage from "@/pages/gungap";
import SavedPage from "@/pages/saved";
import InquiriesPage from "@/pages/inquiries";
import AdminPage from "@/pages/admin";
import YearFortunePage from "@/pages/year-fortune";
import NameAnalysisPage from "@/pages/name-analysis";
import ZodiacPage from "@/pages/zodiac";
import AccountPage from "@/pages/account";
import DreamPage from "@/pages/dream";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";
import DaeunPage from "@/pages/daeun";
import MonthlyFortunePage from "@/pages/monthly-fortune";
import LuckyCalendarPage from "@/pages/lucky-calendar";
import SinsalGuidePage from "@/pages/sinsal-guide";
import GlossaryPage from "@/pages/glossary";
import SajuTablesPage from "@/pages/saju-tables";
import LoveFortunePage from "@/pages/love-fortune";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route>
        <Layout>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/daily-fortune" component={DailyFortunePage} />
            <Route path="/saju" component={SajuPage} />
            <Route path="/manseryok" component={ManseryokPage} />
            <Route path="/account" component={() => <RequireAuth><AccountPage /></RequireAuth>} />
            <Route path="/gungap" component={GungapPage} />
            <Route path="/love-fortune" component={LoveFortunePage} />
            <Route path="/year-fortune" component={() => <RequireAuth><YearFortunePage /></RequireAuth>} />
            <Route path="/name-analysis" component={() => <RequireAuth><NameAnalysisPage /></RequireAuth>} />
            <Route path="/zodiac" component={() => <RequireAuth><ZodiacPage /></RequireAuth>} />
            <Route path="/dream" component={() => <RequireAuth><DreamPage /></RequireAuth>} />
            <Route path="/saved" component={SavedPage} />
            <Route path="/daeun" component={DaeunPage} />
            <Route path="/monthly-fortune" component={MonthlyFortunePage} />
            <Route path="/lucky-calendar" component={LuckyCalendarPage} />
            <Route path="/sinsal-guide" component={() => <RequireAdmin><SinsalGuidePage /></RequireAdmin>} />
            <Route path="/glossary" component={() => <RequireAdmin><GlossaryPage /></RequireAdmin>} />
            <Route path="/saju-tables" component={() => <RequireAdmin><SajuTablesPage /></RequireAdmin>} />
            <Route path="/inquiries" component={InquiriesPage} />
            <Route path="/admin" component={() => <RequireAdmin><AdminPage /></RequireAdmin>} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <UserProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </UserProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
