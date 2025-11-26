import { Building2, Users, Wrench, Target, MapPin, Calculator, BarChart3, Search, Layers } from "lucide-react";

export interface AffiliateProgram {
  id: string;
  name: string;
  icon: any;
  description: string;
  benefits: string[];
  referralLink: string;
  categories: string[];
}

export const affiliatePrograms: AffiliateProgram[] = [
  {
    id: "connected-investors",
    name: "Connected Investors",
    icon: Users,
    description: "Network with thousands of active real estate investors, find deals, connect with private lenders, and access funding opportunities in one centralized platform.",
    benefits: [
      "Access nationwide deal marketplace",
      "Connect with private money lenders",
      "Network with 200,000+ investors",
      "Find buyers, sellers, and partners"
    ],
    referralLink: "https://connectedinvestors.com",
    categories: ["marketplace", "lead-generation", "comps"]
  },
  {
    id: "padsplit",
    name: "Padsplit",
    icon: Building2,
    description: "Turn single-family homes into affordable co-living rentals. Rent individual rooms to increase cash flow while Padsplit handles tenant management and operations.",
    benefits: [
      "Increase rental income by 2-3x",
      "Professional tenant screening",
      "Automated rent collection",
      "Property management support"
    ],
    referralLink: "https://padsplit.com",
    categories: ["marketplace", "property-management"]
  },
  {
    id: "bigger-pockets",
    name: "Bigger Pockets",
    icon: Users,
    description: "Join the largest real estate investing community with active forums, educational resources, podcasts, and a marketplace to connect with investors nationwide.",
    benefits: [
      "Access to 3+ million investors",
      "Educational resources and podcasts",
      "Active forums and networking",
      "Deal analysis calculators"
    ],
    referralLink: "https://biggerpockets.com",
    categories: ["marketplace"]
  },
  {
    id: "buildium",
    name: "Buildium",
    icon: Building2,
    description: "Comprehensive property management software for landlords and property managers. Streamline rent collection, maintenance, accounting, and tenant communication.",
    benefits: [
      "Online rent collection and payments",
      "Maintenance request tracking",
      "Accounting and financial reporting",
      "Tenant screening and leasing"
    ],
    referralLink: "https://buildium.com",
    categories: ["property-management"]
  },
  {
    id: "flipper-force",
    name: "Flipper Force",
    icon: Wrench,
    description: "Project management platform designed specifically for house flippers. Track rehab budgets, manage contractors, monitor timelines, and control costs from one dashboard.",
    benefits: [
      "Detailed rehab budget tracking",
      "Contractor management tools",
      "Timeline and milestone tracking",
      "Real-time cost monitoring"
    ],
    referralLink: "https://flipperforce.com",
    categories: ["project-management"]
  },
  {
    id: "deal-machine",
    name: "Deal Machine",
    icon: Target,
    description: "Drive-for-dollars app that helps investors find off-market properties, skip trace owner information, and send direct mail campaigns to motivated sellers.",
    benefits: [
      "Mobile driving-for-dollars",
      "Built-in skip tracing",
      "Direct mail campaign automation",
      "Deal pipeline management"
    ],
    referralLink: "https://dealmachine.com",
    categories: ["lead-generation", "comps"]
  },
  {
    id: "propstream",
    name: "Propstream",
    icon: MapPin,
    description: "Comprehensive property research platform providing detailed property data, ownership information, comparables, and pre-foreclosure lists for investment analysis.",
    benefits: [
      "50+ property data filters",
      "Nationwide MLS comps",
      "Pre-foreclosure and probate lists",
      "Marketing list building tools"
    ],
    referralLink: "https://propstream.com",
    categories: ["comps"]
  },
  {
    id: "privy",
    name: "Privy",
    icon: MapPin,
    description: "Real estate data and lead generation platform offering property valuations, comparables, and tools to identify motivated sellers and off-market opportunities.",
    benefits: [
      "Instant property valuations",
      "Comparable sales analysis",
      "Motivated seller identification",
      "Deal profitability calculator"
    ],
    referralLink: "https://privy.com",
    categories: ["comps"]
  },
  {
    id: "rehab-valuator",
    name: "Rehab Valuator",
    icon: Calculator,
    description: "Deal analysis and rehab estimating software for real estate investors. Calculate ARV, estimate repair costs, analyze deals, and generate professional reports.",
    benefits: [
      "Quick deal analysis calculator",
      "Detailed rehab cost estimator",
      "Professional PDF reports",
      "Wholesale and flip analysis"
    ],
    referralLink: "https://rehabvaluator.com",
    categories: ["project-management", "comps"]
  },
  {
    id: "dealcheck",
    name: "DealCheck",
    icon: Calculator,
    description: "Investment property analysis app for evaluating rental properties, flips, BRRRR deals, and multifamily investments with detailed financial projections.",
    benefits: [
      "Analyze any property in minutes",
      "BRRRR and flip calculators",
      "Rental cash flow analysis",
      "Comp data and ARV estimates"
    ],
    referralLink: "https://dealcheck.io",
    categories: ["comps", "project-management"]
  },
  {
    id: "flipster",
    name: "Flipster",
    icon: BarChart3,
    description: "All-in-one CRM and deal analysis platform for house flippers. Manage leads, analyze deals, track projects, and build a profitable flipping business.",
    benefits: [
      "Built-in deal analyzer",
      "Lead and contact CRM",
      "Marketing campaign tools",
      "Mobile app access"
    ],
    referralLink: "https://flipster.com",
    categories: ["project-management", "lead-generation"]
  },
  {
    id: "reikit",
    name: "REIkit",
    icon: BarChart3,
    description: "Comprehensive real estate investor CRM with property analytics, marketing automation, and website builder. Manage your entire investing business from one platform.",
    benefits: [
      "Property analytics and data",
      "CRM with deal tracking",
      "Marketing automation",
      "Investor website builder"
    ],
    referralLink: "https://reikit.com",
    categories: ["lead-generation", "comps"]
  },
  {
    id: "motivated-sellers",
    name: "MotivatedSellers",
    icon: Search,
    description: "Skip tracing and list building platform for real estate investors. Find motivated seller contact information and build targeted marketing lists.",
    benefits: [
      "Accurate skip tracing data",
      "Pre-built motivated seller lists",
      "List stacking capabilities",
      "Direct mail integration"
    ],
    referralLink: "https://motivatedsellers.com",
    categories: ["lead-generation"]
  },
  {
    id: "freedomsoft",
    name: "FreedomSoft",
    icon: Layers,
    description: "All-in-one real estate investing software with CRM, marketing automation, website builder, and lead management tools for wholesalers and investors.",
    benefits: [
      "CRM with workflow automation",
      "Built-in marketing campaigns",
      "Mobile app with team features",
      "Investor website builder"
    ],
    referralLink: "https://freedomsoft.com",
    categories: ["lead-generation", "marketplace"]
  },
  {
    id: "resimpli",
    name: "REsimpli",
    icon: Layers,
    description: "All-in-one CRM designed for real estate wholesalers with skip tracing, marketing automation, KPI tracking, and team collaboration tools.",
    benefits: [
      "Built-in skip tracing",
      "SMS and email campaigns",
      "Team collaboration features",
      "Detailed KPI dashboards"
    ],
    referralLink: "https://resimpli.com",
    categories: ["lead-generation"]
  },
  {
    id: "batchleads",
    name: "BatchLeads",
    icon: Target,
    description: "Property data and lead generation platform with skip tracing, list building, driving for dollars, and direct mail capabilities for real estate investors.",
    benefits: [
      "Driving for dollars mobile app",
      "Skip tracing integration",
      "Direct mail campaigns",
      "Property data and filters"
    ],
    referralLink: "https://batchleads.io",
    categories: ["lead-generation", "comps"]
  }
];

export const categoryInfo = {
  marketplace: {
    name: "Marketplace & Community",
    description: "Connect with investors, find deals, and access a nationwide network of real estate professionals."
  },
  "property-management": {
    name: "Property Management",
    description: "Tools to streamline operations, manage tenants, and maximize rental property performance."
  },
  "project-management": {
    name: "Project Management & Rehab",
    description: "Track renovation budgets, manage contractors, and control rehab timelines and costs."
  },
  "lead-generation": {
    name: "Lead Generation & Marketing",
    description: "Find off-market deals, connect with motivated sellers, and build your deal pipeline."
  },
  "comps": {
    name: "Comps & Market Data",
    description: "Access comprehensive property data, comparables, and market intelligence for smarter investing."
  }
};
