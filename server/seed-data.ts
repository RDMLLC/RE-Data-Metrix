/**
 * Seed Data for RE Data Metrix
 * 
 * This file contains all baseline data for affiliates, affiliate categories,
 * lenders, and loan products. Run the seed function to populate an empty database.
 * 
 * Note: Lenders contain test data - update with real lender info for production.
 */

export interface SeedAffiliate {
  id: string;
  name: string;
  description: string;
  benefits: string[];
  referralLink: string;
  categories: string[];
  features: string[];
  iconName: string;
  isActive: boolean;
  sortOrder: number;
}

export interface SeedAffiliateCategory {
  id: string;
  name: string;
  description: string;
  sortOrder: number;
}

export interface SeedLender {
  id: string;
  companyName: string;
  email: string;
  contactName: string;
  phone?: string;
  website?: string;
  companyDescription?: string;
  referralLink?: string;
  referralAmount?: string;
  referralType?: string;
  isPreferred: boolean;
  inviteAccepted: boolean;
}

export interface SeedLoanProduct {
  id: string;
  lenderId: string;
  productName: string;
  loanType: string;
  newInvestorOk: boolean;
  minCreditScore?: number;
  maxLtvBuy?: string;
  maxLendRehab?: string;
  interestRate?: string;
  interestDeferred: boolean;
  drawnFundsOnly: boolean;
  points?: string;
  pointsDeferred: boolean;
  maxLoanArv?: string;
  appraisalRequired: boolean;
  estimatedAppraisalCost?: string;
  fees?: string;
  costPerDraw?: string;
  isActive: boolean;
  timeToClose?: number;
  cashOutOk: boolean;
  cashOutMaxLtv?: string;
  referralLink?: string;
  loanTermYears?: number;
  minDscrRequired?: string;
  isLtcWeighted: boolean;
  maxLtcPercent?: string;
}

export const seedAffiliateCategories: SeedAffiliateCategory[] = [
  // Primary business categories
  {
    id: "marketplace",
    name: "Marketplace & Community",
    description: "Connect with investors, find deals, and access a nationwide network of real estate professionals.",
    sortOrder: 1
  },
  {
    id: "property-management",
    name: "Property Management",
    description: "Tools to streamline operations, manage tenants, and maximize rental property performance.",
    sortOrder: 2
  },
  {
    id: "project-management",
    name: "Project Management & Rehab",
    description: "Track renovation budgets, manage contractors, and control rehab timelines and costs.",
    sortOrder: 3
  },
  {
    id: "lead-generation",
    name: "Lead Generation & Marketing",
    description: "Find off-market deals, connect with motivated sellers, and build your deal pipeline.",
    sortOrder: 4
  },
  {
    id: "comps",
    name: "Comps & Market Data",
    description: "Access comprehensive property data, comparables, and market intelligence for smarter investing.",
    sortOrder: 5
  },
  {
    id: "mls-access",
    name: "MLS Access",
    description: "Access MLS listings and data without a real estate license through investor-friendly platforms.",
    sortOrder: 6
  },
  {
    id: "legal",
    name: "Legal",
    description: "Legal services, contracts, entity formation, and compliance resources for real estate investors.",
    sortOrder: 7
  },
  // Tool capabilities (formerly "features")
  {
    id: "driving-for-dollars",
    name: "Driving for Dollars",
    description: "Mobile tools for finding distressed properties while driving neighborhoods.",
    sortOrder: 8
  },
  {
    id: "direct-mail",
    name: "Direct Mail",
    description: "Automated direct mail campaigns to reach motivated sellers.",
    sortOrder: 9
  },
  {
    id: "skip-tracing",
    name: "Skip Tracing",
    description: "Find property owner contact information and track down hard-to-reach sellers.",
    sortOrder: 10
  },
  {
    id: "list-building",
    name: "List Building",
    description: "Build targeted lists of properties and owners for marketing campaigns.",
    sortOrder: 11
  },
  {
    id: "crm",
    name: "CRM",
    description: "Customer relationship management to track leads and deals.",
    sortOrder: 12
  },
  {
    id: "deal-analysis",
    name: "Deal Analysis",
    description: "Calculate profitability, ROI, and analyze investment opportunities.",
    sortOrder: 14
  },
  {
    id: "mobile-app",
    name: "Mobile App",
    description: "Access tools on-the-go with dedicated mobile applications.",
    sortOrder: 15
  },
  {
    id: "team-collaboration",
    name: "Team Collaboration",
    description: "Share deals, tasks, and communicate with team members.",
    sortOrder: 16
  },
  {
    id: "marketing-automation",
    name: "Marketing Automation",
    description: "Automated marketing workflows and campaign management.",
    sortOrder: 17
  },
  {
    id: "rehab-cost-estimating",
    name: "Rehab Cost Estimating",
    description: "Estimate renovation costs and create detailed rehab budgets.",
    sortOrder: 18
  },
  {
    id: "website-landing-page",
    name: "Website/Landing Page",
    description: "Build investor websites and landing pages for lead capture.",
    sortOrder: 19
  },
  {
    id: "virtual-driving",
    name: "Virtual Driving",
    description: "Find distressed properties using satellite imagery without physical driving.",
    sortOrder: 20
  },
  {
    id: "sms",
    name: "SMS",
    description: "Text messaging campaigns and automation for reaching property owners.",
    sortOrder: 21
  }
];

