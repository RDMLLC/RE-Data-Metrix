/**
 * Wholesale Deal Calculations
 * 
 * This module contains all calculation logic for wholesale deals including:
 * - Assignment deals (simple wholesale fee calculation)
 * - Double close transactions (includes closing costs for Transaction 1)
 * - Transactional lender fee calculations
 */

import { calculateTransferTax } from '../data/transferTaxRates';

export interface WholesaleInputs {
  arv: number;
  rehabBudget: number;
  buyersMaxArvPercent: number;
  wholesaleFee: number;
}

export interface DoubleCloseClosingCosts {
  titleSearch: number;
  titleInsurance: number;
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
  lenderFee: number;
}

// Straightline Funding lender fee constants
export const LENDER_FEE_RATE = 0.0125; // 1.25%
export const LENDER_FEE_MINIMUM = 1000; // $1,000 minimum fee

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

// Default closing costs matching the main deal analysis calculations
// Title Insurance and Transfer Tax should be calculated dynamically based on purchase price and state
export const DEFAULT_CLOSING_COSTS: DoubleCloseClosingCosts = {
  titleSearch: 250,       // Title Exam default from Step5
  titleInsurance: 0,      // Should be calculated as 1.2% of purchase price
  recordingFees: 150,     // Recording fees
  transferTax: 0,         // Should be calculated based on state
  attorneyFees: 750,      // Attorney Fees default from Step5
  otherFees: 0,
};

// Calculate dynamic closing costs based on purchase price and state
// Uses calculateTransferTax from shared/data/transferTaxRates.ts as single source of truth
export function calculateDynamicClosingCosts(
  purchasePrice: number,
  stateCode: string
): DoubleCloseClosingCosts {
  // Title Insurance calculated as 1.2% of purchase price (matching Step5)
  const titleInsurance = Math.round(purchasePrice * 0.012);
  
  // Use the canonical transfer tax calculation from shared/data/transferTaxRates.ts
  const transferTax = calculateTransferTax(stateCode, purchasePrice);
  
  return {
    titleSearch: 250,
    titleInsurance,
    recordingFees: 150,
    transferTax,
    attorneyFees: 750,
    otherFees: 0,
  };
}

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
    costs.recordingFees +
    costs.transferTax +
    costs.attorneyFees +
    costs.otherFees
  );
}

/**
 * Calculate the lender fee for a given purchase price
 * Fee is 1.25% of purchase price with a $1,000 minimum
 */
export function calculateLenderFee(purchasePrice: number): number {
  const calculatedFee = purchasePrice * LENDER_FEE_RATE;
  return Math.max(calculatedFee, LENDER_FEE_MINIMUM);
}

/**
 * Calculate max offer price for a Double Close deal
 * Formula accounts for lender fee: P = (BuyersMaxPrice - Rehab - WholesaleFee - ClosingCosts) / 1.0125
 * The lender fee is 1.25% of purchase price with a $1,000 minimum
 */
export function calculateDoubleCloseMaxOffer(
  inputs: WholesaleInputs,
  closingCosts: DoubleCloseClosingCosts
): DoubleCloseResult {
  const buyersMaxPrice = inputs.arv * (inputs.buyersMaxArvPercent / 100);
  const totalClosingCosts = calculateTotalClosingCosts(closingCosts);
  
  // Available funds after deducting rehab, wholesale fee, and closing costs
  const availableForPurchaseAndFee = buyersMaxPrice - inputs.rehabBudget - inputs.wholesaleFee - totalClosingCosts;
  
  // The lender fee creates a circular dependency: fee = max(P * 0.0125, 1000)
  // Case 1: If P >= $80,000, fee = P * 0.0125, so P + P * 0.0125 = available
  //         P = available / 1.0125
  // Case 2: If P < $80,000, fee = $1,000 (minimum), so P = available - 1000
  
  // First, calculate assuming the percentage applies (P >= $80,000)
  const maxOfferWithPercentFee = availableForPurchaseAndFee / (1 + LENDER_FEE_RATE);
  
  // Check if this results in a purchase price where the percentage fee >= minimum
  if (maxOfferWithPercentFee >= (LENDER_FEE_MINIMUM / LENDER_FEE_RATE)) {
    // Percentage fee applies (>= $1,000)
    const lenderFee = maxOfferWithPercentFee * LENDER_FEE_RATE;
    return {
      buyersMaxPrice,
      maxOfferPrice: Math.max(0, Math.round(maxOfferWithPercentFee)),
      wholesaleProfit: inputs.wholesaleFee,
      totalClosingCosts,
      closingCostsBreakdown: closingCosts,
      lenderFee: Math.round(lenderFee),
    };
  } else {
    // Minimum fee applies ($1,000)
    const maxOfferWithMinFee = availableForPurchaseAndFee - LENDER_FEE_MINIMUM;
    return {
      buyersMaxPrice,
      maxOfferPrice: Math.max(0, Math.round(maxOfferWithMinFee)),
      wholesaleProfit: inputs.wholesaleFee,
      totalClosingCosts,
      closingCostsBreakdown: closingCosts,
      lenderFee: LENDER_FEE_MINIMUM,
    };
  }
}

