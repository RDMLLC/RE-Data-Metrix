import { Switch, Route } from "wouter";
import { lazy, Suspense, Component, type ReactNode } from "react";
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
import { ContractorAuthProvider } from "@/contexts/ContractorAuthContext";
import { DeviceModeProvider } from "@/contexts/DeviceModeContext";
import { MobileRedirectHandler } from "@/components/MobileRedirectHandler";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import MarketingPixelLoader from "@/components/MarketingPixelLoader";
import Home from "@/pages/Home";
import NotFound from "@/pages/not-found";

const MobileDealAnalysis = lazy(() => import("@/pages/mobile/MobileDealAnalysis"));
const MobileLenders = lazy(() => import("@/pages/mobile/MobileLenders"));
const MobileToolbox = lazy(() => import("@/pages/mobile/MobileToolbox"));
const MobileWebinar = lazy(() => import("@/pages/mobile/MobileWebinar"));
const About = lazy(() => import("@/pages/About"));
const Company = lazy(() => import("@/pages/Company"));
const DealAnalysis = lazy(() => import("@/pages/DealAnalysis"));
const RentalAnalysis = lazy(() => import("@/pages/RentalAnalysis"));
const Lenders = lazy(() => import("@/pages/Lenders"));
const Resources = lazy(() => import("@/pages/Resources"));
const Login = lazy(() => import("@/pages/Login"));
const Register = lazy(() => import("@/pages/Register"));
const Profile = lazy(() => import("@/pages/portal/Profile"));
const MemberDashboard = lazy(() => import("@/pages/portal/Dashboard"));
const MemberDeals = lazy(() => import("@/pages/portal/Deals"));
const SavedLenders = lazy(() => import("@/pages/portal/SavedLenders"));
const Contact = lazy(() => import("@/pages/Contact"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const Terms = lazy(() => import("@/pages/Terms"));
const Disclaimer = lazy(() => import("@/pages/Disclaimer"));
const AffiliateDisclosure = lazy(() => import("@/pages/AffiliateDisclosure"));
const AffiliateDetail = lazy(() => import("@/pages/AffiliateDetail"));
const AffiliateReport = lazy(() => import("@/pages/AffiliateReport"));
const LenderDashboard = lazy(() => import("@/pages/LenderDashboard"));
const LenderQuestionnaire = lazy(() => import("@/pages/LenderQuestionnaire"));
const LenderLoanProducts = lazy(() => import("@/pages/LenderLoanProducts"));
const LenderCompanyInfo = lazy(() => import("@/pages/LenderCompanyInfo"));
const LoanTypes = lazy(() => import("@/pages/LoanTypes"));
const AboutPrivateLenders = lazy(() => import("@/pages/AboutPrivateLenders"));
const LenderSignup = lazy(() => import("@/pages/LenderSignup"));
const ContractorSignup = lazy(() => import("@/pages/ContractorSignup"));
const ContractorLogin = lazy(() => import("@/pages/ContractorLogin"));
const ContractorAgreement = lazy(() => import("@/pages/ContractorAgreement"));
const ContractorPortal = lazy(() => import("@/pages/ContractorPortal"));
const LenderLogin = lazy(() => import("@/pages/LenderLogin"));
const LenderInvite = lazy(() => import("@/pages/admin/LenderInvite"));
const AdminLogin = lazy(() => import("@/pages/admin/Login"));
const AdminDashboard = lazy(() => import("@/pages/admin/Dashboard"));
const LenderManagement = lazy(() => import("@/pages/admin/LenderManagement"));
const AdminLenderBroadcast = lazy(() => import("@/pages/admin/LenderBroadcast"));
const AdminLenderDetail = lazy(() => import("@/pages/admin/LenderDetail"));
const AdminReports = lazy(() => import("@/pages/admin/Reports"));
const AdminReporting = lazy(() => import("@/pages/admin/Reporting"));
const AdminCompUsers = lazy(() => import("@/pages/admin/CompUsers"));
const AdminAuditorInvites = lazy(() => import("@/pages/admin/AuditorInvites"));
const AdminFinancialProjections = lazy(() => import("@/pages/admin/FinancialProjections"));
const AdminDiscountCodes = lazy(() => import("@/pages/admin/DiscountCodes"));
const AdminPromoCodes = lazy(() => import("@/pages/admin/PromoCodes"));
const AdminWebinarRegistrations = lazy(() => import("@/pages/admin/WebinarRegistrations"));
const AdminReferralPartners = lazy(() => import("@/pages/admin/ReferralPartners"));
const AdminUserManagement = lazy(() => import("@/pages/admin/UserManagement"));
const AdminRequestPasswordReset = lazy(() => import("@/pages/admin/RequestPasswordReset"));
const AdminResetPassword = lazy(() => import("@/pages/admin/ResetPassword"));
const AdminIntegrations = lazy(() => import("@/pages/admin/Integrations"));
const AdminAffiliates = lazy(() => import("@/pages/admin/Affiliates"));
const AdminContractors = lazy(() => import("@/pages/admin/Contractors"));
const AdminCalculationsReference = lazy(() => import("@/pages/admin/CalculationsReference"));
const AdminTrainingVideos = lazy(() => import("@/pages/admin/TrainingVideos"));
const AdminDemoLinks = lazy(() => import("@/pages/admin/DemoLinks"));
import ToolsTracker from "./pages/ToolsTracker";
const AdminMarketingPixels = lazy(() => import("@/pages/admin/MarketingPixels"));
const AdminEmailSenders = lazy(() => import("@/pages/admin/EmailSenders"));
const AdminUserSubmissions = lazy(() => import("@/pages/admin/UserSubmissions"));
const DeveloperIntegrations = lazy(() => import("@/pages/admin/DeveloperIntegrations"));
const DemoEntry = lazy(() => import("@/pages/DemoEntry"));
const LenderProfile = lazy(() => import("@/pages/LenderProfile"));
const VerifyEmail = lazy(() => import("@/pages/VerifyEmail"));
const RequestPasswordReset = lazy(() => import("@/pages/RequestPasswordReset"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const RequestLenderPasswordReset = lazy(() => import("@/pages/RequestLenderPasswordReset"));
const ResetLenderPassword = lazy(() => import("@/pages/ResetLenderPassword"));
const RequestContractorPasswordReset = lazy(() => import("@/pages/RequestContractorPasswordReset"));
const ResetContractorPassword = lazy(() => import("@/pages/ResetContractorPassword"));
const LenderSavedBy = lazy(() => import("@/pages/LenderSavedBy"));
const LenderInquiries = lazy(() => import("@/pages/LenderInquiries"));
const FAQ = lazy(() => import("@/pages/FAQ"));
const Pricing = lazy(() => import("@/pages/Pricing"));
const Upgrade = lazy(() => import("@/pages/Upgrade"));
const Features = lazy(() => import("@/pages/Features"));
const Checkout = lazy(() => import("@/pages/Checkout"));
const CheckoutSuccess = lazy(() => import("@/pages/CheckoutSuccess"));
const CheckoutComplete = lazy(() => import("@/pages/CheckoutComplete"));
const WholesaleCalculator = lazy(() => import("@/pages/WholesaleCalculator"));
const Webinar = lazy(() => import("@/pages/Webinar"));
const WebinarRsvpThankYou = lazy(() => import("@/pages/WebinarRsvpThankYou"));
const BetaSignup = lazy(() => import("@/pages/BetaSignup"));
const FeatureFeedback = lazy(() => import("@/pages/FeatureFeedback"));
const AdminFeatureFeedback = lazy(() => import("@/pages/admin/FeatureFeedback"));
const MetaOffer = lazy(() => import("@/pages/MetaOffer"));
const GoogleOffer = lazy(() => import("@/pages/GoogleOffer"));
const Cancelled = lazy(() => import("@/pages/Cancelled"));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

interface ErrorBoundaryState { hasError: boolean; isChunkError: boolean }
class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, isChunkError: false };
  }
  static getDerivedStateFromError(error: Error) {
    const isChunkError =
      error.name === "ChunkLoadError" ||
      /Failed to fetch dynamically imported module/i.test(error.message) ||
      /Importing a module script failed/i.test(error.message);
    return { hasError: true, isChunkError };
  }
  componentDidCatch(error: Error) {
    const isChunkError =
      error.name === "ChunkLoadError" ||
      /Failed to fetch dynamically imported module/i.test(error.message) ||
      /Importing a module script failed/i.test(error.message);
    if (isChunkError) {
      window.location.reload();
    }
  }
  render() {
    if (this.state.hasError && !this.state.isChunkError) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center max-w-md px-4">
            <p className="text-lg font-medium">Something went wrong</p>
            <p className="text-sm text-muted-foreground">A page failed to load. Please refresh the browser to try again.</p>
            <button onClick={() => window.location.reload()} className="text-sm underline text-muted-foreground">Refresh</button>
          </div>
        </div>
      );
    }
    if (this.state.isChunkError) {
      return null;
    }
    return this.props.children;
  }
}

