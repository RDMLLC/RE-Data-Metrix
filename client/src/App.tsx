import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CookieConsent } from "@/components/CookieConsent";
import { OrganizationSchema, WebApplicationSchema } from "@/components/StructuredData";
import { WizardDataProvider } from "@/contexts/WizardDataContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { LenderAuthProvider } from "@/contexts/LenderAuthContext";
import { DeviceModeProvider } from "@/contexts/DeviceModeContext";
import { MobileRedirectHandler } from "@/components/MobileRedirectHandler";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import NotFound from "@/pages/not-found";
import MobileDealAnalysis from "@/pages/mobile/MobileDealAnalysis";
import MobileLenders from "@/pages/mobile/MobileLenders";
import MobileToolbox from "@/pages/mobile/MobileToolbox";
import MobileWebinar from "@/pages/mobile/MobileWebinar";
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
import Disclaimer from "@/pages/Disclaimer";
import AffiliateDisclosure from "@/pages/AffiliateDisclosure";
import LenderDashboard from "@/pages/LenderDashboard";
import LenderQuestionnaire from "@/pages/LenderQuestionnaire";
import LenderLoanProducts from "@/pages/LenderLoanProducts";
import LenderCompanyInfo from "@/pages/LenderCompanyInfo";
import LoanTypes from "@/pages/LoanTypes";
import AboutPrivateLenders from "@/pages/AboutPrivateLenders";
import LenderSignup from "@/pages/LenderSignup";
import ContractorSignup from "@/pages/ContractorSignup";
import LenderLogin from "@/pages/LenderLogin";
import LenderInvite from "@/pages/admin/LenderInvite";
import AdminLogin from "@/pages/admin/Login";
import AdminDashboard from "@/pages/admin/Dashboard";
import LenderManagement from "@/pages/admin/LenderManagement";
import AdminLenderDetail from "@/pages/admin/LenderDetail";
import AdminReports from "@/pages/admin/Reports";
import AdminCompUsers from "@/pages/admin/CompUsers";
import AdminDiscountCodes from "@/pages/admin/DiscountCodes";
import AdminPromoCodes from "@/pages/admin/PromoCodes";
import AdminWebinarRegistrations from "@/pages/admin/WebinarRegistrations";
import AdminReferralPartners from "@/pages/admin/ReferralPartners";
import AdminUserManagement from "@/pages/admin/UserManagement";
import AdminRequestPasswordReset from "@/pages/admin/RequestPasswordReset";
import AdminResetPassword from "@/pages/admin/ResetPassword";
import AdminIntegrations from "@/pages/admin/Integrations";
import AdminAffiliates from "@/pages/admin/Affiliates";
import AdminContractors from "@/pages/admin/Contractors";
import AdminCalculationsReference from "@/pages/admin/CalculationsReference";
import AdminTrainingVideos from "@/pages/admin/TrainingVideos";
import AdminDemoLinks from "@/pages/admin/DemoLinks";
import AdminMarketingPixels from "@/pages/admin/MarketingPixels";
import DeveloperIntegrations from "@/pages/admin/DeveloperIntegrations";
import DemoEntry from "@/pages/DemoEntry";
import LenderProfile from "@/pages/LenderProfile";
import VerifyEmail from "@/pages/VerifyEmail";
import RequestPasswordReset from "@/pages/RequestPasswordReset";
import ResetPassword from "@/pages/ResetPassword";
import RequestLenderPasswordReset from "@/pages/RequestLenderPasswordReset";
import ResetLenderPassword from "@/pages/ResetLenderPassword";
import LenderSavedBy from "@/pages/LenderSavedBy";
import LenderInquiries from "@/pages/LenderInquiries";
import FAQ from "@/pages/FAQ";
import Pricing from "@/pages/Pricing";
import Upgrade from "@/pages/Upgrade";
import Signup from "@/pages/Signup";
import Features from "@/pages/Features";
import Checkout from "@/pages/Checkout";
import CheckoutSuccess from "@/pages/CheckoutSuccess";
import CheckoutComplete from "@/pages/CheckoutComplete";
import WholesaleCalculator from "@/pages/WholesaleCalculator";
import Webinar from "@/pages/Webinar";
import WebinarRsvpThankYou from "@/pages/WebinarRsvpThankYou";
import MarketingPixelLoader from "@/components/MarketingPixelLoader";