/**
 * Calculate max offer price for a Double Close deal using own cash (no lender fees)
 * Formula: ARV × Buyer's Max % - Rehab Budget - Wholesale Fee - Closing Costs = Max Offer Price
 */
export function calculateDoubleCloseMaxOfferOwnCash(
  inputs: WholesaleInputs,
  closingCosts: DoubleCloseClosingCosts
): DoubleCloseResult {
  const buyersMaxPrice = inputs.arv * (inputs.buyersMaxArvPercent / 100);
  const totalClosingCosts = calculateTotalClosingCosts(closingCosts);
  
  // No lender fee when using own cash - just subtract closing costs
  const maxOfferPrice = buyersMaxPrice - inputs.rehabBudget - inputs.wholesaleFee - totalClosingCosts;
  
  return {
    buyersMaxPrice,
    maxOfferPrice: Math.max(0, Math.round(maxOfferPrice)),
    wholesaleProfit: inputs.wholesaleFee,
    totalClosingCosts,
    closingCostsBreakdown: closingCosts,
    lenderFee: 0, // No lender fee when using own cash
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
  
  // Points cost is calculated on the base max offer price (before any lender fees)
  // This ensures lenders with the same points rate show the same points cost
  const pointsCost = baseMaxOfferPrice * (totalPointsWithReferral / 100);
  
  // Total lender fees = flat fee + points cost
  const totalLenderFees = lenderFlatFee + pointsCost;
  
  // Adjusted max offer = base max offer - total lender fees
  const adjustedMaxOfferPrice = baseMaxOfferPrice - totalLenderFees;
  
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

/**
 * Reverse calculation: Given a Buy Price, calculate the resulting Wholesale Fee
 * For Assignment: Wholesale Fee = Buyer's Max Price - Rehab Budget - Buy Price
 */
export interface ReverseWholesaleInputs {
  arv: number;
  rehabBudget: number;
  buyersMaxArvPercent: number;
  buyPrice: number;
}

export interface ReverseWholesaleResult {
  buyersMaxPrice: number;
  calculatedWholesaleFee: number;
  buyPrice: number;
}

export function calculateWholesaleFeeFromBuyPrice(inputs: ReverseWholesaleInputs): ReverseWholesaleResult {
  const buyersMaxPrice = inputs.arv * (inputs.buyersMaxArvPercent / 100);
  const calculatedWholesaleFee = buyersMaxPrice - inputs.rehabBudget - inputs.buyPrice;
  
  return {
    buyersMaxPrice,
    calculatedWholesaleFee: Math.max(0, calculatedWholesaleFee),
    buyPrice: inputs.buyPrice,
  };
}

/**
 * Reverse calculation for Double Close: Given a Buy Price, calculate the resulting Wholesale Fee
 * For Double Close: Wholesale Fee = Buyer's Max Price - Rehab Budget - Buy Price - Closing Costs - Lender Fee
 */
export interface ReverseDoubleCloseResult extends ReverseWholesaleResult {
  totalClosingCosts: number;
  closingCostsBreakdown: DoubleCloseClosingCosts;
  lenderFee: number;
}

export function calculateDoubleCloseWholesaleFeeFromBuyPrice(
  inputs: ReverseWholesaleInputs,
  closingCosts: DoubleCloseClosingCosts,
  fundingSource: "transactional" | "own-cash" = "transactional"
): ReverseDoubleCloseResult {
  const buyersMaxPrice = inputs.arv * (inputs.buyersMaxArvPercent / 100);
  const totalClosingCosts = calculateTotalClosingCosts(closingCosts);
  // When using own cash or passthrough funding, no lender fee applies
  const lenderFee = fundingSource === "own-cash" ? 0 : calculateLenderFee(inputs.buyPrice);
  const calculatedWholesaleFee = buyersMaxPrice - inputs.rehabBudget - inputs.buyPrice - totalClosingCosts - lenderFee;
  
  return {
    buyersMaxPrice,
    calculatedWholesaleFee: Math.max(0, calculatedWholesaleFee),
    buyPrice: inputs.buyPrice,
    totalClosingCosts,
    closingCostsBreakdown: closingCosts,
    lenderFee,
  };
}

/**
 * Compare two wholesale scenarios: Original (with entered wholesale fee) vs Adjusted (with custom buy price)
 */
export interface WholesaleComparison {
  original: {
    buyPrice: number;
    wholesaleFee: number;
    closingCosts?: number;
    lenderFee?: number;
  };
  adjusted: {
    buyPrice: number;
    wholesaleFee: number;
    closingCosts?: number;
    lenderFee?: number;
  };
  delta: {
    buyPriceDiff: number;
    wholesaleFeeDiff: number;
    closingCostsDiff?: number;
    lenderFeeDiff?: number;
  };
}
