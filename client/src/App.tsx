import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WizardDataProvider } from "@/contexts/WizardDataContext";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import About from "@/pages/About";
import Company from "@/pages/Company";
import DealAnalysis from "@/pages/DealAnalysis";
import RentalAnalysis from "@/pages/RentalAnalysis";
import Lenders from "@/pages/Lenders";
import Resources from "@/pages/Resources";
import Login from "@/pages/Login";
import Contact from "@/pages/Contact";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import LenderDashboard from "@/pages/LenderDashboard";
import LenderQuestionnaire from "@/pages/LenderQuestionnaire";
import LenderLoanProducts from "@/pages/LenderLoanProducts";
import LenderCompanyInfo from "@/pages/LenderCompanyInfo";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/about" component={About} />
      <Route path="/company" component={Company} />
      <Route path="/deal-analysis" component={DealAnalysis} />
      <Route path="/rental-analysis" component={RentalAnalysis} />
      <Route path="/lenders" component={Lenders} />
      <Route path="/toolbox" component={Resources} />
      <Route path="/login" component={Login} />
      <Route path="/contact" component={Contact} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/lender-portal" component={LenderDashboard} />
      <Route path="/lender-dashboard" component={LenderDashboard} />
      <Route path="/lender-company-info" component={LenderCompanyInfo} />
      <Route path="/lender-questionnaire" component={LenderQuestionnaire} />
      <Route path="/lender-loan-products" component={LenderLoanProducts} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WizardDataProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </WizardDataProvider>
    </QueryClientProvider>
  );
}

export default App;
