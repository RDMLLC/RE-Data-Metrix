import type { LoanProduct } from "@shared/schema";
import type { DrawSchedule, LoanCalculation } from "@shared/schema";

export interface DealInputs {
  purchasePrice: number;
  rehabBudget: number;
  arv: number;
  projectLength: number;
  
  closingCostsBuy: number;
  carryingCosts: number;
  
  sellPrice: number;
  closingCostsSell: number;
  commission: number;
  
  monthlyInsurance: number;
  monthlyUtilities: number;
  monthlyPropertyTax: number;
  monthlyHoa: number;
}

export interface LoanInputs {
  maxLtvBuy: number;
  maxLendRehab: number;
  maxLoanArv: number;
  interestRate: number;
  interestDeferred: boolean;
  drawnFundsOnly: boolean;
  points: number;
  pointsDeferred: boolean;
  fees: number;
  appraisalCost: number;
  costPerDraw: number;
}

export interface UserLoanInputs {
  desiredLoanAmount?: number;
  interestRate: number;
  interestDeferred: boolean;
  points: number;
  pointsDeferred: boolean;
  maxLoanToArv?: number;
  appraisalRequired: boolean;
  appraisalFee?: number;
  drawFees?: number;
  loanDocPrepFees?: number;
}

export function calculateDrawSchedule(
  projectLength: number,
  numberOfDraws: number = 3,
  customSchedule?: DrawSchedule[]
): DrawSchedule[] {
  if (customSchedule && customSchedule.length > 0) {
    return customSchedule;
  }
  
  const projectDays = projectLength * 30;
  const twoWeeks = 14;
  const twoMonths = 60;
  
  if (projectDays <= twoWeeks + twoMonths) {
    return [{
      drawNumber: 1,
      timingInDays: twoWeeks,
      amount: 100,
    }];
  }
  
  const activePeriodDays = projectDays - twoWeeks - twoMonths;
  
  const draws: DrawSchedule[] = [];
  const intervalDays = activePeriodDays / numberOfDraws;
  
  for (let i = 0; i < numberOfDraws; i++) {
    draws.push({
      drawNumber: i + 1,
      timingInDays: Math.round(twoWeeks + (i * intervalDays)),
      amount: 100 / numberOfDraws,
    });
  }
  
  return draws;
}

export function calculateTwoStepLoanAmount(
  purchasePrice: number,
  rehabBudget: number,
  arv: number,
  maxLtvBuy: number,
  maxLendRehab: number,
  maxLoanArv: number
): {
  buyLoanAmount: number;
  rehabLoanAmount: number;
  totalLoanAmount: number;
  arvCapAdjustment: number;
  finalLoanAmount: number;
  additionalDownPayment: number;
} {
  const buyLoanAmount = purchasePrice * (maxLtvBuy / 100);
  const rehabLoanAmount = rehabBudget * (maxLendRehab / 100);
  const totalLoanAmount = buyLoanAmount + rehabLoanAmount;
  
  const loanToArvRatio = (totalLoanAmount / arv) * 100;
  
  let arvCapAdjustment = 0;
  let finalLoanAmount = totalLoanAmount;
  let additionalDownPayment = 0;
  
  if (loanToArvRatio > maxLoanArv) {
    const maxAllowedLoan = arv * (maxLoanArv / 100);
    arvCapAdjustment = totalLoanAmount - maxAllowedLoan;
    finalLoanAmount = maxAllowedLoan;
    additionalDownPayment = arvCapAdjustment;
  }
  
  return {
    buyLoanAmount,
    rehabLoanAmount,
    totalLoanAmount,
    arvCapAdjustment,
    finalLoanAmount,
    additionalDownPayment,
  };
}

export function calculateBuyLoanInterest(
  buyLoanAmount: number,
  interestRate: number,
  projectLength: number,
  interestDeferred: boolean
): number {
  const monthlyInterestRate = interestRate / 100 / 12;
  const monthlyInterest = buyLoanAmount * monthlyInterestRate;
  const totalInterest = monthlyInterest * projectLength;
  
  return totalInterest;
}