export const seedAffiliates: SeedAffiliate[] = [
  {
    id: "0bcdfb8f-d92e-4789-a1d5-725533982b65",
    name: "Propstream",
    description: "Comprehensive property research platform providing detailed property data, ownership information, comparables, and pre-foreclosure lists for investment analysis.",
    benefits: ["50+ property data filters", "Nationwide MLS comps", "Pre-foreclosure and probate lists", "Marketing list building tools"],
    referralLink: "https://propstream.com",
    categories: ["comps", "direct-mail", "skip-tracing", "list-building", "deal-analysis", "website-landing-page", "mls-access", "virtual-driving"],
    features: [],
    iconName: "MapPin",
    isActive: true,
    sortOrder: 1
  },
  {
    id: "2823df97-9c2e-4500-b9d7-c141500d683c",
    name: "Connected Investors",
    description: "Network with thousands of active real estate investors, find deals, connect with private lenders, and access funding opportunities in one centralized platform.",
    benefits: ["Access nationwide deal marketplace", "Connect with private money lenders", "Network with 200,000+ investors", "Find buyers, sellers, and partners"],
    referralLink: "https://connectedinvestors.com",
    categories: ["marketplace", "lead-generation", "comps", "list-building", "team-collaboration"],
    features: [],
    iconName: "Users",
    isActive: true,
    sortOrder: 1
  },
  {
    id: "49d657dc-cad6-4729-abd8-4cceec7baf7e",
    name: "Padsplit",
    description: "Turn single-family homes into affordable co-living rentals. Rent individual rooms to increase cash flow while Padsplit handles tenant management and operations.",
    benefits: ["Increase rental income by 2-3x", "Professional tenant screening", "Automated rent collection", "Property management support"],
    referralLink: "https://padsplit.com",
    categories: ["marketplace", "property-management"],
    features: [],
    iconName: "Building2",
    isActive: true,
    sortOrder: 2
  },
  {
    id: "2bf27db8-ab9a-49c6-b7af-415a9806d179",
    name: "Bigger Pockets",
    description: "Join the largest real estate investing community with active forums, educational resources, podcasts, and a marketplace to connect with investors nationwide.",
    benefits: ["Access to 3+ million investors", "Educational resources and podcasts", "Active forums and networking", "Deal analysis calculators"],
    referralLink: "https://biggerpockets.com",
    categories: ["marketplace", "deal-analysis", "team-collaboration"],
    features: [],
    iconName: "Users",
    isActive: true,
    sortOrder: 3
  },
  {
    id: "92790882-43cb-47f2-bd6b-2118131dac48",
    name: "Buildium",
    description: "Comprehensive property management software for landlords and property managers. Streamline rent collection, maintenance, accounting, and tenant communication.",
    benefits: ["Online rent collection and payments", "Maintenance request tracking", "Accounting and financial reporting", "Tenant screening and leasing"],
    referralLink: "https://buildium.com",
    categories: ["property-management", "team-collaboration"],
    features: [],
    iconName: "Building2",
    isActive: true,
    sortOrder: 4
  },
  {
    id: "933e4278-f77d-4307-ad23-ecf7d57be88c",
    name: "Flipper Force",
    description: "Project management platform designed specifically for house flippers. Track rehab budgets, manage contractors, monitor timelines, and control costs from one dashboard.",
    benefits: ["Detailed rehab budget tracking", "Contractor management tools", "Timeline and milestone tracking", "Real-time cost monitoring"],
    referralLink: "https://flipperforce.com",
    categories: ["project-management", "rehab-cost-estimating", "deal-analysis", "mobile-app"],
    features: [],
    iconName: "Wrench",
    isActive: true,
    sortOrder: 5
  },
  {
    id: "6dfa6ea3-e2dc-4a0b-b73e-5fd6e596d848",
    name: "Deal Machine",
    description: "Drive-for-dollars app that helps investors find off-market properties, skip trace owner information, and send direct mail campaigns to motivated sellers.",
    benefits: ["Mobile driving-for-dollars", "Built-in skip tracing", "Direct mail campaign automation", "Deal pipeline management"],
    referralLink: "https://dealmachine.com",
    categories: ["lead-generation", "comps", "driving-for-dollars", "direct-mail", "skip-tracing", "list-building", "crm", "mobile-app"],
    features: [],
    iconName: "Target",
    isActive: true,
    sortOrder: 6
  },
  {
    id: "d1856693-ba8a-4a9e-b6d2-766a439d1266",
    name: "Privy",
    description: "Real estate data and lead generation platform offering property valuations, comparables, and tools to identify motivated sellers and off-market opportunities.",
    benefits: ["Instant property valuations", "Comparable sales analysis", "Motivated seller identification", "Deal profitability calculator"],
    referralLink: "https://privy.com",
    categories: ["comps", "deal-analysis", "virtual-driving"],
    features: [],
    iconName: "MapPin",
    isActive: true,
    sortOrder: 8
  },
  {
    id: "c1ced7d9-9b88-49a3-aa29-1e1f3385e1df",
    name: "Rehab Valuator",
    description: "Deal analysis and rehab estimating software for real estate investors. Calculate ARV, estimate repair costs, analyze deals, and generate professional reports.",
    benefits: ["Quick deal analysis calculator", "Detailed rehab cost estimator", "Professional PDF reports", "Wholesale and flip analysis"],
    referralLink: "https://rehabvaluator.com",
    categories: ["project-management", "comps", "deal-analysis", "rehab-cost-estimating"],
    features: [],
    iconName: "Calculator",
    isActive: true,
    sortOrder: 9
  },
  {
    id: "718b4e1f-718b-4ebc-a62c-a1068af4981b",
    name: "DealCheck",
    description: "Investment property analysis app for evaluating rental properties, flips, BRRRR deals, and multifamily investments with detailed financial projections.",
    benefits: ["Analyze any property in minutes", "BRRRR and flip calculators", "Rental cash flow analysis", "Comp data and ARV estimates"],
    referralLink: "https://dealcheck.io",
    categories: ["comps", "project-management", "deal-analysis", "mobile-app"],
    features: [],
    iconName: "Calculator",
    isActive: true,
    sortOrder: 10
  },
  {
    id: "14febb4f-daa5-4133-9126-8300ea946f1a",
    name: "Flipster",
    description: "All-in-one CRM and deal analysis platform for house flippers. Manage leads, analyze deals, track projects, and build a profitable flipping business.",
    benefits: ["Built-in deal analyzer", "Lead and contact CRM", "Marketing campaign tools", "Mobile app access"],
    referralLink: "https://flipster.com",
    categories: ["project-management", "lead-generation", "crm", "deal-analysis", "mobile-app", "marketing-automation"],
    features: [],
    iconName: "BarChart3",
    isActive: true,
    sortOrder: 11
  },
  {
    id: "e45cd134-8d77-482a-83c1-6295c9ec2222",
    name: "REIkit",
    description: "Comprehensive real estate investor CRM with property analytics, marketing automation, and website builder. Manage your entire investing business from one platform.",
    benefits: ["Property analytics and data", "CRM with deal tracking", "Marketing automation", "Investor website builder"],
    referralLink: "https://reikit.com",
    categories: ["lead-generation", "comps", "crm", "marketing-automation", "website-landing-page"],
    features: [],
    iconName: "BarChart3",
    isActive: true,
    sortOrder: 12
  },
  {
    id: "7f09a5f1-4f8e-4232-8150-36f2a2a19b9e",
    name: "MotivatedSellers",
    description: "Skip tracing and list building platform for real estate investors. Find motivated seller contact information and build targeted marketing lists.",
    benefits: ["Accurate skip tracing data", "Pre-built motivated seller lists", "List stacking capabilities", "Direct mail integration"],
    referralLink: "https://motivatedsellers.com",
    categories: ["lead-generation", "skip-tracing", "list-building", "direct-mail"],
    features: [],
    iconName: "Search",
    isActive: true,
    sortOrder: 13
  },
  {
    id: "22cbf846-16d7-42b6-adb9-a80ccf0cf63b",
    name: "FreedomSoft",
    description: "All-in-one real estate investing software with CRM, marketing automation, website builder, and lead management tools for wholesalers and investors.",
    benefits: ["CRM with workflow automation", "Built-in marketing campaigns", "Mobile app with team features", "Investor website builder"],
    referralLink: "https://freedomsoft.com",
    categories: ["lead-generation", "marketplace", "crm", "mobile-app", "team-collaboration", "marketing-automation", "website-landing-page"],
    features: [],
    iconName: "Layers",
    isActive: true,
    sortOrder: 14
  },
  {
    id: "33f44d2c-7159-4d14-a7b0-921194d82e59",
    name: "REsimpli",
    description: "All-in-one CRM designed for real estate wholesalers with skip tracing, marketing automation, KPI tracking, and team collaboration tools.",
    benefits: ["Built-in skip tracing", "SMS and email campaigns", "Team collaboration features", "Detailed KPI dashboards"],
    referralLink: "https://resimpli.com",
    categories: ["lead-generation", "skip-tracing", "crm", "team-collaboration", "marketing-automation"],
    features: [],
    iconName: "Layers",
    isActive: true,
    sortOrder: 15
  },
  {
    id: "62d6fc1d-da9f-490a-8afa-e6c86b32ba69",
    name: "BatchLeads",
    description: "Property data and lead generation platform with skip tracing, list building, driving for dollars, and direct mail capabilities for real estate investors.",
    benefits: ["Driving for dollars mobile app", "Skip tracing integration", "Direct mail campaigns", "Property data and filters"],
    referralLink: "https://batchleads.io",
    categories: ["lead-generation", "comps", "driving-for-dollars", "direct-mail", "skip-tracing", "list-building", "mobile-app"],
    features: [],
    iconName: "Target",
    isActive: true,
    sortOrder: 16
  },
  {
    id: "a8c3f912-5e71-4b8a-9c2d-8f1e3a7b6c5d",
    name: "Carrot",
    description: "Real estate investor website builder and marketing platform. Generate motivated seller leads with SEO-optimized websites designed to convert visitors into leads.",
    benefits: ["SEO-optimized investor websites", "Motivated seller lead generation", "Landing page templates", "Lead capture and CRM integration"],
    referralLink: "https://carrot.com",
    categories: ["lead-generation", "marketing-automation", "website-landing-page"],
    features: [],
    iconName: "Leaf",
    isActive: true,
    sortOrder: 17
  }
];