function Router() {
  return (
    <Switch>
      {/* Mobile-specific routes */}
      <Route path="/m/deal-analysis" component={MobileDealAnalysis} />
      <Route path="/m/lenders" component={MobileLenders} />
      <Route path="/m/toolbox" component={MobileToolbox} />
      <Route path="/m/webinar" component={MobileWebinar} />
      
      <Route path="/" component={Home} />
      <Route path="/about" component={About} />
      <Route path="/company" component={Company} />
      <Route path="/deal-analysis" component={DealAnalysis} />
      <Route path="/deal-analysis/wholesale-calculator" component={WholesaleCalculator} />
      <Route path="/rental-analysis" component={RentalAnalysis} />
      <Route path="/lenders" component={Lenders} />
      <Route path="/lenders/:id" component={LenderProfile} />
      <Route path="/loan-types" component={LoanTypes} />
      <Route path="/about-private-lenders" component={AboutPrivateLenders} />
      <Route path="/toolbox" component={Resources} />
      <Route path="/webinar" component={Webinar} />
      <Route path="/webinar/rsvp/:registrationId/thank-you" component={WebinarRsvpThankYou} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
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
      <Route path="/portal/settings">
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
      <Route path="/faq" component={FAQ} />
      <Route path="/features" component={Features} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/upgrade" component={Upgrade} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/checkout/success" component={CheckoutSuccess} />
      <Route path="/checkout/complete" component={CheckoutComplete} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/disclaimer" component={Disclaimer} />
      <Route path="/affiliate-disclosure" component={AffiliateDisclosure} />
      <Route path="/lender-portal" component={LenderDashboard} />
      <Route path="/lender-dashboard" component={LenderDashboard} />
      <Route path="/lender-company-info" component={LenderCompanyInfo} />
      <Route path="/lender-questionnaire" component={LenderQuestionnaire} />
      <Route path="/lender-loan-products" component={LenderLoanProducts} />
      <Route path="/lender-saved-by" component={LenderSavedBy} />
      <Route path="/lender-inquiries" component={LenderInquiries} />
      <Route path="/lender-signup/:token" component={LenderSignup} />
      <Route path="/contractor-signup/:token" component={ContractorSignup} />
      <Route path="/lender-login" component={LenderLogin} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/request-password-reset" component={AdminRequestPasswordReset} />
      <Route path="/admin/reset-password/:token" component={AdminResetPassword} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/lenders/:id" component={AdminLenderDetail} />
      <Route path="/admin/lenders" component={LenderManagement} />
      <Route path="/admin/reports" component={AdminReports} />
      <Route path="/admin/comp-users" component={AdminCompUsers} />
      <Route path="/admin/discount-codes" component={AdminDiscountCodes} />
      <Route path="/admin/promo-codes" component={AdminPromoCodes} />
      <Route path="/admin/webinar-registrations" component={AdminWebinarRegistrations} />
      <Route path="/admin/referral-partners" component={AdminReferralPartners} />
      <Route path="/admin/users" component={AdminUserManagement} />
      <Route path="/admin/integrations" component={AdminIntegrations} />
      <Route path="/admin/affiliates" component={AdminAffiliates} />
      <Route path="/admin/contractors" component={AdminContractors} />
      <Route path="/admin/marketing-pixels" component={AdminMarketingPixels} />
      <Route path="/admin/training-videos" component={AdminTrainingVideos} />
      <Route path="/admin/calculations" component={AdminCalculationsReference} />
      <Route path="/admin/demo-links" component={AdminDemoLinks} />
      <Route path="/admin/developer-integrations" component={DeveloperIntegrations} />
      <Route path="/admin/lender-invite" component={LenderInvite} />
      <Route path="/demo/:token" component={DemoEntry} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <HelmetProvider>
      <OrganizationSchema />
      <WebApplicationSchema />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LenderAuthProvider>
            <WizardDataProvider>
              <DeviceModeProvider>
                <TooltipProvider>
                  <Toaster />
                  <CookieConsent />
                  <MobileRedirectHandler />
                  <MarketingPixelLoader />
                  <Router />
                </TooltipProvider>
              </DeviceModeProvider>
            </WizardDataProvider>
          </LenderAuthProvider>
        </AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
