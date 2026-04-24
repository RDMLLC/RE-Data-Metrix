import { RentCastAPIService } from './rentcast-api.service';
import { HasDataAPIService } from './hasdata-api.service';

export interface HybridCompResult {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  salePrice: number;
  saleDate: string;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  pricePerSqft: number;
  yearBuilt?: number;
  lotSize?: number;
  propertyType?: string;
  distanceFromSubject?: number;
  latitude?: number;
  longitude?: number;
  imageUrl?: string;
  listingUrl?: string;
  dataSource: 'rentcast' | 'hasdata' | 'merged';
  similarityScore?: number;
  distressedFlag?: boolean;
  outlierFlag?: boolean;
  borderlineFlag?: boolean;
  cityMismatch?: boolean;
}

export interface HybridCompSearchParams {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  propertyType?: string;
  subjectLat?: number;
  subjectLng?: number;
  radiusMiles?: number;
  saleDateRangeDays?: number;
  maxResults?: number;
  anchorMedian?: number | null;
}

export interface HybridCompSearchResult {
  comps: HybridCompResult[];
  suggestedArv: number | null;
  weightedAvgPricePerSqft: number | null;
  radiusExpanded: boolean;
  actualRadiusMiles: number;
  searchStats: {
    rentCastCount: number;
    hasDataCount: number;
    mergedCount: number;
    totalBeforeDedupe: number;
    finalCount: number;
    suitableCount: number;
    medianPricePerSqft: number | null;
    expansionAttempts: number;
  };
}

const SUITABLE_TARGET = 3;

export class HybridCompsService {
  private rentCastService: RentCastAPIService;
  private hasDataService: HasDataAPIService;

  constructor() {
    this.rentCastService = new RentCastAPIService();
    this.hasDataService = new HasDataAPIService();
  }