export const seedLenders: SeedLender[] = [
  {
    id: "fc534287-a125-43ee-88e4-f671000819c7",
    companyName: "Finance of America Commercial",
    email: "james.gallagher@facolending.com",
    contactName: "Jim Gallagher",
    phone: "972-672-2756",
    website: "https://facolending.com/",
    companyDescription: "Nationwide Lender focused exclusively on the needs of Real Estate Investors",
    referralLink: "https://facolending.com/james-gallagher/",
    referralAmount: "0.50",
    referralType: "%",
    isPreferred: true,
    inviteAccepted: true
  }
];

export interface SeedTrainingVideo {
  id: string;
  title: string;
  description: string;
  youtubeUrl: string;
  thumbnailUrl?: string;
  isFeatured: boolean;
  isActive: boolean;
  sortOrder: number;
}

export const seedTrainingVideos: SeedTrainingVideo[] = [
  {
    id: "01d11c6e-b773-41f8-b821-50dd13b947b2",
    title: "How to use Deal Analysis",
    description: "Step by step tutorial",
    youtubeUrl: "https://youtu.be/m6SjKQ3dYe4",
    isFeatured: false,
    isActive: true,
    sortOrder: 0
  },
  {
    id: "966cff73-bd13-4507-98ba-b21d1e76ff3f",
    title: "D.S.C.R. Analysis Tutorial",
    description: "How to analyze a D.S.C.R. deal and find a loan that works best for you.",
    youtubeUrl: "https://youtu.be/K0mB1IYARKs",
    isFeatured: false,
    isActive: true,
    sortOrder: 1
  }
];