export function calculateRehabLoanInterest(
  rehabLoanAmount: number,
  interestRate: number,
  projectLength: number,
  drawnFundsOnly: boolean,
  drawSchedule: DrawSchedule[]
): number {
  if (!drawnFundsOnly) {
    const monthlyInterestRate = interestRate / 100 / 12;
    const monthlyInterest = rehabLoanAmount * monthlyInterestRate;
    return monthlyInterest * projectLength;
  }
  
  const monthlyInterestRate = interestRate / 100 / 12;
  const projectDays = projectLength * 30;
  
  let totalInterest = 0;
  
  for (const draw of drawSchedule) {
    const drawAmount = rehabLoanAmount * (draw.amount / 100);
    const daysRemaining = projectDays - draw.timingInDays;
    const monthsRemaining = daysRemaining / 30;
    
    const drawInterest = drawAmount * monthlyInterestRate * monthsRemaining;
    totalInterest += drawInterest;
  }
  
  return totalInterest;
}

export function calculateMonthlyPayment(
  buyLoanAmount: number,
  rehabDrawnAmount: number,
  interestRate: number
): number {
  const monthlyInterestRate = interestRate / 100 / 12;
  const totalOutstanding = buyLoanAmount + rehabDrawnAmount;
  return totalOutstanding * monthlyInterestRate;
}

export function calculateMonthlyCarryingCosts(
  monthlyLoanPayment: number,
  monthlyInsurance: number,
  monthlyUtilities: number,
  monthlyPropertyTax: number,
  monthlyHoa: number
): number {
  return monthlyLoanPayment + monthlyInsurance + monthlyUtilities + monthlyPropertyTax + monthlyHoa;
}

export function calculateRolledCosts(
  totalInterest: number,
  interestDeferred: boolean,
  points: number,
  pointsDeferred: boolean,
  finalLoanAmount: number
): number {
  let rolledCosts = 0;
  
  if (interestDeferred) {
    rolledCosts += totalInterest;
  }
  
  if (pointsDeferred) {
    rolledCosts += finalLoanAmount * (points / 100);
  }
  
  return rolledCosts;
}

export function calculateOutOfPocketCost(
  purchasePrice: number,
  rehabBudget: number,
  closingCostsBuy: number,
  monthlyCarryingCosts: number,
  projectLength: number,
  finalLoanAmount: number,
  points: number,
  pointsDeferred: boolean,
  interestDeferred: boolean
): number {
  const totalProjectCost = purchasePrice + rehabBudget;
  const downPayment = totalProjectCost - finalLoanAmount;
  
  let upfrontCosts = downPayment + closingCostsBuy;
  
  if (!pointsDeferred) {
    upfrontCosts += finalLoanAmount * (points / 100);
  }
  
  const totalCarryingCosts = monthlyCarryingCosts * projectLength;
  
  return upfrontCosts + totalCarryingCosts;
}

export function calculateProfit(
  sellPrice: number,
  totalInvestment: number,
  closingCostsSell: number,
  commission: number,
  rolledCosts: number,
  lenderDrawFees: number
): number {
  return sellPrice - totalInvestment - closingCostsSell - commission - rolledCosts - lenderDrawFees;
}

export function calculateROI(
  profit: number,
  totalInvestment: number
): number {
  if (totalInvestment === 0) return 0;
  return (profit / totalInvestment) * 100;
}

export function calculateCashOnCashROI(
  profit: number,
  outOfPocketCost: number
): number {
  if (outOfPocketCost === 0) return 0;
  return (profit / outOfPocketCost) * 100;
}

export function calculateAnnualizedROI(
  cashOnCashRoi: number,
  projectLength: number
): number {
  if (projectLength === 0) return 0;
  return cashOnCashRoi * (12 / projectLength);
}

export function calculateCashSaleMetrics(dealInputs: DealInputs) {
  const totalProjectCost = dealInputs.purchasePrice + dealInputs.rehabBudget;
  const totalInvestment = totalProjectCost + dealInputs.closingCostsBuy + dealInputs.carryingCosts;
  
  const profit = dealInputs.sellPrice - totalInvestment - dealInputs.closingCostsSell - dealInputs.commission;
  
  const roi = calculateROI(profit, totalInvestment);
  const cashOnCashRoi = calculateCashOnCashROI(profit, totalInvestment);
  const annualizedRoi = calculateAnnualizedROI(cashOnCashRoi, dealInputs.projectLength);
  
  const percentageArv = dealInputs.arv > 0 ? (totalProjectCost / dealInputs.arv) * 100 : 0;
  
  return {
    purchasePrice: dealInputs.purchasePrice,
    rehabBudget: dealInputs.rehabBudget,
    totalProjectCost,
    closingCostsBuy: dealInputs.closingCostsBuy,
    carryingCosts: dealInputs.carryingCosts,
    totalInvestment,
    sellPrice: dealInputs.sellPrice,
    closingCostsSell: dealInputs.closingCostsSell,
    commission: dealInputs.commission,
    profit,
    outOfPocketCost: totalInvestment,
    roi,
    cashOnCashRoi,
    annualizedRoi,
    percentageArv,
  };
}