  async searchComps(params: HybridCompSearchParams): Promise<HybridCompSearchResult> {
    const {
      address,
      city,
      state,
      zipCode,
      bedrooms,
      bathrooms,
      sqft,
      propertyType,
      subjectLat,
      subjectLng,
      radiusMiles = 3,
      saleDateRangeDays = 180,
      maxResults = 10,
      anchorMedian: externalAnchor = null,
    } = params;

    console.log(`[Hybrid Comps] Starting dual-API search for ${address}, ${city}, ${state}`);

    // Auto-expansion steps match the manual radius buttons exactly: 0.5 → 1 → 2 → 3 → 5
    const RADIUS_STEPS = [0.5, 1, 2, 3, 5];
    const startIndex = RADIUS_STEPS.indexOf(radiusMiles) !== -1
      ? RADIUS_STEPS.indexOf(radiusMiles)
      : RADIUS_STEPS.findIndex(r => r >= radiusMiles);
    const effectiveStartIndex = startIndex === -1 ? 0 : startIndex;

    const expansionConfigs: Array<{ radiusMiles: number; saleDateRangeDays: number }> =
      RADIUS_STEPS.slice(effectiveStartIndex, effectiveStartIndex + 3).map((r, i) => ({
        radiusMiles: r,
        saleDateRangeDays: Math.min(saleDateRangeDays + (i * 90), 365),
      }));

    let bestResult: {
      sortedComps: HybridCompResult[];
      stats: HybridCompSearchResult['searchStats'];
      suggestedArv: number | null;
      weightedAvgPricePerSqft: number | null;
      suitableCount: number;
      anchorMedian: number | null;
      consensusFound: boolean;
    } | null = null;

    let anchorMedian: number | null = externalAnchor;
    let expansionAttempts = 0;

    for (const config of expansionConfigs) {
      expansionAttempts += 1;
      const passResult = await this.runSinglePass({
        address,
        city,
        state,
        zipCode,
        bedrooms,
        bathrooms,
        sqft,
        propertyType,
        subjectLat,
        subjectLng,
        radiusMiles: config.radiusMiles,
        saleDateRangeDays: config.saleDateRangeDays,
        maxResults,
        anchorMedian: expansionAttempts === 1 ? null : anchorMedian,
      });

      // Only adopt the anchor if this pass found a true consensus pair.
      // If no consensus yet, keep anchorMedian null so the next pass tries again.
      if (anchorMedian === null && passResult.consensusFound) {
        anchorMedian = passResult.anchorMedian;
        console.log(`[Hybrid Comps] Consensus anchor established at $${anchorMedian}/sqft on attempt ${expansionAttempts}`);
      }

      passResult.stats.expansionAttempts = expansionAttempts;

      if (!bestResult || passResult.suitableCount > bestResult.suitableCount) {
        bestResult = passResult;
      }

      if (passResult.suitableCount >= SUITABLE_TARGET) {
        console.log(`[Hybrid Comps] Found ${passResult.suitableCount} suitable comps after attempt ${expansionAttempts}`);
        break;
      }

      console.log(`[Hybrid Comps] Only ${passResult.suitableCount} suitable comps after attempt ${expansionAttempts}, expanding...`);
    }

    if (!bestResult) {
      return {
        comps: [],
        suggestedArv: null,
        weightedAvgPricePerSqft: null,
        radiusExpanded: false,
        actualRadiusMiles: radiusMiles,
        searchStats: {
          rentCastCount: 0,
          hasDataCount: 0,
          mergedCount: 0,
          totalBeforeDedupe: 0,
          finalCount: 0,
          suitableCount: 0,
          medianPricePerSqft: null,
          expansionAttempts,
        },
      };
    }

    // If we found a consensus anchor, re-flag the final comp set against it
    // to ensure comps from earlier passes are correctly classified.
    if (anchorMedian !== null && bestResult) {
      console.log(`[Hybrid Comps] Re-flagging ${bestResult.sortedComps.length} comps against consensus anchor $${anchorMedian}/sqft`);
      // Reset all flags before re-applying
      for (const comp of bestResult.sortedComps) {
        comp.distressedFlag = false;
        comp.outlierFlag = false;
        comp.borderlineFlag = false;
      }
      this.applyFlags(bestResult.sortedComps, anchorMedian);

      // Recount suitable comps after re-flagging
      const resuitable = bestResult.sortedComps.filter(
        c => !c.outlierFlag && !c.distressedFlag && !c.borderlineFlag
      );
      bestResult.suitableCount = resuitable.length;

      // Recompute ARV from re-flagged comps
      const arvBasis = resuitable.length > 0 ? resuitable : bestResult.sortedComps;
      const totalSalePrice = arvBasis.reduce((sum, c) => sum + c.salePrice, 0);
      const totalSqft = arvBasis.reduce((sum, c) => sum + c.sqft, 0);
      bestResult.weightedAvgPricePerSqft = totalSqft > 0 ? Math.round(totalSalePrice / totalSqft) : null;
      bestResult.suggestedArv = bestResult.weightedAvgPricePerSqft
        ? Math.round(bestResult.weightedAvgPricePerSqft * sqft)
        : null;
      bestResult.stats.suitableCount = resuitable.length;
      bestResult.stats.medianPricePerSqft = anchorMedian;

      console.log(`[Hybrid Comps] After re-flagging: ${resuitable.length} suitable comps`);
    }

    const radiusExpanded = bestResult.stats.expansionAttempts > 1;
    const actualRadiusMiles = expansionConfigs[bestResult.stats.expansionAttempts - 1].radiusMiles;

    return {
      comps: bestResult.sortedComps,
      suggestedArv: bestResult.suggestedArv,
      weightedAvgPricePerSqft: bestResult.weightedAvgPricePerSqft,
      radiusExpanded,
      actualRadiusMiles,
      searchStats: bestResult.stats,
    };
  }