export const seedLoanProducts: SeedLoanProduct[] = [
  {
    id: "52b8cabc-ec95-4817-97b5-860abe92a68d",
    lenderId: "fc534287-a125-43ee-88e4-f671000819c7",
    productName: "Flip and Flip 680 Credit Score",
    loanType: "bridge",
    newInvestorOk: true,
    minCreditScore: 680,
    maxLtvBuy: "90.00",
    maxLendRehab: "100.00",
    interestRate: "10.50",
    interestDeferred: false,
    drawnFundsOnly: true,
    points: "1.50",
    pointsDeferred: false,
    maxLoanArv: "75.00",
    appraisalRequired: false,
    estimatedAppraisalCost: "750.00",
    fees: "995.00",
    costPerDraw: "300.00",
    isActive: true,
    cashOutOk: false,
    isLtcWeighted: false
  },
  {
    id: "14b17c13-dee3-40b8-8aff-1280eaca9cbe",
    lenderId: "fc534287-a125-43ee-88e4-f671000819c7",
    productName: "Flip and Flip 750 Credit Score",
    loanType: "bridge",
    newInvestorOk: true,
    minCreditScore: 740,
    maxLtvBuy: "90.00",
    maxLendRehab: "100.00",
    interestRate: "10.50",
    interestDeferred: false,
    drawnFundsOnly: true,
    points: "1.50",
    pointsDeferred: false,
    maxLoanArv: "75.00",
    appraisalRequired: true,
    estimatedAppraisalCost: "750.00",
    fees: "995.00",
    costPerDraw: "300.00",
    isActive: true,
    cashOutOk: false,
    isLtcWeighted: false
  },
  {
    id: "8c177bca-7d61-41d2-a3d3-516529913a91",
    lenderId: "fc534287-a125-43ee-88e4-f671000819c7",
    productName: "Fix and Flip 620",
    loanType: "bridge",
    newInvestorOk: false,
    minCreditScore: 620,
    maxLtvBuy: "80.00",
    maxLendRehab: "100.00",
    interestRate: "11.50",
    interestDeferred: false,
    drawnFundsOnly: true,
    points: "1.00",
    pointsDeferred: false,
    maxLoanArv: "70.00",
    appraisalRequired: true,
    estimatedAppraisalCost: "750.00",
    fees: "995.00",
    costPerDraw: "300.00",
    isActive: true,
    cashOutOk: false,
    isLtcWeighted: false
  },
  {
    id: "806bd402-e6c7-4407-85d4-89e14297a4e8",
    lenderId: "fc534287-a125-43ee-88e4-f671000819c7",
    productName: "Stabilized Bridge",
    loanType: "bridge",
    newInvestorOk: false,
    minCreditScore: 680,
    maxLtvBuy: "100.00",
    maxLendRehab: "100.00",
    interestRate: "10.50",
    interestDeferred: false,
    drawnFundsOnly: false,
    points: "1.50",
    pointsDeferred: false,
    appraisalRequired: true,
    estimatedAppraisalCost: "750.00",
    fees: "995.00",
    costPerDraw: "0.00",
    isActive: true,
    cashOutOk: false,
    isLtcWeighted: false
  },
  {
    id: "9656948b-cdf7-4474-9566-1e9b994773ab",
    lenderId: "fc534287-a125-43ee-88e4-f671000819c7",
    productName: "Ground Up New Construction",
    loanType: "bridge",
    newInvestorOk: false,
    minCreditScore: 680,
    maxLtvBuy: "75.00",
    maxLendRehab: "100.00",
    interestRate: "10.99",
    interestDeferred: false,
    drawnFundsOnly: true,
    points: "1.50",
    pointsDeferred: false,
    appraisalRequired: true,
    estimatedAppraisalCost: "750.00",
    fees: "995.00",
    costPerDraw: "300.00",
    isActive: true,
    cashOutOk: false,
    isLtcWeighted: false
  }
];
