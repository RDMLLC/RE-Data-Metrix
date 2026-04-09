export interface TaxBracket {
  upTo: number | null; // null = no upper limit
  ratePercent: number;
}

export interface TieredTransferTax {
  state: string;
  city?: string;
  cityAliases?: string[];
  county?: string;
  displayName: string;
  brackets: TaxBracket[];
  notes: string;
}

export const tieredTransferTaxes: TieredTransferTax[] = [
  // San Francisco, CA
  {
    state: 'CA', city: 'San Francisco',
    displayName: 'San Francisco, CA',
    notes: 'City + County combined rate. Tiered by sale price.',
    brackets: [
      { upTo: 250000, ratePercent: 0.50 },
      { upTo: 999999, ratePercent: 0.68 },
      { upTo: 4999999, ratePercent: 0.75 },
      { upTo: 9999999, ratePercent: 2.25 },
      { upTo: 24999999, ratePercent: 5.50 },
      { upTo: null, ratePercent: 6.00 },
    ],
  },
  // Oakland, CA
  {
    state: 'CA', city: 'Oakland',
    displayName: 'Oakland, CA',
    notes: 'City + County combined rate. Tiered by sale price.',
    brackets: [
      { upTo: 299999, ratePercent: 1.10 },
      { upTo: 1999999, ratePercent: 1.61 },
      { upTo: 4999999, ratePercent: 1.86 },
      { upTo: null, ratePercent: 2.61 },
    ],
  },
  // Los Angeles, CA
  {
    state: 'CA', city: 'Los Angeles',
    displayName: 'Los Angeles, CA',
    notes: 'City + County combined rate. Tiered by sale price.',
    brackets: [
      { upTo: 5299999, ratePercent: 0.56 },
      { upTo: 10599999, ratePercent: 4.56 },
      { upTo: null, ratePercent: 6.06 },
    ],
  },
  // Berkeley, CA
  {
    state: 'CA', city: 'Berkeley',
    displayName: 'Berkeley, CA',
    notes: 'City + County combined rate. Tiered by sale price.',
    brackets: [
      { upTo: 1599999, ratePercent: 1.61 },
      { upTo: null, ratePercent: 2.61 },
    ],
  },
  // Culver City, CA
  {
    state: 'CA', city: 'Culver City',
    displayName: 'Culver City, CA',
    notes: 'City + County combined rate. Tiered by sale price.',
    brackets: [
      { upTo: 1499999, ratePercent: 0.56 },
      { upTo: 2999999, ratePercent: 1.21 },
      { upTo: 9999999, ratePercent: 3.11 },
      { upTo: null, ratePercent: 4.11 },
    ],
  },
  // Santa Monica, CA
  {
    state: 'CA', city: 'Santa Monica',
    displayName: 'Santa Monica, CA',
    notes: 'City + County combined rate. Tiered by sale price.',
    brackets: [
      { upTo: 4999999, ratePercent: 0.41 },
      { upTo: 7999999, ratePercent: 0.71 },
      { upTo: null, ratePercent: 5.71 },
    ],
  },
  // Richmond, CA
  {
    state: 'CA', city: 'Richmond',
    displayName: 'Richmond, CA',
    notes: 'City + County combined rate. Tiered by sale price.',
    brackets: [
      { upTo: 999999, ratePercent: 0.81 },
      { upTo: 2999999, ratePercent: 1.46 },
      { upTo: 9999999, ratePercent: 2.61 },
      { upTo: null, ratePercent: 3.11 },
    ],
  },
  // Emeryville, CA
  {
    state: 'CA', city: 'Emeryville',
    displayName: 'Emeryville, CA',
    notes: 'City + County combined rate. Tiered by sale price.',
    brackets: [
      { upTo: 999999, ratePercent: 1.31 },
      { upTo: 1499999, ratePercent: 1.61 },
      { upTo: 1999999, ratePercent: 1.61 },
      { upTo: null, ratePercent: 2.61 },
    ],
  },
  // New York City, NY
  {
    state: 'NY', city: 'New York City',
    cityAliases: ['manhattan', 'brooklyn', 'bronx', 'queens', 'staten island'],
    displayName: 'New York City, NY',
    notes: 'NYC + NYS combined rate. Tiered by sale price. $1M+ adds NYS mansion tax (buyer).',
    brackets: [
      { upTo: 499999, ratePercent: 1.40 },
      { upTo: 999999, ratePercent: 1.825 },
      { upTo: null, ratePercent: 2.825 },
    ],
  },
  // Washington State
  {
    state: 'WA',
    displayName: 'Washington State',
    notes: 'State excise tax. Tiered by sale price.',
    brackets: [
      { upTo: 525000, ratePercent: 1.10 },
      { upTo: 1525000, ratePercent: 1.28 },
      { upTo: 3025000, ratePercent: 2.75 },
      { upTo: null, ratePercent: 3.00 },
    ],
  },
  // New Jersey
  {
    state: 'NJ',
    displayName: 'New Jersey',
    notes: 'State transfer tax. Tiered by sale price. $1M+ adds 1% mansion tax.',
    brackets: [
      { upTo: 350000, ratePercent: 1.00 },
      { upTo: 999999, ratePercent: 1.25 },
      { upTo: null, ratePercent: 2.50 },
    ],
  },
  // Connecticut
  {
    state: 'CT',
    displayName: 'Connecticut',
    notes: 'State transfer tax. Tiered by sale price.',
    brackets: [
      { upTo: 800000, ratePercent: 0.75 },
      { upTo: null, ratePercent: 1.25 },
    ],
  },
  // Hawaii
  {
    state: 'HI',
    displayName: 'Hawaii',
    notes: 'State conveyance tax. Tiered by sale price.',
    brackets: [
      { upTo: 600000, ratePercent: 0.10 },
      { upTo: 1000000, ratePercent: 0.20 },
      { upTo: 2000000, ratePercent: 0.30 },
      { upTo: 4000000, ratePercent: 0.50 },
      { upTo: 6000000, ratePercent: 0.70 },
      { upTo: 10000000, ratePercent: 0.90 },
      { upTo: null, ratePercent: 1.00 },
    ],
  },
  // Washington DC
  {
    state: 'DC',
    displayName: 'Washington, DC',
    notes: 'Combined recordation + transfer tax. Tiered by sale price.',
    brackets: [
      { upTo: 400000, ratePercent: 1.10 },
      { upTo: null, ratePercent: 1.45 },
    ],
  },
];

