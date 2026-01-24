import { describe, it, expect } from 'vitest';
import {
  calculateTwoStepLoanAmount,
  calculateBuyLoanInterest,
  calculateRehabLoanInterest,
  calculateDrawSchedule,
  calculateRolledCosts,
  calculateOutOfPocketCost,
  calculateOutOfPocketWithBreakdown,
  calculateProfit,
  calculateROI,
  calculateCashOnCashROI,
  calculateAnnualizedROI,
} from './loan-calculations';

describe('Loan Sizing Calculations', () => {
  describe('calculateTwoStepLoanAmount', () => {
    it('calculates basic buy and rehab loan amounts correctly', () => {
      const result = calculateTwoStepLoanAmount(
        200000,
        50000,
        300000,
        90,
        100,
        70
      );
      
      expect(result.buyLoanAmount).toBe(180000);
      expect(result.rehabLoanAmount).toBe(50000);
    });

    it('applies ARV cap when loan exceeds max ARV percentage', () => {
      const result = calculateTwoStepLoanAmount(
        200000,
        50000,
        300000,
        90,
        100,
        70
      );
      
      const maxFromArv = 300000 * 0.70;
      expect(result.finalLoanAmount).toBe(maxFromArv);
      expect(result.arvCapAdjustment).toBeGreaterThan(0);
    });

    it('applies LTC cap when LTC weighted is enabled', () => {
      const result = calculateTwoStepLoanAmount(
        200000,
        50000,
        300000,
        90,
        100,
        80,
        true,
        85
      );
      
      const maxFromLtc = (200000 + 50000) * 0.85;
      expect(result.finalLoanAmount).toBeLessThanOrEqual(maxFromLtc);
    });

    it('calculates additional down payment when caps are applied', () => {
      const result = calculateTwoStepLoanAmount(
        200000,
        50000,
        300000,
        90,
        100,
        70
      );
      
      expect(result.additionalDownPayment).toBeGreaterThan(0);
    });
  });
});

describe('Interest Calculations', () => {
  describe('calculateBuyLoanInterest', () => {
    it('calculates interest correctly for buy loan', () => {
      const interest = calculateBuyLoanInterest(180000, 12, 6, false);
      
      const expectedMonthlyRate = 0.12 / 12;
      const expectedInterest = 180000 * expectedMonthlyRate * 6;
      expect(interest).toBeCloseTo(expectedInterest, 2);
    });

    it('calculates interest for 12% annual rate over 6 months', () => {
      const interest = calculateBuyLoanInterest(180000, 12, 6, false);
      expect(interest).toBeCloseTo(10800, 2);
    });
  });

  describe('calculateRehabLoanInterest', () => {
    it('calculates full balance interest when drawnFundsOnly is false', () => {
      const drawSchedule = calculateDrawSchedule(6, 3);
      const interest = calculateRehabLoanInterest(50000, 12, 6, false, drawSchedule);
      
      const expectedInterest = 50000 * (0.12 / 12) * 6;
      expect(interest).toBeCloseTo(expectedInterest, 2);
    });

    it('calculates reduced interest when drawnFundsOnly is true', () => {
      const drawSchedule = calculateDrawSchedule(6, 3);
      const fullInterest = calculateRehabLoanInterest(50000, 12, 6, false, drawSchedule);
      const drawOnlyInterest = calculateRehabLoanInterest(50000, 12, 6, true, drawSchedule);
      
      expect(drawOnlyInterest).toBeLessThan(fullInterest);
    });
  });
});

describe('Rolled Costs Calculations', () => {
  describe('calculateRolledCosts', () => {
    it('includes interest when deferred', () => {
      const rolled = calculateRolledCosts(12675, true, 2, false, 210000);
      expect(rolled).toBe(12675);
    });

    it('includes points when deferred', () => {
      const rolled = calculateRolledCosts(12675, false, 2, true, 210000);
      expect(rolled).toBe(210000 * 0.02);
    });

    it('includes both when both are deferred', () => {
      const rolled = calculateRolledCosts(12675, true, 2, true, 210000);
      expect(rolled).toBe(12675 + (210000 * 0.02));
    });

    it('returns zero when nothing is deferred', () => {
      const rolled = calculateRolledCosts(12675, false, 2, false, 210000);
      expect(rolled).toBe(0);
    });
  });
});

