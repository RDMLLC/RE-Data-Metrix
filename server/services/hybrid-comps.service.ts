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
  dateRangeExpanded: boolean;
  actualDateRangeDays: number;
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

    // Auto-expansion sequence (only fires when fewer than SUITABLE_TARGET
    // suitable comps are found at the previous step). Sequence is bounded:
    //   - Radius is never expanded beyond 1 mile
    //   - Date range is never expanded beyond 365 days
    //
    // Starting from a radius ≤ 1 mi:
    //   1. requested radius @ user date range
    //   2. 1 mi @ user date range (skipped if requested radius is already 1 mi)
    //   3. 1 mi @ 270 days (skipped if user date range is already ≥ 270)
    //   4. 1 mi @ 365 days (skipped if user date range is already ≥ 365)
    //
    // Starting from a radius > 1 mi (2/3/5): single attempt at the requested
    // radius and date range with NO auto-expansion, to honor the rule that
    // auto-expansion never widens radius beyond 1 mile.
    const requestedRadius = radiusMiles;
    const requestedDateRange = saleDateRangeDays;
    const expansionConfigs: Array<{ radiusMiles: number; saleDateRangeDays: number }> = [];

    if (requestedRadius > 2) {
      expansionConfigs.push({ radiusMiles: requestedRadius, saleDateRangeDays: requestedDateRange });
    } else {
      // First attempt always at the requested radius (≤ 1 mi)
      expansionConfigs.push({ radiusMiles: requestedRadius, saleDateRangeDays: requestedDateRange });
      // Step up to 1 mi if we started below
      if (requestedRadius < 1) {
        expansionConfigs.push({ radiusMiles: 1, saleDateRangeDays: requestedDateRange });
      }
      // Then widen the date range, capped at 365
      if (requestedDateRange < 270) {
        expansionConfigs.push({ radiusMiles: 1, saleDateRangeDays: 270 });
      }
      if (requestedDateRange < 365) {
        expansionConfigs.push({ radiusMiles: 1, saleDateRangeDays: 365 });
      }
      if (requestedRadius < 2) {
        expansionConfigs.push({ radiusMiles: 2, saleDateRangeDays: requestedDateRange });
      }
    }

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
    // Track the most recent pass so that when every pass returns 0 comps the
    // outer caller still sees the WIDEST radius/date-range we actually tried,
    // not the narrowest. Without this, bestResult would stay at pass 1 (the
    // strict `>` below never fires on ties at 0) and the response would falsely
    // signal "no expansion attempted".
    let lastPassResult: typeof bestResult = null;

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
      //
      // Path-equivalence rule: for ≤ 1 mi searches we must guarantee that an
      // explicit 1 mi click and a ½ mi click (which auto-expands through 1 mi
      // configs) seed downstream passes with the same anchor. To do that we
      // ONLY allow anchors to be established by passes whose radius is ≥ 1 mi.
      // Otherwise a 0.5 mi pass could lock in a low-anchor on neighborhood
      // prices that the explicit-1-mi path would never see. For requestedRadius
      // > 1 mi there is only one pass anyway, so the rule has no effect there.
      if (anchorMedian === null && passResult.consensusFound && config.radiusMiles >= 1) {
        anchorMedian = passResult.anchorMedian;
        console.log(`[Hybrid Comps] Consensus anchor established at $${anchorMedian}/sqft on attempt ${expansionAttempts}`);
      }

      passResult.stats.expansionAttempts = expansionAttempts;
      lastPassResult = passResult;

      if (!bestResult || passResult.suitableCount > bestResult.suitableCount) {
        bestResult = passResult;
      }

      // For requestedRadius > 1 mi (2/3/5) there is only a single config, so
      // we always exit after the first pass anyway — the early-break is moot.
      //
      // For requestedRadius ≤ 1 mi we INTENTIONALLY do NOT early-break when
      // suitableCount >= SUITABLE_TARGET. We always walk all configs and pick
      // the bestResult by suitableCount. This guarantees that an explicit
      // 1 mi click and a ½ mi search that auto-expanded to 1 mi produce the
      // same final comp set: both walk through [1/180, 1/270, 1/365] and
      // settle on whichever pass yielded the most suitable comps. Without
      // this, 1 mi click would break early at 1/180 while the ½ mi sequence
      // (whose 0.5/180 pass typically returns 0 suitable) would proceed to
      // 1/270 or 1/365 and end up with a different — usually larger — set.
      if (requestedRadius > 1 && passResult.suitableCount >= SUITABLE_TARGET) {
        console.log(`[Hybrid Comps] Found ${passResult.suitableCount} suitable comps after attempt ${expansionAttempts}`);
        break;
      }

      console.log(`[Hybrid Comps] Pass ${expansionAttempts} returned ${passResult.suitableCount} suitable comps; continuing to next config (or exiting if last).`);
    }

    // If every pass returned 0 comps, bestResult is still pinned to pass 1
    // (the first pass beat `null`, but no later pass could beat 0 with a
    // strict `>`). Promote the LAST pass result instead so actualRadiusMiles,
    // actualDateRangeDays, and the expansion flags downstream reflect the
    // widest config we actually attempted. Only kicks in on the multi-config
    // (≤ 1 mi) path; on the single-config (> 1 mi) path lastPassResult is
    // identical to bestResult so this is a no-op.
    if (bestResult && lastPassResult && bestResult.stats.finalCount === 0) {
      bestResult = lastPassResult;
    }

    if (!bestResult) {
      return {
        comps: [],
        suggestedArv: null,
        weightedAvgPricePerSqft: null,
        radiusExpanded: false,
        actualRadiusMiles: radiusMiles,
        dateRangeExpanded: false,
        actualDateRangeDays: requestedDateRange,
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
      // Pass the bestResult's pass radius so the bimodal safeguard inside
      // applyFlags is correctly gated on tight (≤1mi) searches only.
      const bestRadiusForFlags = expansionConfigs[bestResult.stats.expansionAttempts - 1]?.radiusMiles ?? requestedRadius;
      this.applyFlags(bestResult.sortedComps, anchorMedian, bestRadiusForFlags);

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

    const winningConfig = expansionConfigs[bestResult.stats.expansionAttempts - 1];
    const actualRadiusMiles = winningConfig.radiusMiles;
    const actualDateRangeDays = winningConfig.saleDateRangeDays;
    const radiusExpanded = actualRadiusMiles > requestedRadius;
    const dateRangeExpanded = actualDateRangeDays > requestedDateRange;

    return {
      comps: bestResult.sortedComps,
      suggestedArv: bestResult.suggestedArv,
      weightedAvgPricePerSqft: bestResult.weightedAvgPricePerSqft,
      radiusExpanded,
      actualRadiusMiles,
      dateRangeExpanded,
      actualDateRangeDays,
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
    const redfinComps: HybridCompResult[] = [];

    try {
      const [rentCastResult, hasDataResult, redfinResult] = await Promise.allSettled([
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
        this.hasDataService.searchSoldCompsRedfin({
          address,
          city,
          state,
          zipCode,
          bedrooms: 0,
          bathrooms: 0,
          sqft,
          propertyType,
          subjectLat,
          subjectLng,
          radiusMiles,
          daysBack: saleDateRangeDays,
          minResults: SUITABLE_TARGET,
          maxResults: 25,
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
      if (redfinResult.status === 'fulfilled' && Array.isArray(redfinResult.value)) {
        for (const comp of redfinResult.value) {
          redfinComps.push({ ...comp, dataSource: 'hasdata' });
        }
        console.log(`[Hybrid Comps] Redfin returned ${redfinComps.length} comps`);
      } else if (redfinResult.status === 'rejected') {
        console.error(`[Hybrid Comps] Redfin failed:`, redfinResult.reason);
      }
    } catch (error) {
      console.error(`[Hybrid Comps] Error in parallel API calls:`, error);
    }

    const mergedComps = this.mergeAndDeduplicate(rentCastComps, [...hasDataComps, ...redfinComps], sqft);

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
      this.applyFlags(sortedComps, median, radiusMiles);
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

    // Find the highest $/sqft among all comps as a quality ceiling reference
    const maxPpsf = Math.max(...byDistance.map(c => c.pricePerSqft));

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

          // Reject pairs where both values are distressed relative to the market
          // (i.e. the consensus average is less than 60% of the highest comp).
          // Using 60% (vs 50%) catches bimodal markets like Snapfinger where the
          // distressed cluster ($63-$80) sits at ~50% of the market-rate cluster
          // ($122-$150) — that pair should not be promoted to anchor.
          if (avg < maxPpsf * 0.6) {
            console.log(`[Hybrid Comps] Rejecting low-value consensus pair: ${group[i].address} ($${a}) + ${group[j].address} ($${b}) avg=$${Math.round(avg)} < 60% of max $${maxPpsf}`);
            continue;
          }

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
  private applyFlags(comps: HybridCompResult[], median: number, radiusMiles: number = 1): void {
    const wide = comps.length < 5;
    const factor = wide ? 2.0 : 1.5;
    const distressedThreshold = median / factor;
    const outlierThreshold = median * factor;
    const borderlineLowerMax = distressedThreshold * 1.15;
    const borderlineUpperMin = outlierThreshold / 1.15;

    for (const comp of comps) {
      // Sanity check: bedroom counts outside the realistic 0-10 range are
      // data scraping errors (e.g. a 70-bed listing). Flag as distressed so
      // they sort to the bottom and are excluded from auto-selection. This
      // mirrors the same guard on the frontend computeSmartSelection.
      const beds = comp.bedrooms;
      if (typeof beds === "number" && (beds > 10 || beds < 0)) {
        comp.distressedFlag = true;
        comp.outlierFlag = false;
        comp.borderlineFlag = false;
        continue;
      }

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

    // Bimodal-market safeguard: in datasets with significant ppsf spread
    // (max > 1.5x min and ≥3 comps), any comp priced below 60% of the highest
    // comp ppsf is treated as distressed regardless of the median-based flags.
    // This catches cases where the median itself is depressed by a cluster of
    // distressed comps — the median-only logic would otherwise leave the
    // distressed cluster unflagged and flag the true market-rate comps as
    // outliers (e.g. Snapfinger: median lands at $75-80 from a cluster of
    // $63/$70/$80 comps, leaving $122 and $150 flagged as outliers and the
    // $63-$80 cluster auto-selected for ARV).
    //
    // Only run this safeguard for tight searches (≤1 mile). At 2+ miles the
    // ppsf spread is naturally wide because the search reaches into different
    // submarkets / luxury pockets, and the 60%-of-max floor would force-flag
    // legitimate mid-range comps as distressed.
    const ppsfValues = comps
      .map(c => c.pricePerSqft)
      .filter(p => p > 0);
    if (radiusMiles <= 1 && ppsfValues.length >= 3) {
      const maxPpsf = Math.max(...ppsfValues);
      const minPpsf = Math.min(...ppsfValues);
      if (maxPpsf > minPpsf * 1.5) {
        const distressedFloor = maxPpsf * 0.6;
        for (const comp of comps) {
          if (comp.pricePerSqft > 0 && comp.pricePerSqft < distressedFloor) {
            if (!comp.distressedFlag) {
              console.log(`[Hybrid Comps] Bimodal safeguard flagging ${comp.address} ($${comp.pricePerSqft}/sqft) as distressed: < 60% of max $${maxPpsf}/sqft`);
            }
            comp.distressedFlag = true;
            comp.outlierFlag = false;
            comp.borderlineFlag = false;
          }
        }
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
      const existing = normalizedHasData.get(key);
      if (!existing) {
        normalizedHasData.set(key, comp);
      } else {
        normalizedHasData.set(key, {
          ...existing,
          saleDate: existing.saleDate || comp.saleDate,
          salePrice: existing.salePrice || comp.salePrice,
          sqft: existing.sqft || comp.sqft,
          bedrooms: existing.bedrooms || comp.bedrooms,
          bathrooms: existing.bathrooms || comp.bathrooms,
          yearBuilt: existing.yearBuilt || comp.yearBuilt,
          latitude: existing.latitude || comp.latitude,
          longitude: existing.longitude || comp.longitude,
        });
      }
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
