import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Search, ExternalLink, Heart, Clock, TrendingUp, Zap, Users, DollarSign, CheckCircle, XCircle, GraduationCap } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect, useRef, useCallback } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import { LendersPageSchema } from "@/components/StructuredData";

const loanTypesData = [
  {
    id: "hard-money",
    name: "Hard Money / Bridge",
    icon: <Clock className="h-5 w-5 text-accent" />,
    description: "Short-term loans from private lenders secured by real estate. Asset-based loans focused on property value (ARV) rather than creditworthiness. Ideal for fix-and-flip projects.",
    terms: { rate: "9-15%", term: "6-24 months", down: "10-25%", closing: "7-14 days" },
    pros: ["Fast funding (7-14 days)", "Flexible terms", "Credit less important than deal quality"],
    cons: ["High interest rates", "Significant upfront costs", "Short loan terms"]
  },
  {
    id: "dscr",
    name: "DSCR (Debt Service Coverage Ratio)",
    icon: <TrendingUp className="h-5 w-5 text-accent" />,
    description: "Investment property loans that qualify based on the property's rental income rather than personal income. Great for self-employed investors.",
    terms: { rate: "7.5-10%", term: "30 years", down: "20-25%", closing: "21-30 days" },
    pros: ["No personal income verification", "Can close in LLC", "Build rental portfolio"],
    cons: ["Higher rates than conventional", "Larger down payment", "Property must generate income"]
  },
  {
    id: "transactional",
    name: "Transactional Funding",
    icon: <Zap className="h-5 w-5 text-accent" />,
    description: "Ultra-short-term financing for same-day or back-to-back closings. Provides 100% financing for wholesale deals where you buy and immediately resell.",
    terms: { rate: "Flat fee $1,500-$3,000", term: "1-3 days", down: "0%", closing: "Same day" },
    pros: ["100% financing", "Same-day closings", "No credit checks"],
    cons: ["Only for wholesale deals", "Requires confirmed end buyer", "High fees"]
  },
  {
    id: "private-seller",
    name: "Private/Seller Financing",
    icon: <Users className="h-5 w-5 text-accent" />,
    description: "Financing directly from the property seller or a private individual investor. Offers flexible terms customized to both parties' needs.",
    terms: { rate: "6-12%", term: "5-30 years", down: "10-30%", closing: "7-30 days" },
    pros: ["Extremely flexible terms", "Fast closings", "Can work around credit issues"],
    cons: ["Requires finding willing sellers", "Terms vary widely", "Limited legal protections"]
  },
  {
    id: "conventional",
    name: "Conventional",
    icon: <DollarSign className="h-5 w-5 text-accent" />,
    description: "Traditional mortgages from banks following Fannie Mae and Freddie Mac guidelines. Best rates but strict requirements.",
    terms: { rate: "6-8%", term: "15-30 years", down: "15-25%", closing: "30-45 days" },
    pros: ["Lower interest rates", "Predictable payments", "Long terms"],
    cons: ["Strict credit requirements", "Extensive documentation", "Longer closing process"]
  }
];

const searchSchema = z.object({
  state: z.string().optional(),
  loanType: z.string().optional(),
  brokerOrDirectLender: z.string().optional(),
  fastestClosingTime: z.string().optional(),
  offerNonTraditionalLending: z.string().optional(),
  workWithNewInvestors: z.string().optional(),
  minCreditScore: z.string().optional(),
  offerDeferredPayment: z.string().optional(),
  offerRolledPoints: z.string().optional(),
  offer100PercentFunding: z.string().optional(),
  offerMultiUnitFinancing: z.string().optional(),
});

type SearchForm = z.infer<typeof searchSchema>;

interface SearchResult {
  id: string;
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
  website: string;
  referralLink: string;
  companyDescription: string;
}

