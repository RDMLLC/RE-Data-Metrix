export interface GlossaryTerm {
  term: string;
  definition: string;
}

export interface GlossaryCategory {
  id: string;
  name: string;
  terms: GlossaryTerm[];
}

export const glossaryCategories: GlossaryCategory[] = [
  {
    id: "loan-financing",
    name: "Loan and Financing Terms",
    terms: [
      {
        term: "Amortization",
        definition: "Paying off a loan over time in regular installments."
      },
      {
        term: "APR (Annual Percentage Rate)",
        definition: "Total cost of borrowing, including interest and fees."
      },
      {
        term: "ARV (After-Repair Value)",
        definition: "Estimated property value after renovations."
      },
      {
        term: "DTI (Debt-to-Income Ratio)",
        definition: "Percentage of monthly gross income that goes toward debt payments."
      },
      {
        term: "LTV (Loan-to-Value)",
        definition: "Ratio of loan amount to property value."
      },
      {
        term: "Hard Money Loan",
        definition: "Short-term, asset-based loan typically for investors."
      },
      {
        term: "SBA 7(a)",
        definition: "Government-backed small business loan for property purchases."
      },
      {
        term: "DSCR (Debt Service Coverage Ratio)",
        definition: "Ratio of net operating income to total debt service."
      },
      {
        term: "Balloon Payment",
        definition: "Large final loan payment after regular installments."
      },
      {
        term: "Points",
        definition: "Upfront fees paid to reduce loan interest rates."
      }
    ]
  },
  {
    id: "investment-terms",
    name: "Real Estate Investment Terms",
    terms: [
      {
        term: "BRRRR",
        definition: "Buy, Rehab, Rent, Refinance, Repeat investment strategy."
      },
      {
        term: "1031 Exchange",
        definition: "Tax-deferral exchange for like-kind properties."
      },
      {
        term: "REIT (Real Estate Investment Trust)",
        definition: "Entity investing in real estate portfolios."
      },
      {
        term: "Cap Rate (Capitalization Rate)",
        definition: "Ratio of NOI to property price, indicating return."
      },
      {
        term: "NOI (Net Operating Income)",
        definition: "Income after operating expenses, before financing."
      },
      {
        term: "Gross Rent Multiplier (GRM)",
        definition: "Price-to-gross-rent ratio."
      },
      {
        term: "OpEx (Operating Expenses)",
        definition: "Costs to operate a property or portfolio."
      },
      {
        term: "Cash Flow",
        definition: "Net income after expenses and debt payments."
      }
    ]
  },
  {
    id: "ownership-transaction",
    name: "Ownership and Transaction Terms",
    terms: [
      {
        term: "FSBO (For Sale by Owner)",
        definition: "Property sold without an agent."
      },
      {
        term: "Comparable Sale (Comp)",
        definition: "Recently sold property used for value estimation."
      },
      {
        term: "Closing Costs",
        definition: "Expenses required to complete a real estate transaction."
      },
      {
        term: "Clear Title",
        definition: "Ownership free of liens or disputes."
      }
    ]
  },
  {
    id: "entity-legal",
    name: "Entity and Legal Terms",
    terms: [
      {
        term: "LLC (Limited Liability Company)",
        definition: "Legal entity providing liability protection for investors."
      },
      {
        term: "General Partner (GP) & Limited Partner (LP)",
        definition: "Management and investor roles in partnerships."
      },
      {
        term: "Ground Lease",
        definition: "Long-term lease of land, often for development."
      }
    ]
  },
  {
    id: "financial-analysis",
    name: "Financial Analysis and Metrics",
    terms: [
      {
        term: "IRR (Internal Rate of Return)",
        definition: "Measure of annualized return factoring time and cash flow."
      },
      {
        term: "ROI (Return on Investment)",
        definition: "Profit as a percentage of investment cost."
      },
      {
        term: "NPV (Net Present Value)",
        definition: "Present value of future cash flows minus investment cost."
      },
      {
        term: "Cash-on-Cash Return (CoC)",
        definition: "Annual return based on cash invested."
      },
      {
        term: "GRI (Gross Rental Income)",
        definition: "Total rental income before expenses."
      },
      {
        term: "FMV (Fair Market Value)",
        definition: "Realistic sale price under normal market conditions."
      },
      {
        term: "MIRR (Modified Internal Rate of Return)",
        definition: "Adjusted IRR considering financing and reinvestment rates."
      },
      {
        term: "Discounted Cash Flow (DCF)",
        definition: "Present value of all future expected cash flows."
      }
    ]
  },
  {
    id: "common-acronyms",
    name: "Common Acronyms",
    terms: [
      {
        term: "MLS (Multiple Listing Service)",
        definition: "Centralized database of listed properties."
      },
      {
        term: "PITI (Principal, Interest, Taxes, Insurance)",
        definition: "Components of a typical mortgage payment."
      },
      {
        term: "SFH (Single-Family Home)",
        definition: "Standalone residential unit."
      },
      {
        term: "CRE (Commercial Real Estate)",
        definition: "Property types used for business purposes."
      },
      {
        term: "NNN (Triple Net Lease)",
        definition: "Lease where tenant pays property taxes, insurance, and maintenance."
      }
    ]
  },
  {
    id: "miscellaneous",
    name: "Miscellaneous/Advanced Concepts",
    terms: [
      {
        term: "Appreciation",
        definition: "Increase in property value over time."
      },
      {
        term: "Equity",
        definition: "Value owned in property above the mortgage balance."
      },
      {
        term: "Foreclosure",
        definition: "Legal process by which lender takes ownership for nonpayment."
      },
      {
        term: "Retail Investor",
        definition: "Individual investing for personal account, not institution."
      },
      {
        term: "Rent-to-Own (RTO)",
        definition: "Arrangement blending rental and purchase agreements."
      },
      {
        term: "Concessions",
        definition: "Incentives or discounts used to attract tenants/buyers."
      }
    ]
  }
];
