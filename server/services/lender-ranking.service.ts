import type { LoanProduct, Lender, LoanCriteria } from "@shared/schema";
import type { DealInputs, LoanInputs } from "./loan-calculation.service";
import { calculateLoanMetrics } from "./loan-calculation.service";

export interface RankedLoanProduct {
  loanProduct: LoanProduct;
  lender: Lender;
  profit: number;
  outOfPocket: number;
  timeToClose: number;
  score: number;
}

export interface LenderRankingInputs {
  dealInputs: DealInputs;
  loanProducts: LoanProduct[];
  lenders: Lender[];
  useDefaultCriteria: boolean;
  primaryCriteria?: LoanCriteria;
  secondaryCriteria?: LoanCriteria;
  numberOfDraws?: number;
}

function convertLoanProductToLoanInputs(loanProduct: LoanProduct): LoanInputs {
  return {
    maxLtvBuy: parseFloat(loanProduct.maxLtvBuy || '0'),
    maxLendRehab: parseFloat(loanProduct.maxLendRehab || '0'),
    maxLoanArv: parseFloat(loanProduct.maxLoanArv || '0'),
    interestRate: parseFloat(loanProduct.interestRate || '0'),
    interestDeferred: loanProduct.interestDeferred || false,
    drawnFundsOnly: loanProduct.drawnFundsOnly || false,
    points: parseFloat(loanProduct.points || '0'),
    pointsDeferred: loanProduct.pointsDeferred || false,
    fees: parseFloat(loanProduct.fees || '0'),
    appraisalCost: parseFloat(loanProduct.estimatedAppraisalCost || '0'),
    costPerDraw: parseFloat(loanProduct.costPerDraw || '0'),
  };
}

function calculateProductMetrics(
  loanProduct: LoanProduct,
  dealInputs: DealInputs,
  numberOfDraws: number = 3
): { profit: number; outOfPocket: number; timeToClose: number } {
  const loanInputs = convertLoanProductToLoanInputs(loanProduct);
  
  const metrics = calculateLoanMetrics(dealInputs, loanInputs, numberOfDraws);
  
  return {
    profit: metrics.profit,
    outOfPocket: metrics.outOfPocketCost,
    timeToClose: loanProduct.timeToClose || 999,
  };
}

function scoreProductByCriteria(
  product: RankedLoanProduct,
  criteria: LoanCriteria,
  allProducts: RankedLoanProduct[]
): number {
  const maxProfit = Math.max(...allProducts.map(p => p.profit));
  const minProfit = Math.min(...allProducts.map(p => p.profit));
  const maxOOP = Math.max(...allProducts.map(p => p.outOfPocket));
  const minOOP = Math.min(...allProducts.map(p => p.outOfPocket));
  const maxTime = Math.max(...allProducts.map(p => p.timeToClose));
  const minTime = Math.min(...allProducts.map(p => p.timeToClose));
  
  switch (criteria) {
    case 'profit':
      if (maxProfit === minProfit) return 50;
      return ((product.profit - minProfit) / (maxProfit - minProfit)) * 100;
    
    case 'out-of-pocket':
      if (maxOOP === minOOP) return 50;
      return ((maxOOP - product.outOfPocket) / (maxOOP - minOOP)) * 100;
    
    case 'fastest':
      if (maxTime === minTime) return 50;
      return ((maxTime - product.timeToClose) / (maxTime - minTime)) * 100;
    
    default:
      return 0;
  }
}

function rankProducts(
  products: RankedLoanProduct[],
  criteria: LoanCriteria
): RankedLoanProduct[] {
  return [...products].sort((a, b) => {
    const scoreA = scoreProductByCriteria(a, criteria, products);
    const scoreB = scoreProductByCriteria(b, criteria, products);
    
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }
    
    const referralA = parseFloat(a.lender.referralAmount || '0');
    const referralB = parseFloat(b.lender.referralAmount || '0');
    
    return referralB - referralA;
  });
}