const PLACEHOLDER_LENDERS: SearchResult[] = [
  {
    id: "demo-lender-1",
    companyName: "Capital Bridge Funding",
    contactName: "Michael Thompson",
    phone: "(555) 123-4567",
    email: "michael@capitalbridgefunding.com",
    website: "https://capitalbridgefunding.com",
    referralLink: "#",
    companyDescription: "Nationwide hard money lender specializing in fix-and-flip and bridge loans. We offer competitive rates starting at 9.5% with fast closings in as little as 7 days. 100% rehab financing available for experienced investors.",
  },
  {
    id: "demo-lender-2",
    companyName: "Prime DSCR Loans",
    contactName: "Sarah Martinez",
    phone: "(555) 234-5678",
    email: "sarah@primedscr.com",
    website: "https://primedscr.com",
    referralLink: "#",
    companyDescription: "DSCR loan specialists offering 30-year fixed rate investment property loans. No personal income verification required. We work with LLCs and close loans in all 50 states with credit scores as low as 620.",
  },
  {
    id: "demo-lender-3",
    companyName: "Apex Transactional Funding",
    contactName: "David Chen",
    phone: "(555) 345-6789",
    email: "david@apextransactional.com",
    website: "https://apextransactional.com",
    referralLink: "#",
    companyDescription: "Same-day transactional funding for wholesale deals. 100% financing with flat fee pricing. No credit check required. Perfect for double closes and assignment deals.",
  },
  {
    id: "demo-lender-4",
    companyName: "Investor's Choice Capital",
    contactName: "Jennifer Williams",
    phone: "(555) 456-7890",
    email: "jennifer@investorschoicecapital.com",
    website: "https://investorschoicecapital.com",
    referralLink: "#",
    companyDescription: "Full-service private lending firm offering hard money, DSCR, and conventional investment property loans. New investor friendly with mentorship programs. Multi-unit specialist up to 100+ units.",
  },
  {
    id: "demo-lender-5",
    companyName: "Velocity Lending Group",
    contactName: "Robert Anderson",
    phone: "(555) 567-8901",
    email: "robert@velocitylendinggroup.com",
    website: "https://velocitylendinggroup.com",
    referralLink: "#",
    companyDescription: "Fast-closing bridge lender with nationwide coverage. Specializing in non-traditional lending solutions including ground-up construction, land loans, and creative financing options. Deferred payment and rolled points available.",
  },
  {
    id: "demo-lender-6",
    companyName: "Equity First Mortgage",
    contactName: "Lisa Park",
    phone: "(555) 678-9012",
    email: "lisa@equityfirstmortgage.com",
    website: "https://equityfirstmortgage.com",
    referralLink: "#",
    companyDescription: "Direct lender offering competitive conventional and portfolio loans for investment properties. Excellent rates for borrowers with 700+ credit scores. 15 and 30 year fixed options available.",
  },
  {
    id: "demo-lender-7",
    companyName: "FlipFund Pro",
    contactName: "Marcus Johnson",
    phone: "(555) 789-0123",
    email: "marcus@flipfundpro.com",
    website: "https://flipfundpro.com",
    referralLink: "#",
    companyDescription: "Hard money lender built by flippers, for flippers. Up to 90% LTV and 100% rehab financing. Fast 5-day closings with no prepayment penalties. Works with first-time investors.",
  },
  {
    id: "demo-lender-8",
    companyName: "Rental Portfolio Partners",
    contactName: "Amanda Stevens",
    phone: "(555) 890-1234",
    email: "amanda@rentalportfoliopartners.com",
    website: "https://rentalportfoliopartners.com",
    referralLink: "#",
    companyDescription: "DSCR and portfolio lender for buy-and-hold investors. Blanket loans for multiple properties. 5-unit to 100+ unit commercial loans available. Interest-only options and 40-year amortization.",
  },
];