describe('Out-of-Pocket Calculations', () => {
  describe('calculateOutOfPocketWithBreakdown', () => {
    it('calculates down payment as project cost minus loan', () => {
      const result = calculateOutOfPocketWithBreakdown(
        200000,
        50000,
        5000,
        600,
        6,
        210000,
        2,
        false,
        false,
        650,
        1195
      );
      
      const expectedDownPayment = (200000 + 50000) - 210000;
      expect(result.downPayment).toBe(expectedDownPayment);
    });

    it('includes points in closing costs when not deferred', () => {
      const result = calculateOutOfPocketWithBreakdown(
        200000,
        50000,
        5000,
        600,
        6,
        210000,
        2,
        false,
        false,
        650,
        1195
      );
      
      expect(result.pointsCost).toBe(210000 * 0.02);
    });

    it('excludes points from closing costs when deferred', () => {
      const result = calculateOutOfPocketWithBreakdown(
        200000,
        50000,
        5000,
        600,
        6,
        210000,
        2,
        true,
        false,
        650,
        1195
      );
      
      expect(result.pointsCost).toBe(0);
    });

    it('calculates carrying costs correctly', () => {
      const result = calculateOutOfPocketWithBreakdown(
        200000,
        50000,
        5000,
        600,
        6,
        210000,
        2,
        false,
        false,
        650,
        1195
      );
      
      expect(result.carryingCosts).toBe(600 * 6);
    });
  });
});

describe('Profit & ROI Calculations', () => {
  describe('calculateProfit', () => {
    it('calculates profit as sell price minus all costs', () => {
      const profit = calculateProfit(
        300000,
        258600,
        5000,
        15000,
        12675,
        200
      );
      
      const expected = 300000 - 258600 - 5000 - 15000 - 12675 - 200;
      expect(profit).toBe(expected);
    });
  });

  describe('calculateROI', () => {
    it('calculates ROI as percentage of total investment', () => {
      const roi = calculateROI(8525, 258600);
      
      const expected = (8525 / 258600) * 100;
      expect(roi).toBeCloseTo(expected, 4);
    });

    it('returns 0 when total investment is 0', () => {
      const roi = calculateROI(8525, 0);
      expect(roi).toBe(0);
    });
  });

  describe('calculateCashOnCashROI', () => {
    it('calculates cash-on-cash ROI correctly', () => {
      const roi = calculateCashOnCashROI(8525, 52800);
      
      const expected = (8525 / 52800) * 100;
      expect(roi).toBeCloseTo(expected, 4);
    });

    it('returns 0 when out of pocket is 0', () => {
      const roi = calculateCashOnCashROI(8525, 0);
      expect(roi).toBe(0);
    });
  });

  describe('calculateAnnualizedROI', () => {
    it('annualizes ROI based on project length', () => {
      const annualized = calculateAnnualizedROI(16.15, 6);
      
      const expected = 16.15 * (12 / 6);
      expect(annualized).toBeCloseTo(expected, 2);
    });
  });
});

describe('Gross Profit Calculation', () => {
  it('calculates gross profit correctly: Sale Price - Project Cost - Closing Costs - Lender Fees - Carrying Costs', () => {
    const sellPrice = 300000;
    const projectCost = 250000;
    const closingCostsBuy = 5000;
    const lenderFees = 17075;
    const carryingCosts = 3600;
    
    const expectedGrossProfit = sellPrice - projectCost - closingCostsBuy - lenderFees - carryingCosts;
    expect(expectedGrossProfit).toBe(24325);
  });
});