function Router() {
  return (
    <ErrorBoundary>
    <Suspense fallback={<PageLoader />}>
      <Switch>
        {/* Mobile-specific routes */}
        <Route path="/m/deal-analysis" component={MobileDealAnalysis} />
        <Route path="/m/lenders" component={MobileLenders} />
        <Route path="/m/toolbox" component={MobileToolbox} />
        <Route path="/m/webinar" component={MobileWebinar} />
        <Route path="/m/meta-offer">{() => { window.location.replace("/meta-offer" + window.location.search); return null; }}</Route>
        
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
        <Route path="/resources" component={Resources} />
        <Route path="/webinar" component={Webinar} />
        <Route path="/webinar/rsvp/:registrationId/thank-you" component={WebinarRsvpThankYou} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/verify-email/:token" component={VerifyEmail} />
        <Route path="/request-password-reset" component={RequestPasswordReset} />
        <Route path="/reset-password/:token" component={ResetPassword} />
        <Route path="/lender/request-password-reset" component={RequestLenderPasswordReset} />
        <Route path="/lender/reset-password/:token" component={ResetLenderPassword} />
        <Route path="/contractor/request-password-reset" component={RequestContractorPasswordReset} />
        <Route path="/contractor/reset-password/:token" component={ResetContractorPassword} />
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
        <Route path="/portal/upgrade">
          {() => (
            <ProtectedRoute>
              <Upgrade />
            </ProtectedRoute>
          )}
        </Route>
        <Route path="/checkout" component={Checkout} />
        <Route path="/checkout/success" component={CheckoutSuccess} />
        <Route path="/checkout/complete" component={CheckoutComplete} />
        <Route path="/meta-offer" component={MetaOffer} />
        <Route path="/linkedin-offer" component={MetaOffer} />
        <Route path="/google-offer" component={GoogleOffer} />
        <Route path="/cancelled" component={Cancelled} />
        <Route path="/beta-signup" component={BetaSignup} />
        <Route path="/feedback" component={FeatureFeedback} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/terms" component={Terms} />
        <Route path="/disclaimer" component={Disclaimer} />
        <Route path="/affiliate-disclosure" component={AffiliateDisclosure} />
        <Route path="/partners/:slug" component={AffiliateDetail} />
        <Route path="/affiliate-report/:token" component={AffiliateReport} />
        <Route path="/lender-portal" component={LenderDashboard} />
        <Route path="/lender-dashboard" component={LenderDashboard} />
        <Route path="/lender-company-info" component={LenderCompanyInfo} />
        <Route path="/lender-questionnaire" component={LenderQuestionnaire} />
        <Route path="/lender-loan-products" component={LenderLoanProducts} />
        <Route path="/lender-saved-by" component={LenderSavedBy} />
        <Route path="/lender-inquiries" component={LenderInquiries} />
        <Route path="/lender-signup/:token" component={LenderSignup} />
        <Route path="/contractor-signup/:token" component={ContractorSignup} />
        <Route path="/contractor-login" component={ContractorLogin} />
        <Route path="/contractor-agreement" component={ContractorAgreement} />
        <Route path="/contractor-portal" component={ContractorPortal} />
        <Route path="/lender-login" component={LenderLogin} />
        <Route path="/admin/login" component={AdminLogin} />
        <Route path="/admin/request-password-reset" component={AdminRequestPasswordReset} />
        <Route path="/admin/reset-password/:token" component={AdminResetPassword} />
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/dashboard" component={AdminDashboard} />
        <Route path="/admin/lenders/:id" component={AdminLenderDetail} />
        <Route path="/admin/lenders" component={LenderManagement} />
        <Route path="/admin/lender-broadcast" component={AdminLenderBroadcast} />
        <Route path="/admin/reports" component={AdminReports} />
        <Route path="/admin/reporting" component={AdminReporting} />
        <Route path="/admin/tools-tracker" component={ToolsTracker} />
        <Route path="/admin/comp-users" component={AdminCompUsers} />
        <Route path="/admin/auditor-invites" component={AdminAuditorInvites} />
        <Route path="/admin/financial-projections" component={AdminFinancialProjections} />
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
        <Route path="/admin/feature-feedback" component={AdminFeatureFeedback} />
        <Route path="/admin/email-senders" component={AdminEmailSenders} />
        <Route path="/admin/user-submissions" component={AdminUserSubmissions} />
        <Route path="/admin/lender-invite" component={LenderInvite} />
        <Route path="/demo/:token" component={DemoEntry} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
    </ErrorBoundary>
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
            <ContractorAuthProvider>
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
            </ContractorAuthProvider>
          </LenderAuthProvider>
        </AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
