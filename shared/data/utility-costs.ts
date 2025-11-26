/**
 * Monthly utility costs per square foot by state for investment properties during renovation.
 * 
 * Methodology (based on 2024 EIA and water utility data):
 * 1. Electricity: EIA state residential rates × 1,100 kWh avg usage / 2,000 sq ft
 * 2. Water: State average monthly water bill / 2,000 sq ft
 * 3. Gas: Base ~$35/month / 2,000 sq ft
 * 4. Applied 50% reduction for vacant/renovation properties
 * 5. Added 20% buffer for active renovation work (tools, lighting, HVAC)
 * 
 * Result: Approximately 60% of fully-occupied home utility costs
 * 
 * Sources:
 * - EIA Form EIA-861 (2024 Residential Electricity Rates)
 * - World Population Review / Statista (2024 Water Bills by State)
 */

export const utilityCoststByState: Record<string, number> = {
  // Low electricity states (hydro/natural gas) - $0.06-0.08/sq ft
  "WA": 0.06,  // 9.71¢/kWh - lowest electricity, hydropower
  "ID": 0.06,  // 9.89¢/kWh - hydropower
  "LA": 0.06,  // 9.80¢/kWh - natural gas
  "AR": 0.06,  // 9.80¢/kWh - low rates
  "OK": 0.07,  // 10.21¢/kWh
  "ND": 0.07,  // ~10.50¢/kWh
  "NV": 0.07,  // ~10.80¢/kWh, low water costs
  "UT": 0.07,  // ~11.00¢/kWh
  "MT": 0.07,  // ~11.50¢/kWh
  "WY": 0.07,  // ~11.80¢/kWh
  "OR": 0.07,  // ~12.00¢/kWh - hydropower
  "NE": 0.07,  // ~12.50¢/kWh
  
  // Moderate electricity states - $0.08-0.09/sq ft
  "MO": 0.08,  // ~13.00¢/kWh
  "TX": 0.08,  // ~13.50¢/kWh, low water
  "KY": 0.08,  // ~13.80¢/kWh
  "TN": 0.08,  // ~13.90¢/kWh, low water
  "WV": 0.09,  // ~14.00¢/kWh, high water ($91)
  "KS": 0.08,  // ~14.50¢/kWh
  "MS": 0.08,  // ~14.60¢/kWh
  "SD": 0.08,  // ~14.80¢/kWh
  "IN": 0.08,  // ~15.00¢/kWh
  "AL": 0.08,  // ~15.20¢/kWh
  "GA": 0.08,  // ~15.40¢/kWh, moderate water ($49)
  "IA": 0.08,  // ~15.60¢/kWh
  "SC": 0.08,  // ~15.80¢/kWh
  "NC": 0.08,  // ~16.00¢/kWh, very low water ($20)
  "OH": 0.08,  // ~16.20¢/kWh
  "VA": 0.08,  // ~16.40¢/kWh
  "MN": 0.08,  // ~16.60¢/kWh
  "WI": 0.07,  // ~16.80¢/kWh, very low water ($18)
  
  // Higher electricity states - $0.09-0.10/sq ft
  "FL": 0.09,  // ~17.00¢/kWh, low water ($27)
  "IL": 0.09,  // ~17.20¢/kWh
  "PA": 0.09,  // 17.77¢/kWh
  "AZ": 0.10,  // ~17.80¢/kWh, high water ($64)
  "MI": 0.09,  // ~18.00¢/kWh
  "CO": 0.09,  // ~18.20¢/kWh
  "MD": 0.09,  // ~18.60¢/kWh
  "NJ": 0.10,  // 19.34¢/kWh
  "DE": 0.10,  // ~19.80¢/kWh
  "NM": 0.09,  // ~20.00¢/kWh, low water ($26)
  
  // High electricity states (New England) - $0.11-0.13/sq ft
  "VT": 0.10,  // 21.90¢/kWh, very low water ($18)
  "CT": 0.11,  // 21.87¢/kWh
  "RI": 0.11,  // 21.73¢/kWh
  "MA": 0.11,  // 21.92¢/kWh
  "NH": 0.11,  // 23.40¢/kWh
  "NY": 0.11,  // 24.43¢/kWh
  "ME": 0.11,  // 24.29¢/kWh
  
  // Very high electricity states - $0.12-0.15/sq ft
  "CA": 0.13,  // ~27.00¢/kWh, high water ($77)
  "AK": 0.12,  // 22.92¢/kWh, high water ($52)
  "HI": 0.15,  // 32.06¢/kWh - highest electricity, high water ($49)
  
  // DC
  "DC": 0.10,  // Higher urban utility costs
};

/**
 * Get the monthly utility cost per square foot for a given state.
 * Returns state-specific rate or national average of $0.08/sq ft.
 * 
 * @param state - Two-letter state code (e.g., "GA", "TX")
 * @returns Monthly utility cost per square foot in dollars
 */
export function getUtilityCostPerSqFt(state: string): number {
  return utilityCoststByState[state.toUpperCase()] || 0.08;
}
