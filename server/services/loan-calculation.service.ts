import type { LoanProduct, LoanComparisonColumn } from "@shared/schema";
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
  isLtcWeighted?: boolean;
  maxLtcPercent?: number;
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
  maxLoanArv: number,
  isLtcWeighted: boolean = false,
  maxLtcPercent?: number
): {
  buyLoanAmount: number;
  rehabLoanAmount: number;
  totalLoanAmount: number;
  arvCapAdjustment: number;
  ltcCapAdjustment: number;
  finalLoanAmount: number;
  additionalDownPayment: number;
  effectiveBuyPercent: number;
  isLtcAdjusted: boolean;
} {
  const totalProjectCost = purchasePrice + rehabBudget;
  
  let buyLoanAmount = purchasePrice * (maxLtvBuy / 100);
  let rehabLoanAmount = rehabBudget * (maxLendRehab / 100);
  let totalLoanAmount = buyLoanAmount + rehabLoanAmount;
  
  let arvCapAdjustment = 0;
  let ltcCapAdjustment = 0;
  let finalLoanAmount = totalLoanAmount;
  let additionalDownPayment = 0;
  let effectiveBuyPercent = maxLtvBuy;
  let isLtcAdjusted = false;
  
  const loanToArvRatio = (totalLoanAmount / arv) * 100;
  let arvCappedLoan = totalLoanAmount;
  
  if (loanToArvRatio > maxLoanArv) {
    arvCappedLoan = arv * (maxLoanArv / 100);
    arvCapAdjustment = totalLoanAmount - arvCappedLoan;
  }
  
  let ltcCappedLoan = totalLoanAmount;
  
  if (isLtcWeighted && maxLtcPercent && maxLtcPercent > 0) {
    const maxLtcLoan = totalProjectCost * (maxLtcPercent / 100);
    
    if (totalLoanAmount > maxLtcLoan) {
      ltcCappedLoan = maxLtcLoan;
      ltcCapAdjustment = totalLoanAmount - ltcCappedLoan;
    }
  }
  
  if (ltcCapAdjustment > 0 || arvCapAdjustment > 0) {
    if (ltcCappedLoan <= arvCappedLoan && ltcCapAdjustment > 0) {
      finalLoanAmount = ltcCappedLoan;
      isLtcAdjusted = true;
      additionalDownPayment = ltcCapAdjustment;
      
      rehabLoanAmount = rehabBudget * (maxLendRehab / 100);
      buyLoanAmount = finalLoanAmount - rehabLoanAmount;
      
      if (buyLoanAmount < 0) {
        buyLoanAmount = 0;
        rehabLoanAmount = finalLoanAmount;
      }
      
      if (purchasePrice > 0) {
        effectiveBuyPercent = (buyLoanAmount / purchasePrice) * 100;
      }
    } else if (arvCapAdjustment > 0) {
      finalLoanAmount = arvCappedLoan;
      additionalDownPayment = arvCapAdjustment;
    }
  }
  
  return {
    buyLoanAmount,
    rehabLoanAmount,
    totalLoanAmount: buyLoanAmount + rehabLoanAmount,
    arvCapAdjustment,
    ltcCapAdjustment,
    finalLoanAmount,
    additionalDownPayment,
    effectiveBuyPercent,
    isLtcAdjusted,
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

export interface OutOfPocketBreakdown {
  downPayment: number;
  baseClosingCosts: number;
  pointsCost: number;
  appraisalCost: number;
  lenderFees: number;
  totalClosingCostsBuy: number;
  carryingCosts: number;
  total: number;
}

export function calculateOutOfPocketWithBreakdown(
  purchasePrice: number,
  rehabBudget: number,
  baseClosingCostsBuy: number,
  monthlyCarryingCosts: number,
  projectLength: number,
  finalLoanAmount: number,
  points: number,
  pointsDeferred: boolean,
  interestDeferred: boolean,
  appraisalCost: number = 0,
  lenderFees: number = 0
): OutOfPocketBreakdown {
  const totalProjectCost = purchasePrice + rehabBudget;
  const downPayment = totalProjectCost - finalLoanAmount;
  
  // Points cost (only if not deferred)
  const pointsCost = pointsDeferred ? 0 : finalLoanAmount * (points / 100);
  
  // Total Closing Costs (Buy) = base + points + appraisal + lender fees
  const totalClosingCostsBuy = baseClosingCostsBuy + pointsCost + appraisalCost + lenderFees;
  
  // Carrying costs over project duration
  const carryingCosts = monthlyCarryingCosts * projectLength;
  
  // Total out of pocket
  const total = downPayment + totalClosingCostsBuy + carryingCosts;
  
  return {
    downPayment,
    baseClosingCosts: baseClosingCostsBuy,
    pointsCost,
    appraisalCost,
    lenderFees,
    totalClosingCostsBuy,
    carryingCosts,
    total,
  };
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
): LoanCalculation & { 
  totalInvestment: number; 
  totalProjectCost: number; 
  isLtcAdjusted?: boolean; 
  effectiveBuyPercent?: number;
  outOfPocketBreakdown: OutOfPocketBreakdown;
  totalClosingCostsBuy: number;
} {
  const drawSchedule = calculateDrawSchedule(dealInputs.projectLength, numberOfDraws, customDrawSchedule);
  
  const loanAmounts = calculateTwoStepLoanAmount(
    dealInputs.purchasePrice,
    dealInputs.rehabBudget,
    dealInputs.arv,
    loanInputs.maxLtvBuy,
    loanInputs.maxLendRehab,
    loanInputs.maxLoanArv,
    loanInputs.isLtcWeighted || false,
    loanInputs.maxLtcPercent
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
  
  // Calculate out of pocket with full breakdown
  const outOfPocketBreakdown = calculateOutOfPocketWithBreakdown(
    dealInputs.purchasePrice,
    dealInputs.rehabBudget,
    dealInputs.closingCostsBuy,
    monthlyCarryingCosts,
    dealInputs.projectLength,
    loanAmounts.finalLoanAmount,
    loanInputs.points,
    loanInputs.pointsDeferred,
    loanInputs.interestDeferred,
    loanInputs.appraisalCost,
    loanInputs.fees
  );
  
  const drawFees = loanInputs.costPerDraw * numberOfDraws;
  
  const totalProjectCost = dealInputs.purchasePrice + dealInputs.rehabBudget;
  const totalInvestment = totalProjectCost + outOfPocketBreakdown.totalClosingCostsBuy + (monthlyCarryingCosts * dealInputs.projectLength);
  
  const profit = calculateProfit(
    dealInputs.sellPrice,
    totalInvestment,
    dealInputs.closingCostsSell,
    dealInputs.commission,
    rolledCosts,
    drawFees
  );
  
  const roi = calculateROI(profit, totalInvestment);
  const cashOnCashRoi = calculateCashOnCashROI(profit, outOfPocketBreakdown.total);
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
    outOfPocketCost: outOfPocketBreakdown.total,
    outOfPocketBreakdown,
    totalClosingCostsBuy: outOfPocketBreakdown.totalClosingCostsBuy,
    profit,
    roi,
    cashOnCashRoi,
    annualizedRoi,
    totalInvestment,
    totalProjectCost,
  };
}

export function createCashSaleColumn(dealInputs: DealInputs): LoanComparisonColumn {
  const cashMetrics = calculateCashSaleMetrics(dealInputs);
  
  // For cash sales, breakdown is simpler - no lender fees, points, or appraisal
  const outOfPocketBreakdown: OutOfPocketBreakdown = {
    downPayment: cashMetrics.totalProjectCost, // Full amount is down payment
    baseClosingCosts: dealInputs.closingCostsBuy,
    pointsCost: 0,
    appraisalCost: 0,
    lenderFees: 0,
    totalClosingCostsBuy: dealInputs.closingCostsBuy,
    carryingCosts: dealInputs.carryingCosts,
    total: cashMetrics.outOfPocketCost,
  };
  
  return {
    type: 'cash',
    purchasePrice: dealInputs.purchasePrice,
    rehabBudget: dealInputs.rehabBudget,
    totalProjectCost: cashMetrics.totalProjectCost,
    closingCostsBuy: dealInputs.closingCostsBuy,
    carryingCosts: dealInputs.carryingCosts,
    totalInvestment: cashMetrics.totalInvestment,
    sellPrice: dealInputs.sellPrice,
    closingCostsSell: dealInputs.closingCostsSell,
    commission: dealInputs.commission,
    rolledCosts: 0,
    lenderDrawFees: 0,
    profit: cashMetrics.profit,
    outOfPocketCost: cashMetrics.outOfPocketCost,
    outOfPocketBreakdown,
    cashOnCashRoi: cashMetrics.cashOnCashRoi,
    annualizedRoi: cashMetrics.annualizedRoi,
    roi: cashMetrics.roi,
    percentageArv: cashMetrics.percentageArv,
  };
}

export function createLoanComparisonColumn(
  type: 'user-loan' | 'lender',
  dealInputs: DealInputs,
  loanInputs: LoanInputs,
  numberOfDraws: number = 3,
  customDrawSchedule?: DrawSchedule[],
  lenderInfo?: {
    lenderId: string;
    lenderName: string;
    productId: string;
    productName: string;
    timeToClose?: number;
    referralLink?: string;
  }
): LoanComparisonColumn {
  const loanCalculation = calculateLoanMetrics(dealInputs, loanInputs, numberOfDraws, customDrawSchedule);
  
  const percentageArv = dealInputs.arv > 0 
    ? (loanCalculation.totalProjectCost / dealInputs.arv) * 100 
    : 0;
    
  const percentageArvLender = loanInputs.maxLoanArv;
  
  return {
    type,
    lenderId: lenderInfo?.lenderId,
    lenderName: lenderInfo?.lenderName,
    productId: lenderInfo?.productId,
    productName: lenderInfo?.productName,
    timeToClose: lenderInfo?.timeToClose,
    maxLoanArv: loanInputs.maxLoanArv,
    referralLink: lenderInfo?.referralLink,
    interestRate: loanInputs.interestRate,
    maxLtvBuy: loanInputs.maxLtvBuy,
    points: loanInputs.points,
    isLtcWeighted: loanInputs.isLtcWeighted,
    maxLtcPercent: loanInputs.maxLtcPercent,
    isLtcAdjusted: loanCalculation.isLtcAdjusted,
    effectiveBuyPercent: loanCalculation.effectiveBuyPercent,
    purchasePrice: dealInputs.purchasePrice,
    rehabBudget: dealInputs.rehabBudget,
    totalProjectCost: loanCalculation.totalProjectCost,
    closingCostsBuy: loanCalculation.totalClosingCostsBuy, // Now includes points, appraisal, lender fees
    carryingCosts: loanCalculation.monthlyCarryingCosts * dealInputs.projectLength,
    totalInvestment: loanCalculation.totalInvestment,
    sellPrice: dealInputs.sellPrice,
    closingCostsSell: dealInputs.closingCostsSell,
    commission: dealInputs.commission,
    rolledCosts: loanCalculation.rolledCosts,
    lenderDrawFees: loanCalculation.drawFees,
    profit: loanCalculation.profit,
    outOfPocketCost: loanCalculation.outOfPocketCost,
    outOfPocketBreakdown: loanCalculation.outOfPocketBreakdown,
    cashOnCashRoi: loanCalculation.cashOnCashRoi,
    annualizedRoi: loanCalculation.annualizedRoi,
    roi: loanCalculation.roi,
    percentageArv,
    percentageArvLender,
    loanCalculation,
  };
}
