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
}

export interface HybridCompSearchResult {
  comps: HybridCompResult[];
  radiusExpanded: boolean;
  actualRadiusMiles: number;
  searchStats: {
    rentCastCount: number;
    hasDataCount: number;
    mergedCount: number;
    totalBeforeDedupe: number;
    finalCount: number;
  };
}

// Ordered sequence of radii used for automatic expansion.
// Expansion stops at 3 miles per product spec.
const EXPANSION_SEQUENCE = [0.5, 1, 2, 3] as const;
const MIN_COMPS_THRESHOLD = 3;

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
    } = params;

    console.log(`[Hybrid Comps] Starting dual-API search for ${address}, ${city}, ${state}`);

    // Build the list of radii to attempt.
    // If the user's radius exists in the expansion sequence, start there and walk forward.
    // If it's outside the sequence (e.g. 5 miles), only try that single radius — no expansion.
    const startIdx = EXPANSION_SEQUENCE.indexOf(radiusMiles as typeof EXPANSION_SEQUENCE[number]);
    const radiiToTry: number[] = startIdx >= 0
      ? Array.from(EXPANSION_SEQUENCE).slice(startIdx)
      : [radiusMiles];

    let bestResult: { comps: HybridCompResult[]; stats: HybridCompSearchResult['searchStats'] } | null = null;
    let actualRadiusMiles = radiusMiles;
    let radiusExpanded = false;

    for (const currentRadius of radiiToTry) {
      console.log(`[Hybrid Comps] Attempting search at radius=${currentRadius}mi`);

      const attempt = await this.runSingleSearch({
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
        radiusMiles: currentRadius,
        saleDateRangeDays,
        maxResults,
      });

      actualRadiusMiles = currentRadius;
      if (currentRadius !== radiusMiles) {
        radiusExpanded = true;
      }

      if (attempt.comps.length >= MIN_COMPS_THRESHOLD) {
        console.log(`[Hybrid Comps] Found ${attempt.comps.length} comps at radius=${currentRadius}mi — stopping expansion`);
        bestResult = attempt;
        break;
      }

      // Keep the best result so far in case we exhaust all radii
      if (bestResult === null || attempt.comps.length > bestResult.comps.length) {
        bestResult = attempt;
      }

      console.log(`[Hybrid Comps] Only ${attempt.comps.length} comps at radius=${currentRadius}mi — ${currentRadius === radiiToTry[radiiToTry.length - 1] ? 'max radius reached' : 'expanding'}`);
    }

    const finalResult = bestResult ?? { comps: [], stats: { rentCastCount: 0, hasDataCount: 0, mergedCount: 0, totalBeforeDedupe: 0, finalCount: 0 } };

    console.log(`[Hybrid Comps] Final results: ${finalResult.comps.length} comps at ${actualRadiusMiles}mi (expanded=${radiusExpanded})`);

    return {
      comps: finalResult.comps,
      radiusExpanded,
      actualRadiusMiles,
      searchStats: finalResult.stats,
    };
  }

  private async runSingleSearch(params: {
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
    radiusMiles: number;
    saleDateRangeDays: number;
    maxResults: number;
  }): Promise<{ comps: HybridCompResult[]; stats: HybridCompSearchResult['searchStats'] }> {
    const {
      address, city, state, zipCode,
      bedrooms, bathrooms, sqft, propertyType,
      subjectLat, subjectLng,
      radiusMiles, saleDateRangeDays, maxResults,
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
          bedrooms,
          bathrooms,
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
          bedrooms,
          bathrooms,
          sqft,
          propertyType,
          subjectLat,
          subjectLng,
          radiusMiles,
          daysBack: saleDateRangeDays,
          minResults: 3,
          maxResults: 15,
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

    const sortedComps = mergedComps
      .sort((a, b) => {
        if (a.distanceFromSubject !== undefined && b.distanceFromSubject !== undefined) {
          const distDiff = a.distanceFromSubject - b.distanceFromSubject;
          if (Math.abs(distDiff) > 0.1) return distDiff;
        }
        return new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime();
      })
      .slice(0, maxResults);

    const stats = {
      rentCastCount: rentCastComps.length,
      hasDataCount: hasDataComps.length,
      mergedCount: mergedComps.filter(c => c.dataSource === 'merged').length,
      totalBeforeDedupe: rentCastComps.length + hasDataComps.length,
      finalCount: sortedComps.length,
    };

    return { comps: sortedComps, stats };
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
