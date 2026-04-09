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
            <Route path="/saju" component={() => <RequireAuth><SajuPage /></RequireAuth>} />
            <Route path="/manseryok" component={() => <RequireAuth><ManseryokPage /></RequireAuth>} />
            <Route path="/account" component={() => <RequireAuth><AccountPage /></RequireAuth>} />
            <Route path="/gungap" component={() => <RequireAdmin><GungapPage /></RequireAdmin>} />
            <Route path="/year-fortune" component={() => <RequireAdmin><YearFortunePage /></RequireAdmin>} />
            <Route path="/name-analysis" component={() => <RequireAdmin><NameAnalysisPage /></RequireAdmin>} />
            <Route path="/zodiac" component={() => <RequireAdmin><ZodiacPage /></RequireAdmin>} />
            <Route path="/dream" component={() => <RequireAdmin><DreamPage /></RequireAdmin>} />
            <Route path="/saved" component={() => <RequireAdmin><SavedPage /></RequireAdmin>} />
            <Route path="/daeun" component={() => <RequireAuth><DaeunPage /></RequireAuth>} />
            <Route path="/monthly-fortune" component={() => <RequireAuth><MonthlyFortunePage /></RequireAuth>} />
            <Route path="/lucky-calendar" component={() => <RequireAuth><LuckyCalendarPage /></RequireAuth>} />
            <Route path="/sinsal-guide" component={SinsalGuidePage} />
            <Route path="/glossary" component={GlossaryPage} />
            <Route path="/saju-tables" component={SajuTablesPage} />
            <Route path="/inquiries" component={() => <RequireAdmin><InquiriesPage /></RequireAdmin>} />
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
