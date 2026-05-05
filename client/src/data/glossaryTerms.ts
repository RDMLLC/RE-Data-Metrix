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
        definition: "Paying off a loan over time in regular installments that cover both principal and interest. In a fully amortized loan, each payment reduces the outstanding balance so the loan is paid off completely by the end of the term."
      },
      {
        term: "APR (Annual Percentage Rate)",
        definition: "The true annual cost of borrowing, expressed as a percentage. APR includes not just the interest rate but also fees, points, and other costs associated with the loan, making it a more complete measure of loan cost than the interest rate alone."
      },
      {
        term: "ARV (After-Repair Value)",
        definition: "The estimated market value of a property after all planned renovations have been completed. ARV is the foundational number in fix and flip investing — it determines how much a lender will fund, what your maximum offer price should be, and whether a deal is profitable. Calculated by analyzing recently sold comparable properties (comps) in the same area with similar size, condition, and features."
      },
      {
        term: "DTI (Debt-to-Income Ratio)",
        definition: "The percentage of a borrower's gross monthly income that goes toward paying debts. Calculated by dividing total monthly debt payments by gross monthly income. Traditional lenders use DTI to qualify borrowers; most conventional lenders prefer a DTI below 43%. DSCR loans bypass DTI requirements by qualifying based on the property's income instead."
      },
      {
        term: "LTV (Loan-to-Value)",
        definition: "A ratio comparing the loan amount to a property value benchmark, expressed as a percentage. In hard money lending, lenders typically quote two numbers — for example, 90/100 meaning they will lend 90% of the purchase price and 100% of the rehab budget — with an overall ARV cap (commonly 65-75% of After-Repair Value) that the combined loan cannot exceed. Some lenders additionally apply an LTC (Loan-to-Cost) cap based on total project cost (purchase + rehab combined). When this cap exists, it creates a sliding scale effect on purchase coverage: as rehab costs increase as a percentage of the total project, the effective percentage of the purchase price the lender will cover decreases in order to stay within the LTC ceiling. Important note on terminology: these terms are not standardized in the industry, particularly in private and hard money lending. Investors will frequently see LTV and LTC used interchangeably. Always ask your lender exactly what value they are using as the denominator — purchase price, total project cost, or ARV — when they quote you a ratio."
      },
      {
        term: "LTC (Loan-to-Cost)",
        definition: "The ratio of the loan amount to the total cost of the project, including purchase price and renovation budget. For example, a $207,500 loan on a project costing $250,000 total is 83% LTC. Some hard money lenders apply an LTC cap in addition to their ARV cap — the loan amount cannot exceed either. When an LTC cap is in effect, it creates a sliding scale: as rehab costs grow as a percentage of total project cost, the effective purchase coverage decreases. Note that LTV and LTC are frequently used interchangeably in the industry — always confirm with your lender which metric they are applying."
      },
      {
        term: "Hard Money Loan",
        definition: "A short-term, asset-based loan secured by real estate and funded by private lenders rather than banks. Hard money lenders focus primarily on the property's ARV rather than the borrower's credit score or income. Typical terms include 6-24 month loan periods, interest rates of 9-15%, and points of 1-3% paid at closing. Commonly used by fix and flip investors who need fast funding and flexible qualification criteria."
      },
      {
        term: "DSCR (Debt Service Coverage Ratio)",
        definition: "A metric used by lenders to evaluate whether a rental property generates enough income to cover its debt obligations. Calculated by dividing Net Operating Income (NOI) by annual debt service. NOI is gross rental income minus all operating expenses — including property taxes, insurance, utilities paid by the owner, HOA fees, property management fees, maintenance reserves, and vacancy allowance. A DSCR of 1.0 means income exactly covers debt; most lenders require 1.2 or higher. DSCR loans allow investors to qualify based on property cash flow rather than personal income."
      },
      {
        term: "Points",
        definition: "Upfront fees charged by a lender at closing, calculated as a percentage of the total loan amount. One point equals 1% of the loan. For example, 2 points on a $300,000 loan equals $6,000 due at closing. Points can sometimes be deferred to closing — paid from sale proceeds rather than out-of-pocket — which significantly reduces an investor's cash requirements going into a deal."
      },
      {
        term: "Draw Schedule",
        definition: "A predetermined plan for releasing rehab loan funds in stages throughout a renovation project. Rather than receiving the full rehab budget upfront, the lender releases funds in draws (typically 2-4) as work is completed and verified. Both standard rehab loans and drawn-funds-only loans use draw schedules. The difference is that drawn-funds-only loans charge interest only on amounts actually disbursed, while standard loans accrue interest on the full rehab amount from day one."
      },
      {
        term: "Bridge Loan",
        definition: "A short-term loan used to bridge the gap between an immediate financing need and a longer-term solution. In real estate investing, bridge loans are commonly used to fund the purchase and renovation of a property before refinancing into a permanent loan or selling. Similar to hard money loans, bridge loans are asset-based and funded by private lenders, with terms typically ranging from 6 to 24 months."
      },
      {
        term: "Transactional Funding",
        definition: "Very short-term financing — typically hours to a few days, up to 7 days — used by wholesalers to fund a double close where the wholesaler actually purchases the property before immediately reselling it to the end buyer. Unlike hard money loans, transactional funding is designed for same-day or next-day closings and is repaid as soon as the B-to-C transaction closes. Fees are typically 1-2% of the loan amount with no monthly interest."
      },
      {
        term: "Balloon Payment",
        definition: "A large lump-sum payment due at the end of a loan term, after a series of smaller regular payments. Common in hard money and bridge loans where the investor makes interest-only payments during the hold period and repays the full principal at maturity — typically from sale proceeds or a refinance."
      },
      {
        term: "SBA 7(a)",
        definition: "A government-backed small business loan program administered by the U.S. Small Business Administration. Can be used for real estate purchases when the property is at least 51% owner-occupied. Offers longer terms and lower rates than hard money, but requires personal income verification, strong credit, and a longer approval process."
      },
      {
        term: "USDA Loan",
        definition: "A government-backed mortgage program administered by the U.S. Department of Agriculture for eligible rural and suburban homebuyers. USDA loans offer no down payment requirement, competitive interest rates, and reduced mortgage insurance costs. Properties must be located in USDA-designated rural areas, and borrowers must meet income eligibility requirements (typically up to 115% of the area median income)."
      }
    ]
  },
  {
    id: "investment-terms",
    name: "Real Estate Investment Terms",
    terms: [
      {
        term: "Fix and Flip",
        definition: "A real estate investment strategy where an investor purchases a distressed property, renovates it, and sells it for a profit — typically within 6-18 months. Profitability depends on accurate ARV estimation, controlled renovation costs, and efficient execution. Key metrics include net profit, cash-on-cash return, and annualized return. Fix and flip deals are typically financed with hard money or bridge loans due to their short-term nature and fast closing requirements."
      },
      {
        term: "Wholesale / Wholesaling",
        definition: "A real estate investment strategy where an investor contracts to purchase a property at a discount, then assigns that contract to an end buyer (typically a fix and flip investor) for a fee — without ever taking ownership. The wholesaler's profit is the assignment fee: the difference between the contracted purchase price and what the end buyer pays. Max offer calculations for wholesale deals must account for the end buyer's repair costs, desired profit margin, and the wholesaler's fee."
      },
      {
        term: "BRRRR",
        definition: "Buy, Rehab, Rent, Refinance, Repeat — a real estate investment strategy for building a rental portfolio. The investor purchases a distressed property, renovates it, rents it out, then refinances based on the new appraised value to pull out equity and repeat the process with the next property."
      },
      {
        term: "1031 Exchange",
        definition: "A provision in the U.S. tax code (Section 1031) that allows real estate investors to defer capital gains taxes by reinvesting proceeds from the sale of one property into a like-kind replacement property. The replacement property must be identified within 45 days and the exchange completed within 180 days. One of the most powerful wealth-building tools available to real estate investors."
      },
      {
        term: "REIT (Real Estate Investment Trust)",
        definition: "A company that owns, operates, or finances income-producing real estate. REITs allow individual investors to invest in large-scale real estate portfolios the same way they invest in stocks, without directly owning property. Required by law to distribute at least 90% of taxable income to shareholders."
      },
      {
        term: "Cap Rate (Capitalization Rate)",
        definition: "The rate of return on a real estate investment based on the income the property generates, independent of financing. Calculated by dividing Net Operating Income (NOI) by the property's market value. Cap rates are the primary valuation method for multifamily properties (5+ units) and commercial real estate, where value is driven by income. Single-family homes are valued by comparable sales (comps), not cap rates. For 2-4 unit properties (duplexes, triplexes, quads), lenders may use either the comp method or the income approach depending on the property and loan type."
      },
      {
        term: "NOI (Net Operating Income)",
        definition: "A property's income after all operating expenses are deducted, but before debt service (mortgage payments). Operating expenses include taxes, insurance, property management, maintenance, HOA fees, and vacancy allowance — but not the mortgage payment. NOI is the foundation of DSCR calculations and cap rate-based valuations."
      },
      {
        term: "Cash-on-Cash Return (CoC)",
        definition: "The annual pre-tax return on the actual cash invested in a property, expressed as a percentage. Calculated by dividing annual net cash flow by total out-of-pocket cash invested (down payment, closing costs, rehab costs, and carrying costs). CoC is the most practical metric for evaluating fix and flip profitability because it measures return against what you actually had to bring to the table, not the total deal value."
      },
      {
        term: "Annualized Return",
        definition: "A metric that converts a deal's total return into an equivalent annual rate, allowing comparison of deals with different hold periods. Calculated by dividing the total return percentage by the hold period in months, then multiplying by 12. A deal returning 30% in 6 months has an annualized return of 60% — significantly better than a deal returning 30% over 18 months (20% annualized). Critical for fix and flip investors evaluating deal velocity."
      },
      {
        term: "Gross Rent Multiplier (GRM)",
        definition: "A quick valuation metric calculated by dividing a property's purchase price by its gross annual rental income. Used as a rough comparison tool for income properties. Lower GRM generally indicates a better income-to-price ratio, though it does not account for expenses or vacancy."
      },
      {
        term: "OpEx (Operating Expenses)",
        definition: "All costs required to operate and maintain a rental property, excluding debt service. Includes property taxes, insurance, property management fees, maintenance and repairs, HOA dues, utilities paid by the owner, and vacancy allowance. OpEx is subtracted from gross rental income to calculate NOI."
      },
      {
        term: "Cash Flow",
        definition: "Net income remaining after all expenses and debt service have been paid. Positive cash flow means the property generates more income than it costs to own and operate. For fix and flip, cash flow during the hold period refers to carrying costs — the monthly expenses the investor must cover while the renovation is underway."
      }
    ]
  },
  {
    id: "ownership-transaction",
    name: "Ownership and Transaction Terms",
    terms: [
      {
        term: "OOP (Out-of-Pocket)",
        definition: "The total cash an investor must have available before and during a deal — not including costs that are deferred to closing or financed. For a fix and flip, OOP typically includes the down payment, buy-side closing costs, non-deferred lender fees, and cash carrying costs such as insurance, utilities, and HOA. Understanding true OOP is critical for deal feasibility — it determines whether you can actually fund the deal."
      },
      {
        term: "Closing Costs",
        definition: "Expenses paid at the time of closing a real estate transaction, in addition to the purchase price. For investors, closing costs typically include attorney fees, title examination, title insurance, transfer taxes, recording fees, and lender fees such as points, appraisal, and document preparation. Buy-side closing costs typically range from 2-5% of the purchase price and must be accounted for when calculating out-of-pocket investment requirements."
      },
      {
        term: "Transfer Tax",
        definition: "A tax imposed by state or local governments on the transfer of real property from one owner to another, calculated as a percentage of the sale price. Also known as a deed tax, documentary stamp tax, conveyance tax, or transfer fee depending on the jurisdiction. Who pays varies by state and is subject to negotiation — though in most real estate investor transactions, it is customary for the investor buyer to pay all closing costs including transfer tax. Not all states impose a transfer tax."
      },
      {
        term: "FSBO (For Sale by Owner)",
        definition: "A property listed and sold directly by the owner without a real estate agent. FSBO properties can represent opportunities for investors to negotiate directly with motivated sellers, though they require more due diligence since there is no agent managing disclosures."
      },
      {
        term: "Comparable Sale (Comp)",
        definition: "A recently sold property used to estimate the market value of a subject property. Comps should be similar in size, condition, age, location, and features. For fix and flip investors, ARV is determined by analyzing comps of renovated properties in the same area. The quality of your comps directly determines the accuracy of your ARV."
      },
      {
        term: "Clear Title",
        definition: "Property ownership that is free of liens, encumbrances, or legal disputes. A clear title is required to complete a real estate sale. Title insurance protects the buyer against undiscovered title defects that could surface after closing."
      }
    ]
  },
  {
    id: "entity-legal",
    name: "Entity and Legal Terms",
    terms: [
      {
        term: "LLC (Limited Liability Company)",
        definition: "A legal entity that separates personal assets from business liabilities, providing liability protection for real estate investors. Most experienced investors hold properties in LLCs to protect personal assets in the event of a lawsuit or debt claim. Single-member LLCs are treated as pass-through entities for tax purposes."
      },
      {
        term: "General Partner (GP) & Limited Partner (LP)",
        definition: "Roles in a real estate partnership or syndication. The General Partner manages the investment, makes decisions, and bears unlimited liability. Limited Partners contribute capital and receive returns but have no management role and limited liability. This structure is common in larger real estate syndications and joint ventures."
      },
      {
        term: "Ground Lease",
        definition: "A long-term lease of land (typically 50-99 years) in which a tenant constructs and owns a building on the land while the landowner retains ownership of the ground. Common in commercial development. The building reverts to the landowner at the end of the lease term."
      }
    ]
  },
  {
    id: "financial-analysis",
    name: "Financial Analysis and Metrics",
    terms: [
      {
        term: "IRR (Internal Rate of Return)",
        definition: "The annualized rate of return that makes the net present value of all cash flows equal to zero. IRR accounts for the timing and size of all cash inflows and outflows over the life of an investment, making it one of the most comprehensive return metrics. Higher IRR is better; most experienced investors target IRR above 20% for fix and flip deals."
      },
      {
        term: "ROI (Return on Investment)",
        definition: "Total profit as a percentage of the total investment cost. Calculated by dividing net profit by total costs invested. Unlike CoC which measures return on cash invested, ROI accounts for all costs including financed amounts. A simple but broad metric — for more meaningful analysis on fix and flip deals, use CoC and annualized return."
      },
      {
        term: "NPV (Net Present Value)",
        definition: "The present value of all future cash flows minus the initial investment cost. A positive NPV means the investment is expected to generate more value than it costs. NPV accounts for the time value of money — a dollar received today is worth more than a dollar received in the future."
      },
      {
        term: "GRI (Gross Rental Income)",
        definition: "The total rental income a property generates before any expenses are deducted. Starting point for NOI calculations. Lenders often apply a vacancy allowance of 5-10% to GRI before calculating NOI."
      },
      {
        term: "FMV (Fair Market Value)",
        definition: "The price a willing buyer would pay a willing seller in an arm's-length transaction, with both parties having reasonable knowledge of the facts. FMV is the basis for property tax assessments, estate valuations, and many lender appraisals."
      },
      {
        term: "MIRR (Modified Internal Rate of Return)",
        definition: "An adjusted version of IRR that assumes positive cash flows are reinvested at a specified reinvestment rate rather than the IRR itself. MIRR provides a more realistic picture of investment returns when the reinvestment assumption of standard IRR is unrealistic."
      },
      {
        term: "Discounted Cash Flow (DCF)",
        definition: "A valuation method that estimates the present value of all future expected cash flows from an investment, discounted at an appropriate rate. DCF analysis is most commonly used for long-term rental properties and commercial real estate where multi-year cash flows are projected."
      }
    ]
  },
  {
    id: "common-acronyms",
    name: "Common Acronyms",
    terms: [
      {
        term: "MLS (Multiple Listing Service)",
        definition: "A centralized database of property listings shared among real estate agents and brokers. MLS data is the primary source for comparable sales used in ARV analysis. Most MLS systems are not publicly accessible — investors typically access MLS data through an agent, data provider, or tools like PropStream."
      },
      {
        term: "PITI (Principal, Interest, Taxes, Insurance)",
        definition: "The four components of a standard mortgage payment. PITI represents the full monthly housing cost used by lenders to calculate debt-to-income ratios. For DSCR loans, lenders often use PITIA — adding Association dues to the calculation."
      },
      {
        term: "SFH (Single-Family Home)",
        definition: "A standalone residential property designed for one family. SFHs are the most common property type for fix and flip investors. Valued by comparable sales (comps) rather than income-based methods like cap rates."
      },
      {
        term: "CRE (Commercial Real Estate)",
        definition: "Property types used for business purposes, including office, retail, industrial, multifamily (5+ units), and mixed-use. Commercial properties are typically valued using income-based methods (NOI and cap rates) rather than residential comp-based approaches."
      },
      {
        term: "NNN (Triple Net Lease)",
        definition: "A lease structure where the tenant pays property taxes, insurance, and maintenance costs in addition to base rent — effectively passing most operating expenses to the tenant. Common in commercial real estate. Provides landlords with predictable net income with minimal management responsibility."
      }
    ]
  },
  {
    id: "miscellaneous",
    name: "Miscellaneous/Advanced Concepts",
    terms: [
      {
        term: "Appreciation",
        definition: "The increase in a property's value over time. Can be natural (market-driven) or forced (value-add improvements). Fix and flip investors rely primarily on forced appreciation through renovation. Buy-and-hold investors benefit from both natural appreciation over time and forced appreciation through property improvements."
      },
      {
        term: "Equity",
        definition: "The portion of a property's value that the owner actually owns, calculated as market value minus outstanding loan balances. As an investor pays down a loan or a property appreciates, equity increases. Equity can be accessed through a cash-out refinance or HELOC, or realized through a sale."
      },
      {
        term: "Foreclosure",
        definition: "The legal process by which a lender takes ownership of a property after the borrower defaults on loan payments. Foreclosed properties are often sold at below-market prices and can represent acquisition opportunities for investors, though they typically require significant due diligence and may have title complications."
      },
      {
        term: "Retail Investor",
        definition: "An individual investing for their own personal account rather than on behalf of an institution. In real estate, retail investors typically operate at smaller scale — buying individual properties rather than portfolios — and rely on personal capital or private lending rather than institutional financing."
      },
      {
        term: "Rent-to-Own (RTO)",
        definition: "An arrangement where a tenant rents a property with an option to purchase it at a predetermined price within a set timeframe. A portion of monthly rent payments may be credited toward the purchase price. Can be structured as a tool for investors to generate income while preparing a property for sale."
      },
      {
        term: "Concessions",
        definition: "Incentives offered by a seller or landlord to attract buyers or tenants. In sales transactions, concessions might include covering closing costs or reducing price. In rental markets, concessions often take the form of free rent periods or reduced security deposits. Concessions affect net effective rent and should be accounted for in NOI calculations."
      }
    ]
  }
];