export function getTieredRate(stateCode: string, city: string, purchasePrice: number): { ratePercent: number; tiered: TieredTransferTax } | null {
  const normalizedCity = city.trim().toLowerCase();
  const normalizedState = stateCode.trim().toUpperCase();

  const match = tieredTransferTaxes.find(t => {
    const stateMatch = t.state.toUpperCase() === normalizedState;
    if (!stateMatch) return false;
    if (t.city) {
      return t.city.toLowerCase() === normalizedCity ||
             (t.cityAliases?.includes(normalizedCity) ?? false);
    }
    return !normalizedCity; // state-level tiered entry matches when no city
  });

  if (!match) {
    // For state-level tiered entries (WA, NJ, CT, HI, DC), match by state alone
    const stateMatch = tieredTransferTaxes.find(t =>
      t.state.toUpperCase() === normalizedState && !t.city
    );
    if (!stateMatch) return null;
    const bracket = stateMatch.brackets.find(b => b.upTo === null || purchasePrice <= b.upTo);
    return bracket ? { ratePercent: bracket.ratePercent, tiered: stateMatch } : null;
  }

  const bracket = match.brackets.find(b => b.upTo === null || purchasePrice <= b.upTo);
  return bracket ? { ratePercent: bracket.ratePercent, tiered: match } : null;
}
