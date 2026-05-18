export interface RentalExpenseItem {
  amount: number;
  annualIncrease: number;
}

export interface RentalInputs {
  purchasePrice: number;
  useLoan: boolean;
  downPaymentPct: number;
  interestRate: number;
  loanTerm: number;
  closingCost: number;
  needsRepairs: boolean;
  repairCost: number;
  valueAfterRepairs: number;
  propertyTax: RentalExpenseItem;
  totalInsurance: RentalExpenseItem;
  hoaFee: RentalExpenseItem;
  maintenance: RentalExpenseItem;
  otherCosts: RentalExpenseItem;
  monthlyRent: number;
  rentAnnualIncrease: number;
  otherMonthlyIncome: number;
  otherIncomeAnnualIncrease: number;
  vacancyRate: number;
  managementFee: number;
  knowSellPrice: boolean;
  sellPrice: number;
  valueAppreciation: number;
  holdingLength: number;
  costToSell: number;
}

export interface YearRow {
  year: number;
  grossIncome: number;
  operatingExpenses: number;
  mortgagePayment: number;
  cashFlow: number;
  cumulativeCashFlow: number;
}

export interface RentalResults {
  loanAmount: number;
  downPayment: number;
  totalInvestment: number;
  monthlyPayment: number;
  annualGrossIncome: number;
  annualOperatingExpenses: number;
  noi: number;
  capRate: number;
  annualCashFlow: number;
  monthlyCashFlow: number;
  cashOnCashReturn: number;
  yearByYear: YearRow[];
  finalSellPrice: number;
  remainingBalanceAtSale: number;
  netSaleProceeds: number;
  equityAtSale: number;
  cumulativeCashFlow: number;
  totalProfit: number;
  irr: number | null;
}

function pow(base: number, exp: number): number {
  return Math.pow(base, exp);
}

export function remainingBalance(
  loanAmount: number,
  monthlyRate: number,
  monthlyPayment: number,
  monthsElapsed: number
): number {
  if (loanAmount <= 0) return 0;
  if (monthlyRate <= 0) {
    return Math.max(0, loanAmount - monthlyPayment * monthsElapsed);
  }
  const k = monthsElapsed;
  const bal =
    loanAmount * pow(1 + monthlyRate, k) -
    monthlyPayment * ((pow(1 + monthlyRate, k) - 1) / monthlyRate);
  return Math.max(0, bal);
}

function npv(rate: number, cashFlows: number[]): number {
  let sum = 0;
  for (let i = 0; i < cashFlows.length; i++) {
    sum += cashFlows[i] / pow(1 + rate, i);
  }
  return sum;
}

export function irrBisection(cashFlows: number[]): number | null {
  if (cashFlows.length < 2) return null;
  let hasPos = false;
  let hasNeg = false;
  for (const cf of cashFlows) {
    if (cf > 0) hasPos = true;
    if (cf < 0) hasNeg = true;
  }
  if (!hasPos || !hasNeg) return null;

  let low = -0.99;
  let high = 5.0;
  let npvLow = npv(low, cashFlows);
  let npvHigh = npv(high, cashFlows);

  if (npvLow * npvHigh > 0) {
    let expanded = false;
    for (let h = 5; h <= 50; h += 5) {
      const v = npv(h, cashFlows);
      if (v * npvLow < 0) {
        high = h;
        npvHigh = v;
        expanded = true;
        break;
      }
    }
    if (!expanded) return null;
  }

  for (let i = 0; i < 200; i++) {
    const mid = (low + high) / 2;
    const npvMid = npv(mid, cashFlows);
    if (Math.abs(npvMid) < 1e-7 || (high - low) / 2 < 0.00001) {
      return mid;
    }
    if (npvMid * npvLow < 0) {
      high = mid;
      npvHigh = npvMid;
    } else {
      low = mid;
      npvLow = npvMid;
    }
  }
  return (low + high) / 2;
}

