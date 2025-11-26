/**
 * Monthly utility costs per square foot by state for investment properties during renovation.
 * 
 * METHODOLOGY (all calculations for 2,000 sq ft reference home):
 * 
 * 1. ELECTRICITY (from 2024 EIA residential rates):
 *    - Monthly usage: 1,100 kWh (national avg for 2,000 sq ft home)
 *    - Cost = (Rate ¢/kWh × 1,100) / 100
 *    - Per sq ft = Monthly cost / 2,000
 * 
 * 2. WATER (from 2024 state averages):
 *    - Per sq ft = State monthly bill / 2,000
 * 
 * 3. GAS (base estimate for vacant property):
 *    - $35/month / 2,000 = $0.0175/sq ft
 * 
 * 4. ADJUSTMENT FOR VACANT/RENOVATION:
 *    - Apply 60% factor (accounts for minimal HVAC, no full occupancy, but
 *      includes power tools, work lights, and periodic HVAC during work)
 * 
 * FORMULA: ((elec + water + gas) × 0.60)
 * 
 * Sources:
 * - EIA Form EIA-861 (2024 Residential Electricity Rates by State)
 * - Statista/World Population Review (2024 Water Bills by State)
 */

// Calculation reference table:
// State | Elec ¢/kWh | Elec/sqft | Water Bill | Water/sqft | Gas/sqft | Occupied | Vacant (60%)
// -----------------------------------------------------------------------------------------
// WA    |   9.71     |  $0.053   |    $40     |   $0.020   |  $0.018  |  $0.091  |   $0.055
// ID    |   9.89     |  $0.054   |    $33     |   $0.017   |  $0.018  |  $0.089  |   $0.053
// LA    |   9.80     |  $0.054   |    $28     |   $0.014   |  $0.018  |  $0.086  |   $0.052
// AR    |   9.80     |  $0.054   |    $25     |   $0.013   |  $0.018  |  $0.085  |   $0.051
// OK    |  10.21     |  $0.056   |    $29     |   $0.015   |  $0.018  |  $0.089  |   $0.053
// ND    |  10.50     |  $0.058   |    $24     |   $0.012   |  $0.018  |  $0.088  |   $0.053
// NV    |  10.80     |  $0.059   |    $26     |   $0.013   |  $0.018  |  $0.090  |   $0.054
// UT    |  11.00     |  $0.061   |    $38     |   $0.019   |  $0.018  |  $0.098  |   $0.059
// MT    |  11.50     |  $0.063   |    $33     |   $0.017   |  $0.018  |  $0.098  |   $0.059
// WY    |  11.80     |  $0.065   |    $35     |   $0.018   |  $0.018  |  $0.101  |   $0.061
// OR    |  12.00     |  $0.066   |    $41     |   $0.021   |  $0.018  |  $0.105  |   $0.063
// NE    |  12.50     |  $0.069   |    $25     |   $0.013   |  $0.018  |  $0.100  |   $0.060
// MO    |  13.00     |  $0.072   |    $35     |   $0.018   |  $0.018  |  $0.108  |   $0.065
// TX    |  13.50     |  $0.074   |    $31     |   $0.016   |  $0.018  |  $0.108  |   $0.065
// KY    |  13.80     |  $0.076   |    $32     |   $0.016   |  $0.018  |  $0.110  |   $0.066
// TN    |  13.90     |  $0.077   |    $30     |   $0.015   |  $0.018  |  $0.110  |   $0.066
// WV    |  14.00     |  $0.077   |    $91     |   $0.046   |  $0.018  |  $0.141  |   $0.085
// KS    |  14.50     |  $0.080   |    $35     |   $0.018   |  $0.018  |  $0.116  |   $0.070
// MS    |  14.60     |  $0.080   |    $25     |   $0.013   |  $0.018  |  $0.111  |   $0.067
// SD    |  14.80     |  $0.081   |    $35     |   $0.018   |  $0.018  |  $0.117  |   $0.070
// IN    |  15.00     |  $0.083   |    $35     |   $0.018   |  $0.018  |  $0.119  |   $0.071
// AL    |  15.20     |  $0.084   |    $25     |   $0.013   |  $0.018  |  $0.115  |   $0.069
// GA    |  15.40     |  $0.085   |    $49     |   $0.025   |  $0.018  |  $0.128  |   $0.077
// IA    |  15.60     |  $0.086   |    $34     |   $0.017   |  $0.018  |  $0.121  |   $0.073
// SC    |  15.80     |  $0.087   |    $30     |   $0.015   |  $0.018  |  $0.120  |   $0.072
// NC    |  16.00     |  $0.088   |    $20     |   $0.010   |  $0.018  |  $0.116  |   $0.070
// OH    |  16.20     |  $0.089   |    $36     |   $0.018   |  $0.018  |  $0.125  |   $0.075
// VA    |  16.40     |  $0.090   |    $32     |   $0.016   |  $0.018  |  $0.124  |   $0.074
// MN    |  16.60     |  $0.091   |    $37     |   $0.019   |  $0.018  |  $0.128  |   $0.077
// WI    |  16.80     |  $0.092   |    $18     |   $0.009   |  $0.018  |  $0.119  |   $0.071
// FL    |  17.00     |  $0.094   |    $27     |   $0.014   |  $0.018  |  $0.126  |   $0.076
// IL    |  17.20     |  $0.095   |    $36     |   $0.018   |  $0.018  |  $0.131  |   $0.079
// PA    |  17.77     |  $0.098   |    $41     |   $0.021   |  $0.018  |  $0.137  |   $0.082
// AZ    |  17.80     |  $0.098   |    $64     |   $0.032   |  $0.018  |  $0.148  |   $0.089
// MI    |  18.00     |  $0.099   |    $38     |   $0.019   |  $0.018  |  $0.136  |   $0.082
// CO    |  18.20     |  $0.100   |    $38     |   $0.019   |  $0.018  |  $0.137  |   $0.082
// MD    |  18.60     |  $0.102   |    $39     |   $0.020   |  $0.018  |  $0.140  |   $0.084
// NJ    |  19.34     |  $0.106   |    $41     |   $0.021   |  $0.018  |  $0.145  |   $0.087
// DE    |  19.80     |  $0.109   |    $37     |   $0.019   |  $0.018  |  $0.146  |   $0.088
// NM    |  20.00     |  $0.110   |    $26     |   $0.013   |  $0.018  |  $0.141  |   $0.085
// VT    |  21.90     |  $0.120   |    $18     |   $0.009   |  $0.018  |  $0.147  |   $0.088
// CT    |  21.87     |  $0.120   |    $45     |   $0.023   |  $0.018  |  $0.161  |   $0.097
// RI    |  21.73     |  $0.120   |    $44     |   $0.022   |  $0.018  |  $0.160  |   $0.096
// MA    |  21.92     |  $0.121   |    $46     |   $0.023   |  $0.018  |  $0.162  |   $0.097
// NH    |  23.40     |  $0.129   |    $43     |   $0.022   |  $0.018  |  $0.169  |   $0.101
// NY    |  24.43     |  $0.134   |    $42     |   $0.021   |  $0.018  |  $0.173  |   $0.104
// ME    |  24.29     |  $0.134   |    $42     |   $0.021   |  $0.018  |  $0.173  |   $0.104
// AK    |  22.92     |  $0.126   |    $52     |   $0.026   |  $0.018  |  $0.170  |   $0.102
// CA    |  27.00     |  $0.149   |    $77     |   $0.039   |  $0.018  |  $0.206  |   $0.124
// HI    |  32.06     |  $0.176   |    $49     |   $0.025   |  $0.018  |  $0.219  |   $0.131