export default function Lenders() {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [location, setLocation] = useLocation();
  const lastHandledQueryRef = useRef<string>('');
  const [pendingLenderIds, setPendingLenderIds] = useState<Set<string>>(new Set());
  const { user, isSubscriber } = useAuth();
  const { toast } = useToast();

  const { data: demoModeData } = useQuery<{ enabled: boolean }>({
    queryKey: ["/api/settings/demo-mode"],
  });

  const isDemoMode = demoModeData?.enabled === true;

  interface SavedLenderData {
    lenderId: string;
  }

  const { data: savedLendersData } = useQuery<SavedLenderData[]>({
    queryKey: ["/api/member/saved-lenders"],
    enabled: !!user,
  });

  const savedLenderIds = savedLendersData?.map((sl) => sl.lenderId) ?? [];

  const addPendingLender = (id: string) => {
    setPendingLenderIds(prev => new Set(prev).add(id));
  };

  const removePendingLender = (id: string) => {
    setPendingLenderIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const saveLenderMutation = useMutation({
    mutationFn: async (lenderId: string) => {
      addPendingLender(lenderId);
      const response = await apiRequest("POST", `/api/member/saved-lenders/${lenderId}`);
      return response.json();
    },
    onSuccess: (_, lenderId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/member/saved-lenders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/member/stats"] });
      toast({
        title: "Lender Saved",
        description: "Lender has been added to your saved list.",
      });
      removePendingLender(lenderId);
    },
    onError: (error: any, lenderId) => {
      removePendingLender(lenderId);
      const msg = error?.message || '';
      if (msg.includes('SAVED_LENDER_QUOTA_EXCEEDED')) {
        toast({
          title: "Monthly Limit Reached",
          description: "You've reached your 2 saved lenders for the month. Upgrade for unlimited lender saving.",
          variant: "destructive",
          action: (
            <a href="/pricing" className="underline font-medium whitespace-nowrap">Upgrade Now</a>
          ) as any,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to save lender. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  const unsaveLenderMutation = useMutation({
    mutationFn: async (lenderId: string) => {
      addPendingLender(lenderId);
      const response = await apiRequest("DELETE", `/api/member/saved-lenders/${lenderId}`);
      if (!response.ok) throw new Error("Failed to remove lender");
      return { success: true };
    },
    onSuccess: (_, lenderId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/member/saved-lenders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/member/stats"] });
      toast({
        title: "Lender Removed",
        description: "Lender has been removed from your saved list.",
      });
      removePendingLender(lenderId);
    },
    onError: (_, lenderId) => {
      toast({
        title: "Error",
        description: "Failed to remove lender. Please try again.",
        variant: "destructive",
      });
      removePendingLender(lenderId);
    },
  });

  const handleToggleSave = (lenderId: string) => {
    if (!user) {
      toast({
        title: "Sign in Required",
        description: "Please sign in to save lenders to your list.",
        variant: "destructive",
      });
      return;
    }

    if (pendingLenderIds.has(lenderId)) return;

    const isSaved = savedLenderIds.includes(lenderId);
    if (isSaved) {
      unsaveLenderMutation.mutate(lenderId);
    } else {
      saveLenderMutation.mutate(lenderId);
    }
  };

  const form = useForm<SearchForm>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      state: "any",
      loanType: "any",
      brokerOrDirectLender: "any",
      fastestClosingTime: "any",
      offerNonTraditionalLending: "any",
      workWithNewInvestors: "any",
      minCreditScore: "any",
      offerDeferredPayment: "any",
      offerRolledPoints: "any",
      offer100PercentFunding: "any",
      offerMultiUnitFinancing: "any",
    },
  });

  const onSubmit = useCallback(async (data: SearchForm) => {
    setIsSearching(true);
    try {
      if (isDemoMode) {
        // In demo mode, return random subset of placeholder lenders
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
        const shuffled = [...PLACEHOLDER_LENDERS].sort(() => Math.random() - 0.5);
        const numResults = Math.floor(Math.random() * 3) + 3; // Return 3-5 lenders
        setSearchResults(shuffled.slice(0, numResults));
      } else {
        const response = await apiRequest("POST", "/api/search-lenders", data);
        const results = await response.json();
        setSearchResults(results);
      }
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [isDemoMode]);

  // Set form values from URL parameters and auto-submit when location changes
  useEffect(() => {
    // wouter's location hook only returns pathname, so use window.location.search for query params
    const queryString = window.location.search.substring(1); // Remove leading '?'
    
    // Reset ref when query is empty to allow same deep links to work again
    if (!queryString) {
      lastHandledQueryRef.current = '';
      return;
    }
    
    // Only handle if query string has changed
    if (queryString === lastHandledQueryRef.current) {
      return;
    }
    
    lastHandledQueryRef.current = queryString;
    
    const params = new URLSearchParams(queryString);
    const state = params.get('state');
    const loanType = params.get('loanType');

    const hasParams = state || loanType;
    
    if (hasParams) {
      // Reset form with all values at once to avoid race conditions
      form.reset({
        state: state || 'any',
        loanType: loanType || 'any',
        brokerOrDirectLender: 'any',
        fastestClosingTime: 'any',
        offerNonTraditionalLending: 'any',
        workWithNewInvestors: 'any',
        minCreditScore: 'any',
        offerDeferredPayment: 'any',
        offerRolledPoints: 'any',
        offer100PercentFunding: 'any',
        offerMultiUnitFinancing: 'any',
      });

      // Submit search after form state has settled
      queueMicrotask(() => {
        void form.handleSubmit(onSubmit)();
      });
    }
  }, [location, form, onSubmit]);

  return (
    <Layout>
      <SEO 
        title="Real Estate Investment Lenders"
        description="Find real estate investment lenders, compare loan options, and connect with funding sources for fix and flip, DSCR, and wholesale deals."
        canonicalUrl="https://redatametrix.com/lenders"
      />
      <LendersPageSchema />
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-primary mb-4">Real Estate Investment Lenders for Every Deal Type</h1>
          <div className="h-1 w-32 bg-accent mx-auto mb-6"></div>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-3">
            <strong><em>real estate investment lenders</em></strong> matched to your deal type, experience level, and financing needs so you can secure funding faster and with better terms.
          </p>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-8">
            Search, compare, and connect with verified lenders offering hard money, DSCR, transactional funding, and other creative financing solutions for fix and flip and wholesale deals.
          </p>
        </div>

        {/* Search Form */}
        <Card className="p-4 sm:p-8 mb-12">
          <h2 className="text-2xl font-semibold text-primary mb-6">Search for Lenders</h2>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Property State */}
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Property State</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-search-state">
                            <SelectValue placeholder="Any" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="any">Any</SelectItem>
                          <SelectItem value="AL">Alabama</SelectItem>
                          <SelectItem value="AK">Alaska</SelectItem>
                          <SelectItem value="AZ">Arizona</SelectItem>
                          <SelectItem value="AR">Arkansas</SelectItem>
                          <SelectItem value="CA">California</SelectItem>
                          <SelectItem value="CO">Colorado</SelectItem>
                          <SelectItem value="CT">Connecticut</SelectItem>
                          <SelectItem value="DE">Delaware</SelectItem>
                          <SelectItem value="FL">Florida</SelectItem>
                          <SelectItem value="GA">Georgia</SelectItem>
                          <SelectItem value="HI">Hawaii</SelectItem>
                          <SelectItem value="ID">Idaho</SelectItem>
                          <SelectItem value="IL">Illinois</SelectItem>
                          <SelectItem value="IN">Indiana</SelectItem>
                          <SelectItem value="IA">Iowa</SelectItem>
                          <SelectItem value="KS">Kansas</SelectItem>
                          <SelectItem value="KY">Kentucky</SelectItem>
                          <SelectItem value="LA">Louisiana</SelectItem>
                          <SelectItem value="ME">Maine</SelectItem>
                          <SelectItem value="MD">Maryland</SelectItem>
                          <SelectItem value="MA">Massachusetts</SelectItem>
                          <SelectItem value="MI">Michigan</SelectItem>
                          <SelectItem value="MN">Minnesota</SelectItem>
                          <SelectItem value="MS">Mississippi</SelectItem>
                          <SelectItem value="MO">Missouri</SelectItem>
                          <SelectItem value="MT">Montana</SelectItem>
                          <SelectItem value="NE">Nebraska</SelectItem>
                          <SelectItem value="NV">Nevada</SelectItem>
                          <SelectItem value="NH">New Hampshire</SelectItem>
                          <SelectItem value="NJ">New Jersey</SelectItem>
                          <SelectItem value="NM">New Mexico</SelectItem>
                          <SelectItem value="NY">New York</SelectItem>
                          <SelectItem value="NC">North Carolina</SelectItem>
                          <SelectItem value="ND">North Dakota</SelectItem>
                          <SelectItem value="OH">Ohio</SelectItem>
                          <SelectItem value="OK">Oklahoma</SelectItem>
                          <SelectItem value="OR">Oregon</SelectItem>
                          <SelectItem value="PA">Pennsylvania</SelectItem>
                          <SelectItem value="RI">Rhode Island</SelectItem>
                          <SelectItem value="SC">South Carolina</SelectItem>
                          <SelectItem value="SD">South Dakota</SelectItem>
                          <SelectItem value="TN">Tennessee</SelectItem>
                          <SelectItem value="TX">Texas</SelectItem>
                          <SelectItem value="UT">Utah</SelectItem>
                          <SelectItem value="VT">Vermont</SelectItem>
                          <SelectItem value="VA">Virginia</SelectItem>
                          <SelectItem value="WA">Washington</SelectItem>
                          <SelectItem value="WV">West Virginia</SelectItem>
                          <SelectItem value="WI">Wisconsin</SelectItem>
                          <SelectItem value="WY">Wyoming</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Loan Type */}
                <FormField
                  control={form.control}
                  name="loanType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Loan Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-search-loan-type">
                            <SelectValue placeholder="Any" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="any">Any</SelectItem>
                          <SelectItem value="conventional">Conventional</SelectItem>
                          <SelectItem value="dscr">DSCR</SelectItem>
                          <SelectItem value="hard_money">Hard Money / Bridge</SelectItem>
                          <SelectItem value="new_construction">New Construction / Ground-Up</SelectItem>
                          <SelectItem value="fha_va">FHA/VA</SelectItem>
                          <SelectItem value="portfolio">Portfolio / Blanket</SelectItem>
                          <SelectItem value="arm">5/1 ARM</SelectItem>
                          <SelectItem value="balloon">Balloon</SelectItem>
                          <SelectItem value="interest_only">Interest-Only</SelectItem>
                          <SelectItem value="transactional">Transactional Funding</SelectItem>
                          <SelectItem value="private-seller">Private/Seller Financing</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Are you a direct lender or broker? */}
                <FormField
                  control={form.control}
                  name="brokerOrDirectLender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Direct Lender or Broker</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-search-broker-or-lender">
                            <SelectValue placeholder="Any" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="any">Any</SelectItem>
                          <SelectItem value="Lender">Lender</SelectItem>
                          <SelectItem value="Broker">Broker</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* What is the fastest you can close a loan? */}
                <FormField
                  control={form.control}
                  name="fastestClosingTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Fastest Closing Time</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-search-closing-time">
                            <SelectValue placeholder="Any" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="any">Any</SelectItem>
                          <SelectItem value="1-7 DAYS">1-7 DAYS</SelectItem>
                          <SelectItem value="8-14 DAYS">8-14 DAYS</SelectItem>
                          <SelectItem value="15-21 DAYS">15-21 DAYS</SelectItem>
                          <SelectItem value="22-30 DAYS">22-30 DAYS</SelectItem>
                          <SelectItem value="More than 30 days">More than 30 days</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 7 boolean filter fields - collapsible on mobile */}
                <div className={`${showMoreFilters ? "contents" : "hidden"} md:contents`} data-testid="more-filters-fields">
                {/* Do you offer non-traditional / creative lending? */}
                <FormField
                  control={form.control}
                  name="offerNonTraditionalLending"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Non-Traditional Lending</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-search-non-traditional">
                            <SelectValue placeholder="Any" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="any">Any</SelectItem>
                          <SelectItem value="Yes">Yes</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Do you work with new investors? */}
                <FormField
                  control={form.control}
                  name="workWithNewInvestors"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Works with New Investors</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-search-new-investors">
                            <SelectValue placeholder="Any" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="any">Any</SelectItem>
                          <SelectItem value="Yes">Yes</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* What is the minimum credit score you will work with? */}
                <FormField
                  control={form.control}
                  name="minCreditScore"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Minimum Credit Score</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-search-min-credit">
                            <SelectValue placeholder="Any" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="any">Any</SelectItem>
                          <SelectItem value="Below 600">Below 600</SelectItem>
                          <SelectItem value="600-649">600-649</SelectItem>
                          <SelectItem value="650-699">650-699</SelectItem>
                          <SelectItem value="700+">700+</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Do you offer deferred payment loans? */}
                <FormField
                  control={form.control}
                  name="offerDeferredPayment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Deferred Payment Loans</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-search-deferred-payment">
                            <SelectValue placeholder="Any" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="any">Any</SelectItem>
                          <SelectItem value="Yes">Yes</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Do you offer rolled / points on the back? */}
                <FormField
                  control={form.control}
                  name="offerRolledPoints"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Rolled Points on Back</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-search-rolled-points">
                            <SelectValue placeholder="Any" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="any">Any</SelectItem>
                          <SelectItem value="Yes">Yes</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Do you offer 100% funding of both the purchase and the rehab? */}
                <FormField
                  control={form.control}
                  name="offer100PercentFunding"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">100% Funding</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-search-100-percent-funding">
                            <SelectValue placeholder="Any" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="any">Any</SelectItem>
                          <SelectItem value="Yes">Yes</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Do you offer financing on multi-unit properties? (5+ units) */}
                <FormField
                  control={form.control}
                  name="offerMultiUnitFinancing"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Multi-Unit Financing (5+)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-search-multi-unit">
                            <SelectValue placeholder="Any" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="any">Any</SelectItem>
                          <SelectItem value="Yes">Yes</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                </div>
              </div>

              {/* Mobile-only "More Filters" toggle */}
              <div className="md:hidden flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full min-h-11"
                  onClick={() => setShowMoreFilters((prev) => !prev)}
                  data-testid="button-toggle-more-filters"
                >
                  {showMoreFilters ? "Hide Filters" : "More Filters"}
                </Button>
              </div>

              <div className="flex justify-center">
                <Button
                  type="submit"
                  className="w-full md:w-auto min-h-11 sm:min-h-9 bg-accent text-accent-foreground hover:bg-accent/90"
                  data-testid="button-search-lenders"
                  disabled={isSearching}
                >
                  <Search className="h-4 w-4 mr-2" />
                  {isSearching ? "Searching..." : "Search Lenders"}
                </Button>
              </div>
            </form>
          </Form>
        </Card>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-primary mb-6">Search Results (Top {Math.min(searchResults.length, 3)})</h2>
            <div className="space-y-6">
              {searchResults.slice(0, 3).map((lender) => {
                const isSaved = savedLenderIds.includes(lender.id);
                const isThisLenderPending = pendingLenderIds.has(lender.id);
                
                return (
                  <Card key={lender.id} className="p-6" data-testid={`card-lender-${lender.id}`}>
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-2xl font-semibold text-primary mb-2 break-words" data-testid={`text-company-name-${lender.id}`}>
                            {lender.companyName || "Lender"}
                          </h3>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleSave(lender.id)}
                            disabled={isThisLenderPending}
                            className={`flex-shrink-0 min-h-11 min-w-11 sm:min-h-9 sm:min-w-9 ${isSaved ? 'text-destructive hover:text-destructive/80' : 'text-muted-foreground hover:text-destructive'}`}
                            data-testid={`button-save-lender-${lender.id}`}
                          >
                            <Heart className={`h-5 w-5 ${isSaved ? 'fill-current' : ''}`} />
                          </Button>
                        </div>
                        <div className="space-y-1 text-muted-foreground">
                          {lender.contactName && (
                            <p data-testid={`text-contact-name-${lender.id}`}>
                              <span className="font-medium">Contact:</span> {lender.contactName}
                            </p>
                          )}
                          {lender.phone && (
                            <p data-testid={`text-phone-${lender.id}`}>
                              <span className="font-medium">Phone:</span> {lender.phone}
                            </p>
                          )}
                          {lender.email && (
                            <p className="break-all" data-testid={`text-email-${lender.id}`}>
                              <span className="font-medium">Email:</span> {lender.email}
                            </p>
                          )}
                          {lender.website && (
                            <p className="break-all" data-testid={`text-website-${lender.id}`}>
                              <span className="font-medium">Website:</span>{" "}
                              <a
                                href={lender.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-accent hover:underline"
                              >
                                {lender.website}
                              </a>
                            </p>
                          )}
                        </div>
                        {lender.companyDescription && (
                          <p className="mt-4 text-foreground break-words" data-testid={`text-description-${lender.id}`}>
                            {lender.companyDescription}
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0 w-full md:w-auto">
                        {lender.referralLink ? (
                          <a
                            href={lender.referralLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full sm:w-auto"
                            data-testid={`button-contact-lender-${lender.id}`}
                          >
                            <Button className="w-full sm:w-auto min-h-11 sm:min-h-9 bg-accent text-accent-foreground hover:bg-accent/90">
                              Contact the Lender
                              <ExternalLink className="ml-2 h-4 w-4" />
                            </Button>
                          </a>
                        ) : (
                          <Button
                            disabled
                            data-testid={`button-contact-lender-${lender.id}`}
                            className="w-full sm:w-auto min-h-11 sm:min-h-9 bg-muted text-muted-foreground"
                          >
                            No Referral Link
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* No Results Message */}
        {!isSearching && searchResults.length === 0 && form.formState.isSubmitted && (
          <Card className="p-8 text-center">
            <p className="text-lg text-muted-foreground">
              No lenders found matching your criteria. Try adjusting your search filters.
            </p>
          </Card>
        )}

        {/* Loan Types Education Section */}
        <Card className="p-4 sm:p-8 mb-12" data-testid="section-loan-types">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-accent" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-primary">Understanding Loan Types</h2>
              <p className="text-muted-foreground">Learn about different financing options for your investments</p>
            </div>
          </div>

          <Accordion type="single" collapsible className="space-y-2">
            {loanTypesData.map((loanType) => (
              <AccordionItem key={loanType.id} value={loanType.id} className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline py-4" data-testid={`accordion-${loanType.id}`}>
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      {loanType.icon}
                    </div>
                    <span className="font-semibold text-primary">{loanType.name}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div className="space-y-4 pl-4 sm:pl-13">
                    <p className="text-muted-foreground">{loanType.description}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div className="bg-muted/50 rounded-lg p-3">
                        <div className="text-muted-foreground text-xs">Interest Rate</div>
                        <div className="font-medium">{loanType.terms.rate}</div>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <div className="text-muted-foreground text-xs">Loan Term</div>
                        <div className="font-medium">{loanType.terms.term}</div>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <div className="text-muted-foreground text-xs">Down Payment</div>
                        <div className="font-medium">{loanType.terms.down}</div>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <div className="text-muted-foreground text-xs">Closing Time</div>
                        <div className="font-medium">{loanType.terms.closing}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                          <CheckCircle className="h-4 w-4 text-emerald-600" /> Advantages
                        </h4>
                        <ul className="space-y-1">
                          {loanType.pros.map((pro, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-emerald-600 mt-1">•</span>
                              <span>{pro}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                          <XCircle className="h-4 w-4 text-destructive" /> Considerations
                        </h4>
                        <ul className="space-y-1">
                          {loanType.cons.map((con, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-destructive mt-1">•</span>
                              <span>{con}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="mt-6 pt-4 border-t">
            <Link href="/loan-types">
              <Button variant="outline" className="w-full md:w-auto min-h-11 sm:min-h-9" data-testid="button-view-all-loan-types">
                View All Loan Types with Full Details
              </Button>
            </Link>
            <p className="text-sm text-muted-foreground mt-3">
              Not sure which loan fits your deal? <a href="/loan-types" className="text-primary hover:underline">Explore all real estate loan types</a> to find the best financing strategy.
            </p>
          </div>
        </Card>

        {/* SEO Content Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-primary mb-4">How to Find the Right Lender for Your Deal</h2>
          <p className="text-muted-foreground mb-6">
            Choosing the right lender can significantly impact your profitability, timeline, and overall investment success. Our platform helps you quickly identify lenders that align with your strategy and deal structure.
          </p>

          <h3 className="text-xl font-semibold text-primary mb-2">Filter by Loan Type and Criteria</h3>
          <p className="text-muted-foreground mb-6">
            Search lenders based on loan type, funding speed, credit requirements, and other key criteria to find options that fit your deal.
          </p>

          <h3 className="text-xl font-semibold text-primary mb-2">Compare Financing Options</h3>
          <p className="text-muted-foreground mb-6">
            Evaluate multiple lenders side by side to understand differences in rates, terms, and flexibility.
          </p>

          <h3 className="text-xl font-semibold text-primary mb-2">Connect Directly with Verified Lenders</h3>
          <p className="text-muted-foreground">
            Submit applications and connect with lenders who are actively funding deals like yours.
          </p>
        </section>

        {/* Call to Action - Only show for non-subscribers */}
        {!isSubscriber && (
          <Card className="p-6 sm:p-12 bg-gradient-to-br from-primary to-primary/90 text-primary-foreground text-center">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">Ready to Connect with Our Lender Network?</h2>
            <p className="text-base sm:text-lg text-primary-foreground/80 mb-6 max-w-2xl mx-auto">
              Create a free account to access deal analysis tools and connect with verified lenders.
            </p>
            <Button 
              className="w-full sm:w-auto min-h-11 sm:min-h-10 bg-accent text-accent-foreground hover:bg-accent/90"
              size="lg"
              onClick={() => setLocation('/pricing')}
            >
              Get Started Free
            </Button>
          </Card>
        )}
      </div>
    </Layout>
  );
}