export function calculateLoanMetrics(
  dealInputs: DealInputs,
  loanInputs: LoanInputs,
  numberOfDraws: number = 3,
  customDrawSchedule?: DrawSchedule[]
): LoanCalculation & { totalInvestment: number; totalProjectCost: number } {
  const drawSchedule = calculateDrawSchedule(dealInputs.projectLength, numberOfDraws, customDrawSchedule);
  
  const loanAmounts = calculateTwoStepLoanAmount(
    dealInputs.purchasePrice,
    dealInputs.rehabBudget,
    dealInputs.arv,
    loanInputs.maxLtvBuy,
    loanInputs.maxLendRehab,
    loanInputs.maxLoanArv
  );
  
  const buyInterest = calculateBuyLoanInterest(
    loanAmounts.buyLoanAmount,
    loanInputs.interestRate,
    dealInputs.projectLength,
    loanInputs.interestDeferred
  );
  
  const rehabInterest = calculateRehabLoanInterest(
    loanAmounts.rehabLoanAmount,
    loanInputs.interestRate,
    dealInputs.projectLength,
    loanInputs.drawnFundsOnly,
    drawSchedule
  );
  
  const totalInterest = buyInterest + rehabInterest;
  
  const monthlyPayment = loanInputs.interestDeferred 
    ? 0 
    : calculateMonthlyPayment(loanAmounts.buyLoanAmount, loanAmounts.rehabLoanAmount, loanInputs.interestRate);
  
  const monthlyCarryingCosts = calculateMonthlyCarryingCosts(
    monthlyPayment,
    dealInputs.monthlyInsurance,
    dealInputs.monthlyUtilities,
    dealInputs.monthlyPropertyTax,
    dealInputs.monthlyHoa
  );
  
  const rolledCosts = calculateRolledCosts(
    totalInterest,
    loanInputs.interestDeferred,
    loanInputs.points,
    loanInputs.pointsDeferred,
    loanAmounts.finalLoanAmount
  );
  
  const outOfPocketCost = calculateOutOfPocketCost(
    dealInputs.purchasePrice,
    dealInputs.rehabBudget,
    dealInputs.closingCostsBuy,
    monthlyCarryingCosts,
    dealInputs.projectLength,
    loanAmounts.finalLoanAmount,
    loanInputs.points,
    loanInputs.pointsDeferred,
    loanInputs.interestDeferred
  );
  
  const drawFees = loanInputs.costPerDraw * numberOfDraws;
  
  const totalProjectCost = dealInputs.purchasePrice + dealInputs.rehabBudget;
  const totalInvestment = totalProjectCost + dealInputs.closingCostsBuy + (monthlyCarryingCosts * dealInputs.projectLength);
  
  const profit = calculateProfit(
    dealInputs.sellPrice,
    totalInvestment,
    dealInputs.closingCostsSell,
    dealInputs.commission,
    rolledCosts,
    drawFees
  );
  
  const roi = calculateROI(profit, totalInvestment);
  const cashOnCashRoi = calculateCashOnCashROI(profit, outOfPocketCost);
  const annualizedRoi = calculateAnnualizedROI(cashOnCashRoi, dealInputs.projectLength);
  
  return {
    ...loanAmounts,
    buyInterest,
    rehabInterest,
    totalInterest,
    points: loanAmounts.finalLoanAmount * (loanInputs.points / 100),
    pointsDeferred: loanInputs.pointsDeferred,
    fees: loanInputs.fees,
    appraisalCost: loanInputs.appraisalCost,
    drawFees,
    monthlyPayment,
    monthlyCarryingCosts,
    rolledCosts,
    outOfPocketCost,
    profit,
    roi,
    cashOnCashRoi,
    annualizedRoi,
    totalInvestment,
    totalProjectCost,
  };
}
