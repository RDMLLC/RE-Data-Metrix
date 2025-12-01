import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WizardDataProvider } from "@/contexts/WizardDataContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import About from "@/pages/About";
import Company from "@/pages/Company";
import DealAnalysis from "@/pages/DealAnalysis";
import RentalAnalysis from "@/pages/RentalAnalysis";
import Lenders from "@/pages/Lenders";
import Resources from "@/pages/Resources";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Profile from "@/pages/portal/Profile";
import MemberDashboard from "@/pages/portal/Dashboard";
import MemberDeals from "@/pages/portal/Deals";
import SavedLenders from "@/pages/portal/SavedLenders";
import Contact from "@/pages/Contact";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import LenderDashboard from "@/pages/LenderDashboard";
import LenderQuestionnaire from "@/pages/LenderQuestionnaire";
import LenderLoanProducts from "@/pages/LenderLoanProducts";
import LenderCompanyInfo from "@/pages/LenderCompanyInfo";
import LoanTypes from "@/pages/LoanTypes";
import AboutPrivateLenders from "@/pages/AboutPrivateLenders";
import LenderSignup from "@/pages/LenderSignup";
import LenderInvite from "@/pages/admin/LenderInvite";
import AdminLogin from "@/pages/admin/Login";
import AdminDashboard from "@/pages/admin/Dashboard";
import LenderManagement from "@/pages/admin/LenderManagement";
import AdminLenderDetail from "@/pages/admin/LenderDetail";
import AdminReports from "@/pages/admin/Reports";
import AdminCompUsers from "@/pages/admin/CompUsers";
import AdminUserManagement from "@/pages/admin/UserManagement";
import AdminRequestPasswordReset from "@/pages/admin/RequestPasswordReset";
import AdminResetPassword from "@/pages/admin/ResetPassword";
import LenderProfile from "@/pages/LenderProfile";
import VerifyEmail from "@/pages/VerifyEmail";
import RequestPasswordReset from "@/pages/RequestPasswordReset";
import ResetPassword from "@/pages/ResetPassword";
import RequestLenderPasswordReset from "@/pages/RequestLenderPasswordReset";
import ResetLenderPassword from "@/pages/ResetLenderPassword";
import LenderSavedBy from "@/pages/LenderSavedBy";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/about" component={About} />
      <Route path="/company" component={Company} />
      <Route path="/deal-analysis" component={DealAnalysis} />
      <Route path="/rental-analysis" component={RentalAnalysis} />
      <Route path="/lenders" component={Lenders} />
      <Route path="/lenders/:id" component={LenderProfile} />
      <Route path="/loan-types" component={LoanTypes} />
      <Route path="/about-private-lenders" component={AboutPrivateLenders} />
      <Route path="/toolbox" component={Resources} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/verify-email/:token" component={VerifyEmail} />
      <Route path="/request-password-reset" component={RequestPasswordReset} />
      <Route path="/reset-password/:token" component={ResetPassword} />
      <Route path="/lender/request-password-reset" component={RequestLenderPasswordReset} />
      <Route path="/lender/reset-password/:token" component={ResetLenderPassword} />
      <Route path="/portal">
        {() => (
          <ProtectedRoute>
            <MemberDashboard />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/portal/dashboard">
        {() => (
          <ProtectedRoute>
            <MemberDashboard />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/portal/profile">
        {() => (
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/portal/deals">
        {() => (
          <ProtectedRoute>
            <MemberDeals />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/portal/saved-lenders">
        {() => (
          <ProtectedRoute>
            <SavedLenders />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/contact" component={Contact} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/lender-portal" component={LenderDashboard} />
      <Route path="/lender-dashboard" component={LenderDashboard} />
      <Route path="/lender-company-info" component={LenderCompanyInfo} />
      <Route path="/lender-questionnaire" component={LenderQuestionnaire} />
      <Route path="/lender-loan-products" component={LenderLoanProducts} />
      <Route path="/lender-saved-by" component={LenderSavedBy} />
      <Route path="/lender-signup/:token" component={LenderSignup} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/request-password-reset" component={AdminRequestPasswordReset} />
      <Route path="/admin/reset-password/:token" component={AdminResetPassword} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/lenders/:id" component={AdminLenderDetail} />
      <Route path="/admin/lenders" component={LenderManagement} />
      <Route path="/admin/reports" component={AdminReports} />
      <Route path="/admin/comp-users" component={AdminCompUsers} />
      <Route path="/admin/users" component={AdminUserManagement} />
      <Route path="/admin/lender-invite" component={LenderInvite} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WizardDataProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </WizardDataProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