  private async runSinglePass(params: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    bedrooms: number;
    bathrooms?: number;
    sqft: number;
    propertyType?: string;
    subjectLat?: number;
    subjectLng?: number;
    radiusMiles: number;
    saleDateRangeDays: number;
    maxResults: number;
    anchorMedian?: number | null;
  }): Promise<{
    sortedComps: HybridCompResult[];
    stats: HybridCompSearchResult['searchStats'];
    suggestedArv: number | null;
    weightedAvgPricePerSqft: number | null;
    suitableCount: number;
    anchorMedian: number | null;
    consensusFound: boolean;
  }> {
    const {
      address, city, state, zipCode, bedrooms, bathrooms, sqft, propertyType,
      subjectLat, subjectLng, radiusMiles, saleDateRangeDays, maxResults,
    } = params;

    const rentCastComps: HybridCompResult[] = [];
    const hasDataComps: HybridCompResult[] = [];

    try {
      const [rentCastResult, hasDataResult] = await Promise.allSettled([
        this.rentCastService.searchComparableSales({
          address,
          city,
          state,
          zipCode,
          bedrooms: 0, // Skip hard bedroom filter — scored as soft preference instead
          bathrooms: 0, // Bathrooms are display-only, never filtered
          sqft,
          propertyType,
          radiusMiles,
          saleDateRangeDays,
          maxResults: 25,
          subjectLat,
          subjectLng,
        }),
        this.hasDataService.searchSoldComps({
          address,
          city,
          state,
          zipCode,
          bedrooms: 0, // Skip hard bedroom filter — scored as soft preference instead
          bathrooms: 0, // Bathrooms are display-only, never filtered
          sqft,
          propertyType,
          subjectLat,
          subjectLng,
          radiusMiles,
          daysBack: saleDateRangeDays,
          minResults: SUITABLE_TARGET,
          maxResults: 25,
        }),
      ]);

      if (rentCastResult.status === 'fulfilled' && rentCastResult.value?.comps) {
        for (const comp of rentCastResult.value.comps) {
          rentCastComps.push({ ...comp, dataSource: 'rentcast' });
        }
        console.log(`[Hybrid Comps] RentCast returned ${rentCastComps.length} comps`);
      } else if (rentCastResult.status === 'rejected') {
        console.error(`[Hybrid Comps] RentCast failed:`, rentCastResult.reason);
      }

      if (hasDataResult.status === 'fulfilled' && Array.isArray(hasDataResult.value)) {
        for (const comp of hasDataResult.value) {
          hasDataComps.push({ ...comp, dataSource: 'hasdata' });
        }
        console.log(`[Hybrid Comps] HasData returned ${hasDataComps.length} comps`);
      } else if (hasDataResult.status === 'rejected') {
        console.error(`[Hybrid Comps] HasData failed:`, hasDataResult.reason);
      }
    } catch (error) {
      console.error(`[Hybrid Comps] Error in parallel API calls:`, error);
    }

    const mergedComps = this.mergeAndDeduplicate(rentCastComps, hasDataComps, sqft);

    // Pre-sort: distance, then recency. Final ordering happens after flagging/scoring.
    let sortedComps = mergedComps
      .sort((a, b) => {
        if (a.distanceFromSubject !== undefined && b.distanceFromSubject !== undefined) {
          const distDiff = a.distanceFromSubject - b.distanceFromSubject;
          if (Math.abs(distDiff) > 0.1) return distDiff;
        }
        return new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime();
      })
      .slice(0, maxResults);

    const rawPpsf = sortedComps.map(c => c.pricePerSqft).filter(p => p > 0);
    const rawMedian = this.computeMedian(rawPpsf);

    let median: number | null;
    let consensusAnchor: number | null = null;
    if (params.anchorMedian != null) {
      // Use the anchor median passed from the first expansion pass
      median = params.anchorMedian;
    } else {
      // First pass: try to find a consensus anchor from the closest agreeing comps
      consensusAnchor = this.computeConsensusAnchor(sortedComps);
      if (consensusAnchor !== null) {
        median = consensusAnchor;
      } else {
        // Fall back to cleaned median (exclude values below 50% or above 200% of raw median)
        const cleanedPpsf = rawMedian !== null
          ? rawPpsf.filter(p => p >= rawMedian * 0.5 && p <= rawMedian * 2.0)
          : rawPpsf;
        median = this.computeMedian(cleanedPpsf);
      }
    }

    // Apply flags using dynamic thresholds based on comp count
    if (median !== null) {
      this.applyFlags(sortedComps, median);
    }

    // Compute similarity score for every comp
    for (const comp of sortedComps) {
      comp.similarityScore = this.computeSimilarityScore(comp, {
        subjectLat,
        subjectLng,
        subjectBedrooms: bedrooms,
        subjectBathrooms: bathrooms,
        median,
      });
    }

    // Flag comps from a different city than the subject property
    if (city) {
      const normalizeCity = (c: string) => c.toLowerCase().trim();
      for (const comp of sortedComps) {
        if (comp.city && normalizeCity(comp.city) !== normalizeCity(city)) {
          comp.cityMismatch = true;
        }
      }
    }

    // ARV / weighted average computed from suitable (unflagged) comps only.
    // Falls back to all comps if no suitable comps exist.
    const suitable = sortedComps.filter(
      c => !c.outlierFlag && !c.distressedFlag && !c.borderlineFlag
    );
    const arvBasis = suitable.length > 0 ? suitable : sortedComps;

    let suggestedArv: number | null = null;
    let weightedAvgPricePerSqft: number | null = null;
    if (arvBasis.length > 0) {
      const totalSalePrice = arvBasis.reduce((sum, c) => sum + c.salePrice, 0);
      const totalSqft = arvBasis.reduce((sum, c) => sum + c.sqft, 0);
      weightedAvgPricePerSqft = totalSqft > 0 ? Math.round(totalSalePrice / totalSqft) : null;
      suggestedArv = weightedAvgPricePerSqft ? Math.round(weightedAvgPricePerSqft * sqft) : null;
    }

    const stats = {
      rentCastCount: rentCastComps.length,
      hasDataCount: hasDataComps.length,
      mergedCount: mergedComps.filter(c => c.dataSource === 'merged').length,
      totalBeforeDedupe: rentCastComps.length + hasDataComps.length,
      finalCount: sortedComps.length,
      suitableCount: suitable.length,
      medianPricePerSqft: median,
      expansionAttempts: 0,
    };

    console.log(
      `[Hybrid Comps] Pass result: ${stats.finalCount} comps, ${stats.suitableCount} suitable, ` +
      `median $${median}/sqft (RentCast: ${stats.rentCastCount}, HasData: ${stats.hasDataCount}, Merged: ${stats.mergedCount})`
    );

    return {
      sortedComps,
      stats,
      suggestedArv,
      weightedAvgPricePerSqft,
      suitableCount: suitable.length,
      anchorMedian: median,
      consensusFound: consensusAnchor !== null,
    };
  }

  /**
   * Find a consensus anchor median from the closest comps.
   * Takes the closest N comps by distance, checks if any 2 agree within ±20% $/sqft.
   * If consensus found, returns their average as the anchor.
   * Expands from top 3 → top 5 → top 7 if needed.
   * Returns null if no consensus found (caller falls back to cleaned median).
   */
  private computeConsensusAnchor(comps: HybridCompResult[]): number | null {
    if (!comps || comps.length < 2) return null;

    // Sort by distance, take closest comps
    const byDistance = [...comps]
      .filter(c => c.pricePerSqft > 0)
      .sort((a, b) => (a.distanceFromSubject ?? 99) - (b.distanceFromSubject ?? 99));

    // Try expanding groups: top 3, top 5, top 7
    for (const groupSize of [3, 5, 7]) {
      const group = byDistance.slice(0, groupSize);
      if (group.length < 2) continue;

      // Find any pair within ±20% of each other
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const a = group[i].pricePerSqft;
          const b = group[j].pricePerSqft;
          const avg = (a + b) / 2;
          const diff = Math.abs(a - b) / avg;
          if (diff <= 0.20) {
            // Found consensus pair — return their average as anchor
            console.log(`[Hybrid Comps] Consensus anchor: ${group[i].address} ($${a}) + ${group[j].address} ($${b}) → anchor $${Math.round(avg)}/sqft`);
            return Math.round(avg);
          }
        }
      }
    }

    console.log(`[Hybrid Comps] No consensus anchor found, falling back to cleaned median`);
    return null;
  }

  private computeMedian(values: number[]): number | null {
    if (values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  /**
   * Apply distressed / outlier / borderline flags to comps based on dynamic thresholds.
   * - 5+ comps: distressed = ppsf < median/1.5; outlier = ppsf > median*1.5
   * - <5 comps: distressed = ppsf < median/2.0; outlier = ppsf > median*2.0
   * - Borderline: within 15% above the distressed threshold OR within 15% below the
   *   outlier threshold, and not already flagged distressed/outlier.
   */
  private applyFlags(comps: HybridCompResult[], median: number): void {
    const wide = comps.length < 5;
    const factor = wide ? 2.0 : 1.5;
    const distressedThreshold = median / factor;
    const outlierThreshold = median * factor;
    const borderlineLowerMax = distressedThreshold * 1.15;
    const borderlineUpperMin = outlierThreshold / 1.15;

    for (const comp of comps) {
      const ppsf = comp.pricePerSqft;
      if (!ppsf || ppsf <= 0) continue;

      if (ppsf > outlierThreshold) {
        comp.outlierFlag = true;
      } else if (ppsf < distressedThreshold) {
        comp.distressedFlag = true;
      } else if (
        (ppsf >= distressedThreshold && ppsf <= borderlineLowerMax) ||
        (ppsf >= borderlineUpperMin && ppsf <= outlierThreshold)
      ) {
        comp.borderlineFlag = true;
      }
    }
  }

  /**
   * 100-point similarity score:
   *   Distance: 40, Recency: 30, $/sqft proximity to median: 20, Bedroom match: 10
   */
  private computeSimilarityScore(
    comp: HybridCompResult,
    ctx: {
      subjectLat?: number;
      subjectLng?: number;
      subjectBedrooms: number;
      subjectBathrooms?: number;
      median: number | null;
    }
  ): number {
    // Distance (40)
    let distScore = 4;
    const dist = comp.distanceFromSubject;
    if (dist !== undefined) {
      if (dist < 0.25) distScore = 40;
      else if (dist < 0.5) distScore = 32;
      else if (dist < 0.75) distScore = 20;
      else if (dist < 1.0) distScore = 10;
      else distScore = 4;
    }

    // Recency (25)
    let recencyScore = 0;
    const sale = new Date(comp.saleDate);
    if (!isNaN(sale.getTime())) {
      const monthsAgo = (Date.now() - sale.getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (monthsAgo <= 2) recencyScore = 25;
      else if (monthsAgo <= 3) recencyScore = 20;
      else if (monthsAgo <= 4) recencyScore = 15;
      else if (monthsAgo <= 5) recencyScore = 10;
      else if (monthsAgo <= 6) recencyScore = 5;
      else recencyScore = 0;
    }

    // $/sqft proximity to median (15)
    let ppsfScore = 0;
    if (ctx.median !== null && ctx.median > 0 && comp.pricePerSqft > 0) {
      const pct = Math.abs(comp.pricePerSqft - ctx.median) / ctx.median;
      if (pct <= 0.10) ppsfScore = 15;
      else if (pct <= 0.20) ppsfScore = 10;
      else if (pct <= 0.30) ppsfScore = 6;
      else if (pct <= 0.40) ppsfScore = 3;
      else ppsfScore = 0;
    }

    // Bedroom + bathroom match (20)
    // Bedroom mismatch is penalized more heavily than bathroom mismatch
    // because adding a bedroom is a major structural project vs a bath addition
    let bedBathScore = 0;

    // Bedroom component (15 points)
    const bedDiff = Math.abs((comp.bedrooms || 0) - ctx.subjectBedrooms);
    let bedComponent = 0;
    if (bedDiff === 0) bedComponent = 15;
    else if (bedDiff === 1) bedComponent = 7;
    else bedComponent = 0;

    // Bathroom component (5 points)
    const bathDiff = Math.abs((comp.bathrooms || 0) - (ctx.subjectBathrooms || 0));
    let bathComponent = 0;
    if (bathDiff === 0) bathComponent = 5;
    else if (bathDiff <= 0.5) bathComponent = 4;
    else if (bathDiff <= 1) bathComponent = 2;
    else bathComponent = 0;

    bedBathScore = bedComponent + bathComponent;

    return distScore + recencyScore + ppsfScore + bedBathScore;
  }

  private mergeAndDeduplicate(
    rentCastComps: HybridCompResult[],
    hasDataComps: HybridCompResult[],
    subjectSqft: number
  ): HybridCompResult[] {
    const normalizedRentCast = new Map<string, HybridCompResult>();
    const normalizedHasData = new Map<string, HybridCompResult>();

    for (const comp of rentCastComps) {
      const key = this.normalizeAddress(comp.address, comp.zipCode);
      normalizedRentCast.set(key, comp);
    }

    for (const comp of hasDataComps) {
      const key = this.normalizeAddress(comp.address, comp.zipCode);
      normalizedHasData.set(key, comp);
    }

    const result: HybridCompResult[] = [];
    const processedKeys = new Set<string>();

    const hasDataEntries = Array.from(normalizedHasData.entries());
    for (const [key, hasDataComp] of hasDataEntries) {
      processedKeys.add(key);
      const rentCastComp = normalizedRentCast.get(key);

      if (rentCastComp) {
        const merged = this.smartMerge(rentCastComp, hasDataComp);
        result.push(merged);
      } else {
        result.push(hasDataComp);
      }
    }

    const rentCastEntries = Array.from(normalizedRentCast.entries());
    for (const [key, rentCastComp] of rentCastEntries) {
      if (!processedKeys.has(key)) {
        result.push(rentCastComp);
      }
    }

    return result;
  }

  private normalizeAddress(address: string, zipCode: string): string {
    let normalized = address.toLowerCase().trim();

    const replacements: [RegExp, string][] = [
      [/\bstreet\b/g, 'st'],
      [/\bavenue\b/g, 'ave'],
      [/\bboulevard\b/g, 'blvd'],
      [/\bdrive\b/g, 'dr'],
      [/\bcourt\b/g, 'ct'],
      [/\blane\b/g, 'ln'],
      [/\broad\b/g, 'rd'],
      [/\bplace\b/g, 'pl'],
      [/\bcircle\b/g, 'cir'],
      [/\bterrace\b/g, 'ter'],
      [/\bway\b/g, 'way'],
      [/\bnorth\b/g, 'n'],
      [/\bsouth\b/g, 's'],
      [/\beast\b/g, 'e'],
      [/\bwest\b/g, 'w'],
      [/\bnortheast\b/g, 'ne'],
      [/\bnorthwest\b/g, 'nw'],
      [/\bsoutheast\b/g, 'se'],
      [/\bsouthwest\b/g, 'sw'],
      [/\bapartment\b/g, 'apt'],
      [/\bunit\b/g, 'unit'],
      [/\bsuite\b/g, 'ste'],
      [/[.,#]/g, ''],
      [/\s+/g, ' '],
    ];

    for (const [pattern, replacement] of replacements) {
      normalized = normalized.replace(pattern, replacement);
    }

    const zip = (zipCode || '').replace(/\D/g, '').slice(0, 5);

    return `${normalized}|${zip}`;
  }

  private smartMerge(rentCast: HybridCompResult, hasData: HybridCompResult): HybridCompResult {
    const salePrice = hasData.salePrice > 0 ? hasData.salePrice : rentCast.salePrice;
    const saleDate = this.preferredSaleDate(rentCast.saleDate, hasData.saleDate);
    const sqft = hasData.sqft || rentCast.sqft;
    const pricePerSqft = sqft > 0 ? Math.round(salePrice / sqft) : 0;

    return {
      address: hasData.address || rentCast.address,
      city: hasData.city || rentCast.city,
      state: hasData.state || rentCast.state,
      zipCode: hasData.zipCode || rentCast.zipCode,
      salePrice,
      saleDate,
      bedrooms: hasData.bedrooms || rentCast.bedrooms,
      bathrooms: hasData.bathrooms || rentCast.bathrooms,
      sqft,
      pricePerSqft,
      yearBuilt: hasData.yearBuilt || rentCast.yearBuilt,
      lotSize: rentCast.lotSize || hasData.lotSize,
      propertyType: hasData.propertyType || rentCast.propertyType,
      distanceFromSubject: hasData.distanceFromSubject ?? rentCast.distanceFromSubject,
      latitude: hasData.latitude || rentCast.latitude,
      longitude: hasData.longitude || rentCast.longitude,
      imageUrl: hasData.imageUrl,
      listingUrl: hasData.listingUrl,
      dataSource: 'merged',
    };
  }

  private preferredSaleDate(rentCastDate: string, hasDataDate: string): string {
    const isValidDate = (d: string) => {
      if (!d || d === 'Pending') return false;
      const date = new Date(d);
      return !isNaN(date.getTime()) && date.getFullYear() > 2000;
    };

    if (isValidDate(hasDataDate)) {
      return hasDataDate;
    }
    if (isValidDate(rentCastDate)) {
      return rentCastDate;
    }
    return hasDataDate || rentCastDate || '';
  }
}
