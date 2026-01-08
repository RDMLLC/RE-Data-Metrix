/**
 * Wholesale Deal Calculations
 * 
 * This module contains all calculation logic for wholesale deals including:
 * - Assignment deals (simple wholesale fee calculation)
 * - Double close transactions (includes closing costs for Transaction 1)
 * - Transactional lender fee calculations
 */

export interface WholesaleInputs {
  arv: number;
  rehabBudget: number;
  buyersMaxArvPercent: number;
  wholesaleFee: number;
}

export interface DoubleCloseClosingCosts {
  titleSearch: number;
  titleInsurance: number;
  settlementFee: number;
  recordingFees: number;
  transferTax: number;
  attorneyFees: number;
  otherFees: number;
}

export interface TransactionalLenderFees {
  flatFee: number;
  pointsPercent: number;
  referralPointsPercent: number;
}

export interface WholesaleResult {
  buyersMaxPrice: number;
  maxOfferPrice: number;
  wholesaleProfit: number;
}

export interface DoubleCloseResult extends WholesaleResult {
  totalClosingCosts: number;
  closingCostsBreakdown: DoubleCloseClosingCosts;
}

export interface TransactionalLenderResult {
  lenderId: string;
  lenderName: string;
  flatFee: number;
  pointsPercent: number;
  totalPointsWithReferral: number;
  pointsCost: number;
  totalLenderFees: number;
  adjustedMaxOfferPrice: number;
  wholesaleProfit: number;
}

export const REFERRAL_POINTS_PERCENT = 0.5;

export const DEFAULT_CLOSING_COSTS: DoubleCloseClosingCosts = {
  titleSearch: 250,
  titleInsurance: 500,
  settlementFee: 500,
  recordingFees: 150,
  transferTax: 0,
  attorneyFees: 500,
  otherFees: 0,
};

/**
 * Calculate max offer price for an Assignment deal
 * Formula: ARV × Buyer's Max % - Rehab Budget - Wholesale Fee = Max Offer Price
 */
export function calculateAssignmentMaxOffer(inputs: WholesaleInputs): WholesaleResult {
  const buyersMaxPrice = inputs.arv * (inputs.buyersMaxArvPercent / 100);
  const maxOfferPrice = buyersMaxPrice - inputs.rehabBudget - inputs.wholesaleFee;
  
  return {
    buyersMaxPrice,
    maxOfferPrice: Math.max(0, maxOfferPrice),
    wholesaleProfit: inputs.wholesaleFee,
  };
}

/**
 * Calculate total closing costs for Transaction 1 of a double close
 */
export function calculateTotalClosingCosts(costs: DoubleCloseClosingCosts): number {
  return (
    costs.titleSearch +
    costs.titleInsurance +
    costs.settlementFee +
    costs.recordingFees +
    costs.transferTax +
    costs.attorneyFees +
    costs.otherFees
  );
}

/**
 * Calculate max offer price for a Double Close deal
 * Formula: ARV × Buyer's Max % - Rehab Budget - Wholesale Fee - Closing Costs = Max Offer Price
 */
export function calculateDoubleCloseMaxOffer(
  inputs: WholesaleInputs,
  closingCosts: DoubleCloseClosingCosts
): DoubleCloseResult {
  const buyersMaxPrice = inputs.arv * (inputs.buyersMaxArvPercent / 100);
  const totalClosingCosts = calculateTotalClosingCosts(closingCosts);
  const maxOfferPrice = buyersMaxPrice - inputs.rehabBudget - inputs.wholesaleFee - totalClosingCosts;
  
  return {
    buyersMaxPrice,
    maxOfferPrice: Math.max(0, maxOfferPrice),
    wholesaleProfit: inputs.wholesaleFee,
    totalClosingCosts,
    closingCostsBreakdown: closingCosts,
  };
}

/**
 * Calculate transactional lender fees and adjusted max offer price
 * Points cost is calculated on the purchase price (max offer price before lender fees)
 */
export function calculateTransactionalLenderFees(
  baseMaxOfferPrice: number,
  lenderFlatFee: number,
  lenderPointsPercent: number,
  wholesaleFee: number
): {
  totalPointsWithReferral: number;
  pointsCost: number;
  totalLenderFees: number;
  adjustedMaxOfferPrice: number;
  adjustedWholesaleProfit: number;
} {
  const totalPointsWithReferral = lenderPointsPercent + REFERRAL_POINTS_PERCENT;
  
  // Points are calculated on the loan amount (which equals the purchase price in transactional funding)
  // We need to solve for the price where: price + (price * points%) + flatFee = baseMaxOfferPrice
  // price * (1 + points%) = baseMaxOfferPrice - flatFee
  // price = (baseMaxOfferPrice - flatFee) / (1 + points%)
  const pointsMultiplier = 1 + (totalPointsWithReferral / 100);
  const adjustedMaxOfferPrice = (baseMaxOfferPrice - lenderFlatFee) / pointsMultiplier;
  
  const pointsCost = adjustedMaxOfferPrice * (totalPointsWithReferral / 100);
  const totalLenderFees = lenderFlatFee + pointsCost;
  
  return {
    totalPointsWithReferral,
    pointsCost: Math.round(pointsCost * 100) / 100,
    totalLenderFees: Math.round(totalLenderFees * 100) / 100,
    adjustedMaxOfferPrice: Math.max(0, Math.round(adjustedMaxOfferPrice * 100) / 100),
    adjustedWholesaleProfit: wholesaleFee,
  };
}

/**
 * Calculate complete transactional lender result
 */
export function calculateTransactionalLenderResult(
  lenderId: string,
  lenderName: string,
  baseMaxOfferPrice: number,
  lenderFlatFee: number,
  lenderPointsPercent: number,
  wholesaleFee: number
): TransactionalLenderResult {
  const fees = calculateTransactionalLenderFees(
    baseMaxOfferPrice,
    lenderFlatFee,
    lenderPointsPercent,
    wholesaleFee
  );
  
  return {
    lenderId,
    lenderName,
    flatFee: lenderFlatFee,
    pointsPercent: lenderPointsPercent,
    totalPointsWithReferral: fees.totalPointsWithReferral,
    pointsCost: fees.pointsCost,
    totalLenderFees: fees.totalLenderFees,
    adjustedMaxOfferPrice: fees.adjustedMaxOfferPrice,
    wholesaleProfit: wholesaleFee,
  };
}

/**
 * Estimate closing costs based on purchase price
 * Returns default values with transfer tax estimated as percentage of purchase price
 */
export function estimateClosingCosts(
  purchasePrice: number,
  transferTaxRate: number = 0
): DoubleCloseClosingCosts {
  return {
    ...DEFAULT_CLOSING_COSTS,
    transferTax: purchasePrice * (transferTaxRate / 100),
  };
}