export function calculateRental(inputs: RentalInputs): RentalResults {
  const {
    purchasePrice,
    useLoan,
    downPaymentPct,
    interestRate,
    loanTerm,
    closingCost,
    needsRepairs,
    repairCost,
    valueAfterRepairs,
    propertyTax,
    totalInsurance,
    hoaFee,
    maintenance,
    otherCosts,
    monthlyRent,
    rentAnnualIncrease,
    otherMonthlyIncome,
    otherIncomeAnnualIncrease,
    vacancyRate,
    managementFee,
    knowSellPrice,
    sellPrice,
    valueAppreciation,
    holdingLength,
    costToSell,
  } = inputs;

  const loanAmount = useLoan ? purchasePrice * (1 - downPaymentPct / 100) : 0;
  const downPayment = purchasePrice - loanAmount;
  const totalInvestment =
    downPayment + closingCost + (needsRepairs ? repairCost : 0);

  const monthlyRate = interestRate / 100 / 12;
  const numPayments = loanTerm * 12;
  const monthlyPayment =
    useLoan && monthlyRate > 0
      ? (loanAmount *
          (monthlyRate * pow(1 + monthlyRate, numPayments))) /
        (pow(1 + monthlyRate, numPayments) - 1)
      : 0;

  const occ = 1 - vacancyRate / 100;
  const annualRent = monthlyRent * 12 * occ;
  const annualOtherIncome = otherMonthlyIncome * 12 * occ;
  const annualGrossIncome = annualRent + annualOtherIncome;

  const mgmtFee1 = annualGrossIncome * (managementFee / 100);
  const annualOperatingExpenses =
    propertyTax.amount +
    totalInsurance.amount +
    hoaFee.amount +
    maintenance.amount +
    otherCosts.amount +
    mgmtFee1;

  const noi = annualGrossIncome - annualOperatingExpenses;
  const propertyValue = needsRepairs ? valueAfterRepairs : purchasePrice;
  const capRate = propertyValue > 0 ? (noi / propertyValue) * 100 : 0;

  const annualMortgage = monthlyPayment * 12;
  const annualCashFlow = noi - annualMortgage;
  const monthlyCashFlow = annualCashFlow / 12;
  const cashOnCashReturn =
    totalInvestment > 0 ? (annualCashFlow / totalInvestment) * 100 : 0;

  const years = Math.max(1, Math.floor(holdingLength));
  const yearByYear: YearRow[] = [];
  let cumulative = 0;

  for (let y = 1; y <= years; y++) {
    const rentY =
      monthlyRent * 12 * occ * pow(1 + rentAnnualIncrease / 100, y - 1);
    const otherY =
      otherMonthlyIncome *
      12 *
      occ *
      pow(1 + otherIncomeAnnualIncrease / 100, y - 1);
    const grossY = rentY + otherY;

    const ptY =
      propertyTax.amount * pow(1 + propertyTax.annualIncrease / 100, y - 1);
    const insY =
      totalInsurance.amount *
      pow(1 + totalInsurance.annualIncrease / 100, y - 1);
    const hoaY = hoaFee.amount * pow(1 + hoaFee.annualIncrease / 100, y - 1);
    const maintY =
      maintenance.amount * pow(1 + maintenance.annualIncrease / 100, y - 1);
    const otherCostsY =
      otherCosts.amount * pow(1 + otherCosts.annualIncrease / 100, y - 1);
    const mgmtY = grossY * (managementFee / 100);
    const expY = ptY + insY + hoaY + maintY + otherCostsY + mgmtY;

    // Mortgage only paid while loan is active. If holding past loan payoff,
    // partial-year mortgage in the payoff year is prorated by months remaining.
    let mortgageY = 0;
    if (monthlyPayment > 0) {
      const monthsStart = (y - 1) * 12;
      const monthsEnd = y * 12;
      const activeMonths = Math.max(
        0,
        Math.min(numPayments, monthsEnd) - Math.min(numPayments, monthsStart)
      );
      mortgageY = monthlyPayment * activeMonths;
    }

    const cf = grossY - expY - mortgageY;
    cumulative += cf;

    yearByYear.push({
      year: y,
      grossIncome: grossY,
      operatingExpenses: expY,
      mortgagePayment: mortgageY,
      cashFlow: cf,
      cumulativeCashFlow: cumulative,
    });
  }

  const finalSellPrice = knowSellPrice
    ? sellPrice
    : (needsRepairs ? valueAfterRepairs : purchasePrice) *
      pow(1 + valueAppreciation / 100, years);

  const remainingBalanceAtSale = remainingBalance(
    loanAmount,
    monthlyRate,
    monthlyPayment,
    Math.min(numPayments, years * 12)
  );

  const netSaleProceeds =
    finalSellPrice * (1 - costToSell / 100) - remainingBalanceAtSale;
  const equityAtSale = finalSellPrice - remainingBalanceAtSale;
  const totalProfit = netSaleProceeds - totalInvestment + cumulative;

  const cashFlows: number[] = [-totalInvestment];
  for (let i = 0; i < yearByYear.length; i++) {
    if (i === yearByYear.length - 1) {
      cashFlows.push(yearByYear[i].cashFlow + netSaleProceeds);
    } else {
      cashFlows.push(yearByYear[i].cashFlow);
    }
  }
  const irr = irrBisection(cashFlows);

  return {
    loanAmount,
    downPayment,
    totalInvestment,
    monthlyPayment,
    annualGrossIncome,
    annualOperatingExpenses,
    noi,
    capRate,
    annualCashFlow,
    monthlyCashFlow,
    cashOnCashReturn,
    yearByYear,
    finalSellPrice,
    remainingBalanceAtSale,
    netSaleProceeds,
    equityAtSale,
    cumulativeCashFlow: cumulative,
    totalProfit,
    irr: irr === null ? null : irr * 100,
  };
}

export const defaultRentalInputs: RentalInputs = {
  purchasePrice: 200000,
  useLoan: true,
  downPaymentPct: 20,
  interestRate: 6,
  loanTerm: 30,
  closingCost: 6000,
  needsRepairs: false,
  repairCost: 0,
  valueAfterRepairs: 0,
  propertyTax: { amount: 3000, annualIncrease: 3 },
  totalInsurance: { amount: 1200, annualIncrease: 3 },
  hoaFee: { amount: 0, annualIncrease: 3 },
  maintenance: { amount: 2000, annualIncrease: 3 },
  otherCosts: { amount: 500, annualIncrease: 3 },
  monthlyRent: 2000,
  rentAnnualIncrease: 3,
  otherMonthlyIncome: 0,
  otherIncomeAnnualIncrease: 3,
  vacancyRate: 5,
  managementFee: 0,
  knowSellPrice: false,
  sellPrice: 0,
  valueAppreciation: 3,
  holdingLength: 20,
  costToSell: 8,
};