function selectDiverseLenders(
  products: RankedLoanProduct[],
  count: number
): RankedLoanProduct[] {
  const selected: RankedLoanProduct[] = [];
  const usedLenderIds = new Set<string>();
  
  for (const product of products) {
    if (selected.length >= count) break;
    
    if (!usedLenderIds.has(product.lender.id)) {
      selected.push(product);
      usedLenderIds.add(product.lender.id);
    }
  }
  
  if (selected.length < count) {
    for (const product of products) {
      if (selected.length >= count) break;
      if (!selected.includes(product)) {
        selected.push(product);
      }
    }
  }
  
  return selected;
}

export function rankLoanProducts(inputs: LenderRankingInputs): RankedLoanProduct[] {
  const rankedProducts: RankedLoanProduct[] = inputs.loanProducts.map(loanProduct => {
    const lender = inputs.lenders.find(l => l.id === loanProduct.lenderId);
    if (!lender) {
      throw new Error(`Lender not found for product ${loanProduct.id}`);
    }
    
    const metrics = calculateProductMetrics(loanProduct, inputs.dealInputs, inputs.numberOfDraws);
    
    return {
      loanProduct,
      lender,
      profit: metrics.profit,
      outOfPocket: metrics.outOfPocket,
      timeToClose: metrics.timeToClose,
      score: 0,
    };
  });
  
  if (inputs.useDefaultCriteria || (!inputs.primaryCriteria && !inputs.secondaryCriteria)) {
    const profitRanked = rankProducts(rankedProducts, 'profit');
    const oopRanked = rankProducts(rankedProducts, 'out-of-pocket');
    const fastestRanked = rankProducts(rankedProducts, 'fastest');
    
    const selected: RankedLoanProduct[] = [];
    const usedLenderIds = new Set<string>();
    
    const addIfUnique = (product: RankedLoanProduct) => {
      if (!usedLenderIds.has(product.lender.id)) {
        selected.push(product);
        usedLenderIds.add(product.lender.id);
        return true;
      }
      return false;
    };
    
    if (profitRanked[0]) addIfUnique(profitRanked[0]);
    if (selected.length < 3 && oopRanked[0]) addIfUnique(oopRanked[0]);
    if (selected.length < 3 && fastestRanked[0]) addIfUnique(fastestRanked[0]);
    
    if (selected.length < 3) {
      for (const product of profitRanked) {
        if (selected.length >= 3) break;
        if (!selected.includes(product)) {
          selected.push(product);
        }
      }
    }
    
    return selected;
  }
  
  const selected: RankedLoanProduct[] = [];
  
  if (inputs.primaryCriteria) {
    const primaryRanked = rankProducts(rankedProducts, inputs.primaryCriteria);
    const primarySelected = selectDiverseLenders(primaryRanked, 2);
    selected.push(...primarySelected);
  }
  
  if (inputs.secondaryCriteria && selected.length < 3) {
    const remaining = rankedProducts.filter(p => !selected.includes(p));
    const secondaryRanked = rankProducts(remaining, inputs.secondaryCriteria);
    const secondarySelected = selectDiverseLenders(secondaryRanked, 1);
    selected.push(...secondarySelected);
  }
  
  if (!inputs.secondaryCriteria && inputs.primaryCriteria && selected.length < 3) {
    const remaining = rankedProducts.filter(p => !selected.includes(p));
    const moreFromPrimary = rankProducts(remaining, inputs.primaryCriteria);
    const count = 3 - selected.length;
    selected.push(...moreFromPrimary.slice(0, count));
  }
  
  return selected;
}

export function getNextBatch(
  inputs: LenderRankingInputs,
  excludeProductIds: string[]
): RankedLoanProduct[] {
  const filteredProducts = inputs.loanProducts.filter(
    p => !excludeProductIds.includes(p.id)
  );
  
  const newInputs: LenderRankingInputs = {
    ...inputs,
    loanProducts: filteredProducts,
  };
  
  return rankLoanProducts(newInputs);
}