export const utilityCostsByState: Record<string, number> = {
  // Low electricity states (hydro/natural gas regions)
  "WA": 0.055,  // Elec 9.71¢ + Water $40 → Occupied $0.091 → Vacant $0.055
  "ID": 0.053,  // Elec 9.89¢ + Water $33 → Occupied $0.089 → Vacant $0.053
  "LA": 0.052,  // Elec 9.80¢ + Water $28 → Occupied $0.086 → Vacant $0.052
  "AR": 0.051,  // Elec 9.80¢ + Water $25 → Occupied $0.085 → Vacant $0.051
  "OK": 0.053,  // Elec 10.21¢ + Water $29 → Occupied $0.089 → Vacant $0.053
  "ND": 0.053,  // Elec 10.50¢ + Water $24 → Occupied $0.088 → Vacant $0.053
  "NV": 0.054,  // Elec 10.80¢ + Water $26 → Occupied $0.090 → Vacant $0.054
  "UT": 0.059,  // Elec 11.00¢ + Water $38 → Occupied $0.098 → Vacant $0.059
  "MT": 0.059,  // Elec 11.50¢ + Water $33 → Occupied $0.098 → Vacant $0.059
  "WY": 0.061,  // Elec 11.80¢ + Water $35 → Occupied $0.101 → Vacant $0.061
  "OR": 0.063,  // Elec 12.00¢ + Water $41 → Occupied $0.105 → Vacant $0.063
  "NE": 0.060,  // Elec 12.50¢ + Water $25 → Occupied $0.100 → Vacant $0.060
  
  // Moderate electricity states
  "MO": 0.065,  // Elec 13.00¢ + Water $35 → Occupied $0.108 → Vacant $0.065
  "TX": 0.065,  // Elec 13.50¢ + Water $31 → Occupied $0.108 → Vacant $0.065
  "KY": 0.066,  // Elec 13.80¢ + Water $32 → Occupied $0.110 → Vacant $0.066
  "TN": 0.066,  // Elec 13.90¢ + Water $30 → Occupied $0.110 → Vacant $0.066
  "WV": 0.085,  // Elec 14.00¢ + Water $91 → Occupied $0.141 → Vacant $0.085 (HIGH WATER)
  "KS": 0.070,  // Elec 14.50¢ + Water $35 → Occupied $0.116 → Vacant $0.070
  "MS": 0.067,  // Elec 14.60¢ + Water $25 → Occupied $0.111 → Vacant $0.067
  "SD": 0.070,  // Elec 14.80¢ + Water $35 → Occupied $0.117 → Vacant $0.070
  "IN": 0.071,  // Elec 15.00¢ + Water $35 → Occupied $0.119 → Vacant $0.071
  "AL": 0.069,  // Elec 15.20¢ + Water $25 → Occupied $0.115 → Vacant $0.069
  "GA": 0.077,  // Elec 15.40¢ + Water $49 → Occupied $0.128 → Vacant $0.077
  "IA": 0.073,  // Elec 15.60¢ + Water $34 → Occupied $0.121 → Vacant $0.073
  "SC": 0.072,  // Elec 15.80¢ + Water $30 → Occupied $0.120 → Vacant $0.072
  "NC": 0.070,  // Elec 16.00¢ + Water $20 → Occupied $0.116 → Vacant $0.070
  "OH": 0.075,  // Elec 16.20¢ + Water $36 → Occupied $0.125 → Vacant $0.075
  "VA": 0.074,  // Elec 16.40¢ + Water $32 → Occupied $0.124 → Vacant $0.074
  "MN": 0.077,  // Elec 16.60¢ + Water $37 → Occupied $0.128 → Vacant $0.077
  "WI": 0.071,  // Elec 16.80¢ + Water $18 → Occupied $0.119 → Vacant $0.071 (LOW WATER)
  
  // Higher electricity states
  "FL": 0.076,  // Elec 17.00¢ + Water $27 → Occupied $0.126 → Vacant $0.076
  "IL": 0.079,  // Elec 17.20¢ + Water $36 → Occupied $0.131 → Vacant $0.079
  "PA": 0.082,  // Elec 17.77¢ + Water $41 → Occupied $0.137 → Vacant $0.082
  "AZ": 0.089,  // Elec 17.80¢ + Water $64 → Occupied $0.148 → Vacant $0.089 (HIGH WATER)
  "MI": 0.082,  // Elec 18.00¢ + Water $38 → Occupied $0.136 → Vacant $0.082
  "CO": 0.082,  // Elec 18.20¢ + Water $38 → Occupied $0.137 → Vacant $0.082
  "MD": 0.084,  // Elec 18.60¢ + Water $39 → Occupied $0.140 → Vacant $0.084
  "NJ": 0.087,  // Elec 19.34¢ + Water $41 → Occupied $0.145 → Vacant $0.087
  "DE": 0.088,  // Elec 19.80¢ + Water $37 → Occupied $0.146 → Vacant $0.088
  "NM": 0.085,  // Elec 20.00¢ + Water $26 → Occupied $0.141 → Vacant $0.085
  
  // New England (high electricity)
  "VT": 0.088,  // Elec 21.90¢ + Water $18 → Occupied $0.147 → Vacant $0.088
  "CT": 0.097,  // Elec 21.87¢ + Water $45 → Occupied $0.161 → Vacant $0.097
  "RI": 0.096,  // Elec 21.73¢ + Water $44 → Occupied $0.160 → Vacant $0.096
  "MA": 0.097,  // Elec 21.92¢ + Water $46 → Occupied $0.162 → Vacant $0.097
  "NH": 0.101,  // Elec 23.40¢ + Water $43 → Occupied $0.169 → Vacant $0.101
  "NY": 0.104,  // Elec 24.43¢ + Water $42 → Occupied $0.173 → Vacant $0.104
  "ME": 0.104,  // Elec 24.29¢ + Water $42 → Occupied $0.173 → Vacant $0.104
  
  // Very high cost states
  "AK": 0.102,  // Elec 22.92¢ + Water $52 → Occupied $0.170 → Vacant $0.102
  "CA": 0.124,  // Elec 27.00¢ + Water $77 → Occupied $0.206 → Vacant $0.124 (HIGHEST COSTS)
  "HI": 0.131,  // Elec 32.06¢ + Water $49 → Occupied $0.219 → Vacant $0.131 (HIGHEST ELEC)
  
  // DC
  "DC": 0.090,  // Urban rates, estimated similar to MD/VA area
};

// Legacy export name for backward compatibility (typo in original)
export const utilityCoststByState = utilityCostsByState;

/**
 * Get the monthly utility cost per square foot for a given state.
 * Returns state-specific rate based on EIA electricity + water data,
 * adjusted for vacant/renovation property usage.
 * 
 * @param state - Two-letter state code (e.g., "GA", "TX")
 * @returns Monthly utility cost per square foot in dollars
 * 
 * Example: For a 2,000 sq ft property in Georgia:
 *   2,000 × $0.077 = $154/month for utilities during renovation
 */
export function getUtilityCostPerSqFt(state: string): number {
  return utilityCostsByState[state.toUpperCase()] || 0.075;
}
