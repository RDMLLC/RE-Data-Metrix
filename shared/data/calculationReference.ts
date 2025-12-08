export interface CalculationVariable {
  name: string;
  description: string;
  source: string;
}

export interface CalculationExample {
  inputs: Record<string, string | number | boolean>;
  result: string | number;
  explanation?: string;
}

export interface CalculationDefinition {
  id: string;
  name: string;
  description: string;
  formula: string;
  formulaDisplay: string;
  inputs: CalculationVariable[];
  output: string;
  example: CalculationExample;
  notes?: string[];
}

export interface CalculationCategory {
  id: string;
  name: string;
  description: string;
  calculations: CalculationDefinition[];
}

export const calculationCategories: CalculationCategory[] = [
  {
    id: "loan-sizing",
    name: "Loan Sizing",
    description: "Calculations that determine how much a lender will fund for a deal",
    calculations: [
      {
        id: "buy-loan-amount",
        name: "Buy Loan Amount",
        description: "The amount a lender will fund toward the purchase price based on their Max LTV (Buy) percentage",
        formula: "buyLoanAmount = purchasePrice × (maxLtvBuy / 100)",
        formulaDisplay: "Buy Loan = Purchase Price × Max LTV (Buy)%",
        inputs: [
          { name: "purchasePrice", description: "The property purchase price", source: "User input (Step 3)" },
          { name: "maxLtvBuy", description: "Maximum Loan-to-Value percentage for purchase", source: "Lender product settings" }
        ],
        output: "Dollar amount the lender will fund toward purchase",
        example: {
          inputs: { purchasePrice: 200000, maxLtvBuy: 90 },
          result: "$180,000",
          explanation: "$200,000 × 90% = $180,000"
        }
      },
      {
        id: "rehab-loan-amount",
        name: "Rehab Loan Amount",
        description: "The amount a lender will fund toward the rehab/renovation budget",
        formula: "rehabLoanAmount = rehabBudget × (maxLendRehab / 100)",
        formulaDisplay: "Rehab Loan = Rehab Budget × Max Rehab%",
        inputs: [
          { name: "rehabBudget", description: "Total renovation/rehab budget", source: "User input (Step 3)" },
          { name: "maxLendRehab", description: "Maximum percentage of rehab the lender will fund", source: "Lender product settings" }
        ],
        output: "Dollar amount the lender will fund toward rehab",
        example: {
          inputs: { rehabBudget: 50000, maxLendRehab: 100 },
          result: "$50,000",
          explanation: "$50,000 × 100% = $50,000"
        }
      },
      {
        id: "total-loan-amount",
        name: "Total Loan Amount (Before Caps)",
        description: "The combined buy and rehab loan amounts before any caps are applied",
        formula: "totalLoanAmount = buyLoanAmount + rehabLoanAmount",
        formulaDisplay: "Total Loan = Buy Loan + Rehab Loan",
        inputs: [
          { name: "buyLoanAmount", description: "Calculated buy loan amount", source: "Buy Loan Amount calculation" },
          { name: "rehabLoanAmount", description: "Calculated rehab loan amount", source: "Rehab Loan Amount calculation" }
        ],
        output: "Total loan before caps are applied",
        example: {
          inputs: { buyLoanAmount: 180000, rehabLoanAmount: 50000 },
          result: "$230,000",
          explanation: "$180,000 + $50,000 = $230,000"
        }
      },
      {
        id: "arv-cap",
        name: "ARV Cap",
        description: "Maximum loan amount based on After Repair Value (ARV). If total loan exceeds this cap, it gets reduced.",
        formula: "maxLoanFromArv = arv × (maxLoanArv / 100)",
        formulaDisplay: "ARV Cap = ARV × Max Loan ARV%",
        inputs: [
          { name: "arv", description: "After Repair Value of the property", source: "User input (Step 2 - from Zillow/Redfin)" },
          { name: "maxLoanArv", description: "Maximum loan-to-ARV percentage", source: "Lender product settings" }
        ],
        output: "Maximum allowed loan based on ARV",
        example: {
          inputs: { arv: 300000, maxLoanArv: 70 },
          result: "$210,000",
          explanation: "$300,000 × 70% = $210,000. If total loan was $230,000, it would be capped at $210,000."
        },
        notes: [
          "When ARV cap is applied, the loan reduction comes proportionally from buy and rehab amounts",
          "The ARV cap protects lenders from over-lending on properties"
        ]
      },
      {
        id: "ltc-cap",
        name: "LTC Cap (Loan-to-Cost)",
        description: "Maximum loan amount based on total project cost (purchase + rehab). Some lenders use this as an additional constraint.",
        formula: "maxLoanFromLtc = (purchasePrice + rehabBudget) × (maxLtcPercent / 100)",
        formulaDisplay: "LTC Cap = Total Project Cost × Max LTC%",
        inputs: [
          { name: "purchasePrice", description: "Property purchase price", source: "User input (Step 3)" },
          { name: "rehabBudget", description: "Rehab budget", source: "User input (Step 3)" },
          { name: "maxLtcPercent", description: "Maximum LTC percentage", source: "Lender product settings (if LTC weighted)" }
        ],
        output: "Maximum allowed loan based on total project cost",
        example: {
          inputs: { purchasePrice: 200000, rehabBudget: 50000, maxLtcPercent: 85 },
          result: "$212,500",
          explanation: "($200,000 + $50,000) × 85% = $212,500"
        },
        notes: [
          "Only applies when lender has 'LTC Weighted' enabled",
          "When LTC cap is the limiting factor, rehab stays at full percentage and buy amount is reduced first",
          "The UI shows an 'LTC Cap' badge and effective buy percentage when this adjustment is applied"
        ]
      },
      {
        id: "final-loan-amount",
        name: "Final Loan Amount",
        description: "The actual loan amount after applying all caps (standard, ARV, and LTC)",
        formula: "finalLoanAmount = min(totalLoanAmount, arvCappedLoan, ltcCappedLoan)",
        formulaDisplay: "Final Loan = MIN(Total Loan, ARV Cap, LTC Cap)",
        inputs: [
          { name: "totalLoanAmount", description: "Total loan before caps", source: "Total Loan Amount calculation" },
          { name: "arvCappedLoan", description: "Maximum from ARV cap", source: "ARV Cap calculation" },
          { name: "ltcCappedLoan", description: "Maximum from LTC cap", source: "LTC Cap calculation" }
        ],
        output: "Final loan amount the lender will provide",
        example: {
          inputs: { totalLoanAmount: 230000, arvCappedLoan: 210000, ltcCappedLoan: 212500 },
          result: "$210,000",
          explanation: "MIN($230,000, $210,000, $212,500) = $210,000. ARV cap is the limiting factor."
        }
      },
      {
        id: "additional-down-payment",
        name: "Additional Down Payment",
        description: "Extra cash needed due to loan caps reducing the funded amount",
        formula: "additionalDownPayment = totalLoanAmount - finalLoanAmount",
        formulaDisplay: "Additional Down = Total Loan (before caps) - Final Loan",
        inputs: [
          { name: "totalLoanAmount", description: "Total loan before caps", source: "Total Loan Amount calculation" },
          { name: "finalLoanAmount", description: "Final loan after caps", source: "Final Loan Amount calculation" }
        ],
        output: "Additional cash investor must bring due to caps",
        example: {
          inputs: { totalLoanAmount: 230000, finalLoanAmount: 210000 },
          result: "$20,000",
          explanation: "$230,000 - $210,000 = $20,000 additional cash needed"
        }
      }
    ]
  },
  {
    id: "interest-costs",
    name: "Interest & Points",
    description: "Calculations for loan interest and origination points",
    calculations: [
      {
        id: "buy-loan-interest",
        name: "Buy Loan Interest",
        description: "Total interest on the purchase portion of the loan over the project length",
        formula: "buyInterest = buyLoanAmount × (interestRate / 100 / 12) × projectLength",
        formulaDisplay: "Buy Interest = Buy Loan × Monthly Rate × Months",
        inputs: [
          { name: "buyLoanAmount", description: "Loan amount for purchase", source: "Buy Loan Amount calculation" },
          { name: "interestRate", description: "Annual interest rate (percentage)", source: "Lender product settings" },
          { name: "projectLength", description: "Project duration in months", source: "User input (Step 3)" }
        ],
        output: "Total interest cost on buy portion",
        example: {
          inputs: { buyLoanAmount: 180000, interestRate: 12, projectLength: 6 },
          result: "$10,800",
          explanation: "$180,000 × (12% / 12) × 6 months = $10,800"
        }
      },
      {
        id: "rehab-loan-interest-full",
        name: "Rehab Loan Interest (Full Balance)",
        description: "Interest on rehab funds when charged on the full balance from day one",
        formula: "rehabInterest = rehabLoanAmount × (interestRate / 100 / 12) × projectLength",
        formulaDisplay: "Rehab Interest = Rehab Loan × Monthly Rate × Months",
        inputs: [
          { name: "rehabLoanAmount", description: "Loan amount for rehab", source: "Rehab Loan Amount calculation" },
          { name: "interestRate", description: "Annual interest rate (percentage)", source: "Lender product settings" },
          { name: "projectLength", description: "Project duration in months", source: "User input (Step 3)" }
        ],
        output: "Total interest cost on rehab portion (full balance method)",
        example: {
          inputs: { rehabLoanAmount: 50000, interestRate: 12, projectLength: 6 },
          result: "$3,000",
          explanation: "$50,000 × (12% / 12) × 6 months = $3,000"
        },
        notes: ["Used when lender charges interest on full rehab amount from closing, not drawn funds only"]
      },
      {
        id: "rehab-loan-interest-draws",
        name: "Rehab Loan Interest (Drawn Funds Only)",
        description: "Interest on rehab funds when charged only on amounts as they are drawn",
        formula: "For each draw: drawInterest = drawAmount × monthlyRate × monthsRemaining. Total = sum of all draw interests.",
        formulaDisplay: "Draw Interest = Σ(Draw Amount × Monthly Rate × Months Remaining)",
        inputs: [
          { name: "rehabLoanAmount", description: "Total rehab loan amount", source: "Rehab Loan Amount calculation" },
          { name: "interestRate", description: "Annual interest rate", source: "Lender product settings" },
          { name: "projectLength", description: "Project duration in months", source: "User input (Step 3)" },
          { name: "drawSchedule", description: "Schedule of when rehab funds are drawn", source: "Lender product settings" }
        ],
        output: "Total interest cost on rehab using draw schedule",
        example: {
          inputs: { rehabLoanAmount: 50000, interestRate: 12, projectLength: 6, drawSchedule: "25% at day 0, 25% at day 45, 25% at day 90, 25% at day 135" },
          result: "$1,875",
          explanation: "Each $12,500 draw accrues interest only for remaining project time. First draw: 6 months, Last draw: ~1.5 months. Average = ~$1,875"
        },
        notes: [
          "This method typically saves 30-40% on rehab interest compared to full balance method",
          "Standard draw schedule is 25% at day 0, 25% at day 45, 25% at day 90, 25% at day 135"
        ]
      },
      {
        id: "origination-points",
        name: "Origination Points",
        description: "Upfront fee charged by lender as a percentage of the loan amount",
        formula: "pointsCost = finalLoanAmount × (points / 100)",
        formulaDisplay: "Points Cost = Final Loan × Points%",
        inputs: [
          { name: "finalLoanAmount", description: "Final loan amount", source: "Final Loan Amount calculation" },
          { name: "points", description: "Origination points percentage", source: "Lender product settings" }
        ],
        output: "Dollar cost of origination points",
        example: {
          inputs: { finalLoanAmount: 210000, points: 2 },
          result: "$4,200",
          explanation: "$210,000 × 2% = $4,200"
        },
        notes: [
          "Points can be paid upfront or deferred (rolled into loan payoff)",
          "When deferred, points add to the total amount owed at sale"
        ]
      },
      {
        id: "total-interest",
        name: "Total Interest",
        description: "Combined interest from buy and rehab portions of the loan",
        formula: "totalInterest = buyLoanInterest + rehabLoanInterest",
        formulaDisplay: "Total Interest = Buy Interest + Rehab Interest",
        inputs: [
          { name: "buyLoanInterest", description: "Interest on buy loan", source: "Buy Loan Interest calculation" },
          { name: "rehabLoanInterest", description: "Interest on rehab loan", source: "Rehab Loan Interest calculation" }
        ],
        output: "Total interest cost for the loan",
        example: {
          inputs: { buyLoanInterest: 10800, rehabLoanInterest: 1875 },
          result: "$12,675",
          explanation: "$10,800 + $1,875 = $12,675"
        }
      }
    ]
  },
  {
    id: "carrying-costs",
    name: "Carrying Costs",
    description: "Monthly costs of holding the property during the project, plus one-time holding costs",
    calculations: [
      {
        id: "monthly-carrying-costs",
        name: "Monthly Carrying Costs",
        description: "Total monthly cost to hold the property including taxes, insurance, utilities, and HOA",
        formula: "monthlyCarrying = monthlyPropertyTax + monthlyInsurance + monthlyUtilities + monthlyHoa",
        formulaDisplay: "Monthly Carrying = Taxes + Insurance + Utilities + HOA",
        inputs: [
          { name: "monthlyPropertyTax", description: "Monthly property tax amount", source: "User input (Step 4)" },
          { name: "monthlyInsurance", description: "Monthly insurance premium", source: "User input (Step 4)" },
          { name: "monthlyUtilities", description: "Monthly utilities cost", source: "User input (Step 4)" },
          { name: "monthlyHoa", description: "Monthly HOA fees", source: "User input (Step 4)" }
        ],
        output: "Total monthly carrying cost",
        example: {
          inputs: { monthlyPropertyTax: 250, monthlyInsurance: 150, monthlyUtilities: 200, monthlyHoa: 0 },
          result: "$600/month",
          explanation: "$250 + $150 + $200 + $0 = $600 per month"
        }
      },
      {
        id: "total-carrying-costs",
        name: "Total Carrying Costs (Base)",
        description: "Total carrying costs over the entire project duration, including monthly costs multiplied by project length plus one-time costs",
        formula: "totalCarrying = (monthlyCarryingCosts × projectLength) + hoaTransferFee + otherCarryingCosts",
        formulaDisplay: "Total Carrying = (Monthly Carrying × Months) + HOA Transfer Fee + Other Costs",
        inputs: [
          { name: "monthlyCarryingCosts", description: "Monthly carrying cost", source: "Monthly Carrying Costs calculation" },
          { name: "projectLength", description: "Project duration in months", source: "User input (Step 3)" },
          { name: "hoaTransferFee", description: "One-time HOA transfer fee (if applicable)", source: "User input (Step 4)" },
          { name: "otherCarryingCosts", description: "Other one-time costs (lawn care, permits, etc.)", source: "User input (Step 4)" }
        ],
        output: "Total carrying cost for project (before interest)",
        example: {
          inputs: { monthlyCarryingCosts: 600, projectLength: 6, hoaTransferFee: 250, otherCarryingCosts: 500 },
          result: "$4,350",
          explanation: "($600 × 6 months) + $250 + $500 = $4,350"
        },
        notes: [
          "HOA Transfer Fee and Other Costs are one-time amounts, not multiplied by project length",
          "This is the base carrying cost before any lender interest is added"
        ]
      },
      {
        id: "lender-carrying-costs",
        name: "Lender Carrying Costs (with Interest)",
        description: "Per-lender carrying costs that include monthly interest payments when interest is NOT deferred",
        formula: "lenderCarryingCosts = baseCarryingCosts + (interestDeferred ? 0 : totalInterestCost)",
        formulaDisplay: "Lender Carrying = Base Carrying + Interest (if not deferred)",
        inputs: [
          { name: "baseCarryingCosts", description: "Total base carrying costs", source: "Total Carrying Costs calculation" },
          { name: "totalInterestCost", description: "Total loan interest for project", source: "Total Interest calculation" },
          { name: "interestDeferred", description: "Whether interest is deferred to payoff", source: "Lender product settings" }
        ],
        output: "Total carrying costs including interest (per lender)",
        example: {
          inputs: { baseCarryingCosts: 4350, totalInterestCost: 12675, interestDeferred: false },
          result: "$17,025",
          explanation: "$4,350 + $12,675 = $17,025 (interest paid monthly, included in carrying costs)"
        },
        notes: [
          "When interest is NOT deferred, monthly interest payments are real out-of-pocket costs during the project",
          "When interest IS deferred, it goes to Rolled Costs instead and is paid at sale",
          "This is why each lender shows different carrying costs in the Deal Analysis Results"
        ]
      },
      {
        id: "rolled-costs",
        name: "Rolled Costs (Deferred to Payoff)",
        description: "Costs that are deferred and paid at sale rather than upfront",
        formula: "rolledCosts = (interestDeferred ? totalInterest : 0) + (pointsDeferred ? pointsCost : 0)",
        formulaDisplay: "Rolled Costs = Deferred Interest + Deferred Points",
        inputs: [
          { name: "totalInterest", description: "Total loan interest", source: "Total Interest calculation" },
          { name: "interestDeferred", description: "Whether interest is deferred", source: "Lender product settings" },
          { name: "pointsCost", description: "Origination points cost", source: "Origination Points calculation" },
          { name: "pointsDeferred", description: "Whether points are deferred", source: "Lender product settings" }
        ],
        output: "Total costs rolled into loan payoff",
        example: {
          inputs: { totalInterest: 12675, interestDeferred: true, pointsCost: 4200, pointsDeferred: false },
          result: "$12,675",
          explanation: "Interest deferred ($12,675), points paid upfront ($0 rolled). Total rolled = $12,675"
        },
        notes: [
          "Rolled costs reduce upfront cash needed but increase total amount owed at sale",
          "This affects cash-on-cash ROI calculations"
        ]
      }
    ]
  },
  {
    id: "investment-costs",
    name: "Investment Costs",
    description: "Total project costs and out-of-pocket requirements",
    calculations: [
      {
        id: "total-project-cost",
        name: "Total Project Cost",
        description: "The complete cost to acquire and renovate the property",
        formula: "totalProjectCost = purchasePrice + rehabBudget",
        formulaDisplay: "Total Project Cost = Purchase Price + Rehab Budget",
        inputs: [
          { name: "purchasePrice", description: "Property purchase price", source: "User input (Step 3)" },
          { name: "rehabBudget", description: "Renovation budget", source: "User input (Step 3)" }
        ],
        output: "Total acquisition and renovation cost",
        example: {
          inputs: { purchasePrice: 200000, rehabBudget: 50000 },
          result: "$250,000",
          explanation: "$200,000 + $50,000 = $250,000"
        }
      },
      {
        id: "down-payment",
        name: "Down Payment",
        description: "Cash needed for the portion of project cost not covered by the loan",
        formula: "downPayment = totalProjectCost - finalLoanAmount",
        formulaDisplay: "Down Payment = Total Project Cost - Final Loan",
        inputs: [
          { name: "totalProjectCost", description: "Total project cost", source: "Total Project Cost calculation" },
          { name: "finalLoanAmount", description: "Final loan amount", source: "Final Loan Amount calculation" }
        ],
        output: "Cash required for down payment",
        example: {
          inputs: { totalProjectCost: 250000, finalLoanAmount: 210000 },
          result: "$40,000",
          explanation: "$250,000 - $210,000 = $40,000"
        }
      },
      {
        id: "out-of-pocket-cost",
        name: "Out-of-Pocket Cost (Cash Required)",
        description: "Total cash the investor needs to complete the deal",
        formula: "outOfPocket = downPayment + closingCostsBuy + (pointsDeferred ? 0 : pointsCost) + totalCarryingCosts",
        formulaDisplay: "Cash Required = Down Payment + Closing Costs + Upfront Points + Carrying Costs",
        inputs: [
          { name: "downPayment", description: "Required down payment", source: "Down Payment calculation" },
          { name: "closingCostsBuy", description: "Closing costs to purchase", source: "User input (Step 4)" },
          { name: "pointsCost", description: "Origination points (if not deferred)", source: "Origination Points calculation" },
          { name: "totalCarryingCosts", description: "Total carrying costs", source: "Total Carrying Costs calculation" }
        ],
        output: "Total cash investor must invest",
        example: {
          inputs: { downPayment: 40000, closingCostsBuy: 5000, pointsCost: 4200, totalCarryingCosts: 3600 },
          result: "$52,800",
          explanation: "$40,000 + $5,000 + $4,200 + $3,600 = $52,800 cash needed"
        },
        notes: [
          "This is the actual cash invested, used for Cash-on-Cash ROI calculations",
          "If points or interest are deferred, those amounts are NOT included here"
        ]
      },
      {
        id: "total-investment",
        name: "Total Investment",
        description: "Complete investment including all costs (for ROI calculations)",
        formula: "totalInvestment = purchasePrice + rehabBudget + closingCostsBuy + totalCarryingCosts",
        formulaDisplay: "Total Investment = Purchase + Rehab + Closing + Carrying",
        inputs: [
          { name: "purchasePrice", description: "Purchase price", source: "User input (Step 3)" },
          { name: "rehabBudget", description: "Rehab budget", source: "User input (Step 3)" },
          { name: "closingCostsBuy", description: "Closing costs", source: "User input (Step 4)" },
          { name: "totalCarryingCosts", description: "Total carrying costs", source: "Total Carrying Costs calculation" }
        ],
        output: "Total investment basis",
        example: {
          inputs: { purchasePrice: 200000, rehabBudget: 50000, closingCostsBuy: 5000, totalCarryingCosts: 3600 },
          result: "$258,600",
          explanation: "$200,000 + $50,000 + $5,000 + $3,600 = $258,600"
        }
      },
      {
        id: "double-close-closing-costs",
        name: "Double Close Closing Costs",
        description: "Total closing costs when buying from a wholesaler in a double close transaction where the investor pays for both transactions",
        formula: "totalClosingCosts = closingCostsBuy1 + closingCostsBuy2",
        formulaDisplay: "Total Closing Costs = Buy1 Closing Costs + Buy2 Closing Costs",
        inputs: [
          { name: "closingCostsBuy1", description: "Closing costs for the wholesaler's purchase (Buy1)", source: "User input (Step 4)" },
          { name: "closingCostsBuy2", description: "Closing costs for investor's purchase from wholesaler (Buy2)", source: "User input (Step 4)" },
          { name: "isDoubleClose", description: "Whether this is a double close transaction", source: "User input (Step 3)" },
          { name: "payingForBothSides", description: "Whether investor pays both transaction costs", source: "User input (Step 3)" }
        ],
        output: "Combined closing costs for both transactions",
        example: {
          inputs: { closingCostsBuy1: 1750, closingCostsBuy2: 1750, isDoubleClose: true, payingForBothSides: true },
          result: "$3,500",
          explanation: "$1,750 (Buy1) + $1,750 (Buy2) = $3,500 total closing costs"
        },
        notes: [
          "Only applies when purchasing from a wholesaler who requires a double close",
          "Each transaction includes: Attorney Fees, Doc Prep Fees, Title Exam, and Title Insurance",
          "Buy1 and Buy2 costs are pre-populated with the same defaults but can be adjusted separately",
          "If not a double close or not paying for both sides, only Buy1 closing costs apply"
        ]
      }
    ]
  },
  {
    id: "exit-sale",
    name: "Exit & Sale",
    description: "Calculations related to selling the property",
    calculations: [
      {
        id: "sell-price",
        name: "Sell Price",
        description: "Expected sale price, typically based on the After Repair Value (ARV)",
        formula: "sellPrice = arv (or user-adjusted value)",
        formulaDisplay: "Sell Price = ARV (or adjusted)",
        inputs: [
          { name: "arv", description: "After Repair Value", source: "User input (Step 2)" }
        ],
        output: "Expected sale price",
        example: {
          inputs: { arv: 300000 },
          result: "$300,000",
          explanation: "Selling at full ARV"
        },
        notes: ["User can adjust sell price in Step 5 to model different sale scenarios"]
      },
      {
        id: "closing-costs-sell",
        name: "Closing Costs (Sell)",
        description: "Costs associated with selling the property",
        formula: "closingCostsSell = user input (typically 1-2% of sale price)",
        formulaDisplay: "Closing Costs = Fixed amount or % of sale",
        inputs: [
          { name: "closingCostsSell", description: "Seller closing costs", source: "User input (Step 4)" }
        ],
        output: "Closing costs at sale",
        example: {
          inputs: { closingCostsSell: 5000 },
          result: "$5,000",
          explanation: "Flat closing cost or ~1.7% of $300,000 sale"
        }
      },
      {
        id: "agent-commission",
        name: "Agent Commission",
        description: "Real estate agent commission on the sale",
        formula: "commission = sellPrice × (commissionRate / 100)",
        formulaDisplay: "Commission = Sell Price × Commission Rate%",
        inputs: [
          { name: "sellPrice", description: "Sale price", source: "Sell Price calculation" },
          { name: "commissionRate", description: "Commission percentage", source: "User input (Step 4)" }
        ],
        output: "Total agent commission",
        example: {
          inputs: { sellPrice: 300000, commissionRate: 5 },
          result: "$15,000",
          explanation: "$300,000 × 5% = $15,000"
        }
      },
      {
        id: "net-proceeds",
        name: "Net Proceeds from Sale",
        description: "Amount received after paying off loan and sale costs",
        formula: "netProceeds = sellPrice - closingCostsSell - commission - loanPayoff",
        formulaDisplay: "Net Proceeds = Sell Price - Closing - Commission - Loan Payoff",
        inputs: [
          { name: "sellPrice", description: "Sale price", source: "Sell Price calculation" },
          { name: "closingCostsSell", description: "Selling closing costs", source: "Closing Costs (Sell) calculation" },
          { name: "commission", description: "Agent commission", source: "Agent Commission calculation" },
          { name: "loanPayoff", description: "Loan principal + rolled costs", source: "Final Loan + Rolled Costs" }
        ],
        output: "Cash received from sale after all costs",
        example: {
          inputs: { sellPrice: 300000, closingCostsSell: 5000, commission: 15000, loanPayoff: 222675 },
          result: "$57,325",
          explanation: "$300,000 - $5,000 - $15,000 - $222,675 = $57,325"
        }
      }
    ]
  },
  {
    id: "profit-roi",
    name: "Profit & ROI",
    description: "Return on investment calculations",
    calculations: [
      {
        id: "profit",
        name: "Profit",
        description: "Net profit from the deal after all costs",
        formula: "profit = sellPrice - totalInvestment - closingCostsSell - commission - rolledCosts - lenderDrawFees",
        formulaDisplay: "Profit = Sell Price - All Costs",
        inputs: [
          { name: "sellPrice", description: "Sale price", source: "Sell Price calculation" },
          { name: "totalInvestment", description: "Total investment", source: "Total Investment calculation" },
          { name: "closingCostsSell", description: "Selling closing costs", source: "Closing Costs (Sell) calculation" },
          { name: "commission", description: "Agent commission", source: "Agent Commission calculation" },
          { name: "rolledCosts", description: "Deferred costs", source: "Rolled Costs calculation" },
          { name: "lenderDrawFees", description: "Lender draw/inspection fees", source: "Lender product settings" }
        ],
        output: "Net profit from deal",
        example: {
          inputs: { sellPrice: 300000, totalInvestment: 258600, closingCostsSell: 5000, commission: 15000, rolledCosts: 12675, lenderDrawFees: 200 },
          result: "$8,525",
          explanation: "$300,000 - $258,600 - $5,000 - $15,000 - $12,675 - $200 = $8,525"
        }
      },
      {
        id: "roi",
        name: "ROI (Return on Investment)",
        description: "Profit as a percentage of total investment",
        formula: "roi = (profit / totalInvestment) × 100",
        formulaDisplay: "ROI = (Profit ÷ Total Investment) × 100%",
        inputs: [
          { name: "profit", description: "Net profit", source: "Profit calculation" },
          { name: "totalInvestment", description: "Total investment", source: "Total Investment calculation" }
        ],
        output: "ROI percentage",
        example: {
          inputs: { profit: 8525, totalInvestment: 258600 },
          result: "3.30%",
          explanation: "($8,525 ÷ $258,600) × 100 = 3.30%"
        }
      },
      {
        id: "cash-on-cash-roi",
        name: "Cash-on-Cash ROI",
        description: "Profit as a percentage of actual cash invested (out-of-pocket)",
        formula: "cashOnCashRoi = (profit / outOfPocketCost) × 100",
        formulaDisplay: "Cash-on-Cash ROI = (Profit ÷ Cash Invested) × 100%",
        inputs: [
          { name: "profit", description: "Net profit", source: "Profit calculation" },
          { name: "outOfPocketCost", description: "Actual cash invested", source: "Out-of-Pocket Cost calculation" }
        ],
        output: "Cash-on-Cash ROI percentage",
        example: {
          inputs: { profit: 8525, outOfPocketCost: 52800 },
          result: "16.15%",
          explanation: "($8,525 ÷ $52,800) × 100 = 16.15%"
        },
        notes: [
          "Cash-on-Cash ROI is typically higher than ROI when using leverage",
          "This measures return on actual cash invested, not total project value"
        ]
      },
      {
        id: "annualized-roi",
        name: "Annualized ROI",
        description: "Cash-on-Cash ROI extrapolated to a 12-month period",
        formula: "annualizedRoi = cashOnCashRoi × (12 / projectLength)",
        formulaDisplay: "Annualized ROI = Cash-on-Cash ROI × (12 ÷ Project Months)",
        inputs: [
          { name: "cashOnCashRoi", description: "Cash-on-Cash ROI", source: "Cash-on-Cash ROI calculation" },
          { name: "projectLength", description: "Project duration in months", source: "User input (Step 3)" }
        ],
        output: "Annualized ROI percentage",
        example: {
          inputs: { cashOnCashRoi: 16.15, projectLength: 6 },
          result: "32.30%",
          explanation: "16.15% × (12 ÷ 6) = 32.30% annualized"
        },
        notes: [
          "Useful for comparing projects of different lengths",
          "Assumes you could replicate similar returns over a full year"
        ]
      }
    ]
  },
  {
    id: "dscr-rental",
    name: "DSCR / Rental Analysis",
    description: "Calculations for rental property analysis and DSCR loans",
    calculations: [
      {
        id: "monthly-rent",
        name: "Monthly Rent",
        description: "Expected monthly rental income",
        formula: "monthlyRent = user input or Zillow RentZestimate",
        formulaDisplay: "Monthly Rent = User Input or RentZestimate",
        inputs: [
          { name: "monthlyRent", description: "Monthly rent amount", source: "User input or Zillow API" }
        ],
        output: "Expected monthly rental income",
        example: {
          inputs: { monthlyRent: 2500 },
          result: "$2,500/month"
        },
        notes: ["RentZestimate is pre-populated from Zillow when property data is available"]
      },
      {
        id: "loan-amount-dscr",
        name: "Loan Amount (DSCR)",
        description: "Loan amount for rental/DSCR loans based on ARV and LTV",
        formula: "loanAmount = arv × (maxLtvBuy / 100)",
        formulaDisplay: "Loan Amount = ARV × Max LTV%",
        inputs: [
          { name: "arv", description: "After Repair Value", source: "User input (Step 2)" },
          { name: "maxLtvBuy", description: "Maximum LTV for DSCR loans", source: "Lender product settings" }
        ],
        output: "Loan amount for DSCR product",
        example: {
          inputs: { arv: 300000, maxLtvBuy: 75 },
          result: "$225,000",
          explanation: "$300,000 × 75% = $225,000"
        }
      },
      {
        id: "monthly-mortgage-payment",
        name: "Monthly Mortgage Payment (P&I)",
        description: "Principal and Interest payment calculated using amortization",
        formula: "M = P × [r(1+r)^n] / [(1+r)^n - 1], where r = monthlyRate, n = totalPayments",
        formulaDisplay: "M = P × [r(1+r)^n] / [(1+r)^n - 1]",
        inputs: [
          { name: "P", description: "Loan principal", source: "Loan Amount calculation" },
          { name: "r", description: "Monthly interest rate", source: "Lender product settings (annual rate / 12)" },
          { name: "n", description: "Total number of payments", source: "Lender product settings (years × 12)" }
        ],
        output: "Monthly P&I payment",
        example: {
          inputs: { P: 225000, annualRate: 7.5, termYears: 30 },
          result: "$1,574/month",
          explanation: "30-year amortization at 7.5% on $225,000 loan"
        }
      },
      {
        id: "monthly-taxes",
        name: "Monthly Property Taxes",
        description: "Monthly property tax payment",
        formula: "monthlyTaxes = annualTaxes / 12",
        formulaDisplay: "Monthly Taxes = Annual Taxes ÷ 12",
        inputs: [
          { name: "annualTaxes", description: "Annual property taxes", source: "User input or estimated" }
        ],
        output: "Monthly tax payment",
        example: {
          inputs: { annualTaxes: 3600 },
          result: "$300/month",
          explanation: "$3,600 ÷ 12 = $300/month"
        }
      },
      {
        id: "monthly-insurance",
        name: "Monthly Insurance",
        description: "Monthly property insurance payment",
        formula: "monthlyInsurance = annualInsurance / 12",
        formulaDisplay: "Monthly Insurance = Annual Insurance ÷ 12",
        inputs: [
          { name: "annualInsurance", description: "Annual insurance premium", source: "User input or estimated" }
        ],
        output: "Monthly insurance payment",
        example: {
          inputs: { annualInsurance: 1800 },
          result: "$150/month",
          explanation: "$1,800 ÷ 12 = $150/month"
        }
      },
      {
        id: "pitia",
        name: "PITIA (Total Monthly Payment)",
        description: "Principal, Interest, Taxes, Insurance, and Association fees combined",
        formula: "pitia = monthlyMortgage + monthlyTaxes + monthlyInsurance + monthlyHoa",
        formulaDisplay: "PITIA = P&I + Taxes + Insurance + HOA",
        inputs: [
          { name: "monthlyMortgage", description: "Monthly P&I payment", source: "Monthly Mortgage Payment calculation" },
          { name: "monthlyTaxes", description: "Monthly taxes", source: "Monthly Taxes calculation" },
          { name: "monthlyInsurance", description: "Monthly insurance", source: "Monthly Insurance calculation" },
          { name: "monthlyHoa", description: "Monthly HOA fees", source: "User input" }
        ],
        output: "Total monthly housing payment",
        example: {
          inputs: { monthlyMortgage: 1574, monthlyTaxes: 300, monthlyInsurance: 150, monthlyHoa: 0 },
          result: "$2,024/month",
          explanation: "$1,574 + $300 + $150 + $0 = $2,024"
        }
      },
      {
        id: "dscr",
        name: "DSCR (Debt Service Coverage Ratio)",
        description: "Ratio of monthly rent to total monthly debt payment. Measures ability to cover mortgage.",
        formula: "dscr = monthlyRent / pitia",
        formulaDisplay: "DSCR = Monthly Rent ÷ PITIA",
        inputs: [
          { name: "monthlyRent", description: "Monthly rental income", source: "Monthly Rent calculation" },
          { name: "pitia", description: "Total monthly payment", source: "PITIA calculation" }
        ],
        output: "DSCR ratio",
        example: {
          inputs: { monthlyRent: 2500, pitia: 2024 },
          result: "1.24",
          explanation: "$2,500 ÷ $2,024 = 1.24 DSCR"
        },
        notes: [
          "DSCR ≥ 1.25: Good - Most lenders accept",
          "DSCR 1.00-1.24: Caution - Limited lender options",
          "DSCR < 1.00: Poor - Rent doesn't cover payment, few lenders accept"
        ]
      }
    ]
  },
  {
    id: "cash-sale",
    name: "Cash Sale (No Financing)",
    description: "Calculations for all-cash purchase scenario",
    calculations: [
      {
        id: "cash-sale-investment",
        name: "Cash Sale Total Investment",
        description: "Total cash needed to complete deal without financing",
        formula: "cashInvestment = purchasePrice + rehabBudget + closingCostsBuy + totalCarryingCosts",
        formulaDisplay: "Cash Investment = Purchase + Rehab + Closing + Carrying",
        inputs: [
          { name: "purchasePrice", description: "Purchase price", source: "User input (Step 3)" },
          { name: "rehabBudget", description: "Rehab budget", source: "User input (Step 3)" },
          { name: "closingCostsBuy", description: "Closing costs", source: "User input (Step 4)" },
          { name: "totalCarryingCosts", description: "Total carrying costs (no loan payment)", source: "Carrying Costs calculation" }
        ],
        output: "Total cash investment",
        example: {
          inputs: { purchasePrice: 200000, rehabBudget: 50000, closingCostsBuy: 5000, totalCarryingCosts: 2400 },
          result: "$257,400",
          explanation: "$200,000 + $50,000 + $5,000 + $2,400 = $257,400 (carrying costs lower without loan payment)"
        }
      },
      {
        id: "cash-sale-profit",
        name: "Cash Sale Profit",
        description: "Net profit from all-cash purchase",
        formula: "cashProfit = sellPrice - cashInvestment - closingCostsSell - commission",
        formulaDisplay: "Profit = Sell Price - Investment - Closing - Commission",
        inputs: [
          { name: "sellPrice", description: "Sale price", source: "Sell Price calculation" },
          { name: "cashInvestment", description: "Total cash invested", source: "Cash Sale Investment calculation" },
          { name: "closingCostsSell", description: "Selling closing costs", source: "Closing Costs (Sell) calculation" },
          { name: "commission", description: "Agent commission", source: "Agent Commission calculation" }
        ],
        output: "Net profit from cash deal",
        example: {
          inputs: { sellPrice: 300000, cashInvestment: 257400, closingCostsSell: 5000, commission: 15000 },
          result: "$22,600",
          explanation: "$300,000 - $257,400 - $5,000 - $15,000 = $22,600"
        },
        notes: [
          "Cash deals typically show higher absolute profit but lower cash-on-cash ROI",
          "No interest, points, or lender fees to pay"
        ]
      },
      {
        id: "cash-sale-roi",
        name: "Cash Sale ROI",
        description: "Return on investment for all-cash deal",
        formula: "cashRoi = (cashProfit / cashInvestment) × 100",
        formulaDisplay: "ROI = (Profit ÷ Investment) × 100%",
        inputs: [
          { name: "cashProfit", description: "Cash sale profit", source: "Cash Sale Profit calculation" },
          { name: "cashInvestment", description: "Total cash invested", source: "Cash Sale Investment calculation" }
        ],
        output: "Cash sale ROI percentage",
        example: {
          inputs: { cashProfit: 22600, cashInvestment: 257400 },
          result: "8.78%",
          explanation: "($22,600 ÷ $257,400) × 100 = 8.78%"
        },
        notes: [
          "For cash sales, ROI equals Cash-on-Cash ROI since all investment is cash",
          "Compare to financed deals to see the benefit of leverage"
        ]
      }
    ]
  }
];

export function getAllCalculations(): CalculationDefinition[] {
  return calculationCategories.flatMap(cat => cat.calculations);
}

export function searchCalculations(query: string): CalculationDefinition[] {
  const lowerQuery = query.toLowerCase();
  return getAllCalculations().filter(calc => 
    calc.name.toLowerCase().includes(lowerQuery) ||
    calc.description.toLowerCase().includes(lowerQuery) ||
    calc.formula.toLowerCase().includes(lowerQuery)
  );
}
