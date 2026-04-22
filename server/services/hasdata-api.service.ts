import type { IPropertyAPIService, PropertyData } from "./property-api.interface";

const HASDATA_BASE_URL = "https://api.hasdata.com";

// Interface for property sale history entry
export interface PropertySaleEntry {
  date: string;
  price: number;
  event: string; // 'sold', 'listed', etc.
}

// Interface for flip detection result
export interface FlipDetectionResult {
  isFlip: boolean;
  sales: PropertySaleEntry[];
  originalSale?: PropertySaleEntry;  // Earlier sale (pre-renovation)
  flippedSale?: PropertySaleEntry;   // Later sale (post-renovation)
  priceIncrease?: number;            // Dollar amount increase
  priceIncreasePercent?: number;     // Percentage increase
}

// Interface for sold property comparables
export interface SoldPropertyComp {
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
  daysOnMarket?: number;
  imageUrl?: string;
  distanceFromSubject?: number; // Distance in miles from subject property
  latitude?: number;
  longitude?: number;
  listingUrl?: string; // URL to view the property listing
}

// Calculate distance between two coordinates using Haversine formula
function calculateDistanceMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export interface CompsSearchParams {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  propertyType?: string; // Subject property type for matching
  minResults?: number; // Default 3
  maxResults?: number; // Default 5
  subjectLat?: number; // Subject property latitude for distance calculation
  subjectLng?: number; // Subject property longitude for distance calculation
  radiusMiles?: number; // User-selected search radius (default: expand from 1-5 miles)
  daysBack?: number; // User-selected time range in days (default: 180 = 6 months)
}

// Helper to check if property types are compatible for comps
function arePropertyTypesCompatible(subjectType: string | undefined, compType: string | undefined): boolean {
  if (!subjectType || !compType) return true; // No filtering if types unknown
  
  const normalize = (t: string) => t.toLowerCase().replace(/[_\s-]/g, '');
  const subject = normalize(subjectType);
  const comp = normalize(compType);
  
  // IMPORTANT: Check attached types FIRST since "townhouse" contains "house"
  // Condo/Townhome/Attached group - these are comparable to each other
  const attachedTypes = ['condo', 'condominium', 'townhouse', 'townhome', 'attached', 'coop', 'cooperative', 'rowhome', 'rowhouse'];
  const isSubjectAttached = attachedTypes.some(t => subject.includes(t));
  const isCompAttached = attachedTypes.some(t => comp.includes(t));
  
  // If comp is attached type but subject is NOT attached, incompatible
  if (isCompAttached && !isSubjectAttached) {
    return false;
  }
  
  // If subject is attached and comp is attached, compatible
  if (isSubjectAttached && isCompAttached) return true;
  
  // Single family group - but ONLY if not already classified as attached
  // Note: "house" is checked but "townhouse" would have already been caught above
  const sfTypes = ['singlefamily', 'single', 'detached'];
  const isSubjectSF = !isSubjectAttached && (sfTypes.some(t => subject.includes(t)) || subject.includes('house'));
  const isCompSF = !isCompAttached && (sfTypes.some(t => comp.includes(t)) || comp.includes('house'));
  
  if (isSubjectSF && isCompSF) return true;
  
  // Multi-family group
  const mfTypes = ['multifamily', 'multi', 'duplex', 'triplex', 'fourplex', 'apartment'];
  const isSubjectMF = mfTypes.some(t => subject.includes(t));
  const isCompMF = mfTypes.some(t => comp.includes(t));
  
  if (isSubjectMF && isCompMF) return true;
  
  // If subject is unknown type, allow all
  if (!isSubjectAttached && !isSubjectSF && !isSubjectMF) return true;
  
  return false;
}

export class HasDataAPIService implements IPropertyAPIService {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string, baseUrl: string = HASDATA_BASE_URL) {
    // Use environment variable first, fall back to provided key
    this.apiKey = process.env.HASDATA_API_KEY || apiKey || "";
    this.baseUrl = baseUrl;
    
    if (!this.apiKey) {
      console.warn("HasData API key not configured. Property lookup will not work.");
    }
  }

  async getPropertyByAddress(
    address: string,
    city: string,
    state: string,
    zipCode: string
  ): Promise<PropertyData | null> {
    throw new Error("Address-based lookup not supported. Use getPropertyByUrl instead.");
  }

  async getPropertyByUrl(url: string): Promise<PropertyData | null> {
    try {
      // Check if API key is configured
      if (!this.apiKey) {
        throw new Error("Property lookup service is not configured. Please use manual entry.");
      }

      const isRedfin = url.includes('redfin.com');
      const isZillow = url.includes('zillow.com');

      if (!isRedfin && !isZillow) {
        throw new Error("Please provide a valid Redfin or Zillow property URL");
      }

      const endpoint = isRedfin 
        ? `${this.baseUrl}/scrape/redfin/property`
        : `${this.baseUrl}/scrape/zillow/property`;

      const params = new URLSearchParams({ url });

      console.log(`Fetching property data from HasData API: ${endpoint}`);

      const response = await fetch(`${endpoint}?${params.toString()}`, {
        method: "GET",
        headers: {
          "x-api-key": this.apiKey,
          "Content-Type": "application/json",
        },
      });

      // Check content-type before parsing JSON
      const contentType = response.headers.get("content-type") || "";
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        
        // Read response as text first to handle HTML error pages
        const errorText = await response.text();
        
        // Check if we got HTML instead of JSON (common for error pages)
        if (errorText.includes("<!DOCTYPE") || errorText.includes("<html")) {
          console.error("HasData API returned HTML error page:", errorText.substring(0, 500));
          throw new Error("Property lookup service is temporarily unavailable. Please use manual entry.");
        }
        
        // Return user-friendly error message
        if (response.status === 400) {
          throw new Error("Unable to find property. Please check the URL and try again, or use manual entry.");
        } else if (response.status === 401 || response.status === 403) {
          throw new Error("Property lookup service is temporarily unavailable. Please use manual entry.");
        } else if (response.status === 429) {
          throw new Error("Too many requests. Please wait a moment and try again.");
        }
        throw new Error("Unable to fetch property data. Please try manual entry instead.");
      }

      // Check if response is actually JSON
      if (!contentType.includes("application/json")) {
        const responseText = await response.text();
        
        // Check if we got HTML instead of JSON
        if (responseText.includes("<!DOCTYPE") || responseText.includes("<html")) {
          console.error("HasData API returned HTML instead of JSON:", responseText.substring(0, 500));
          throw new Error("Property lookup service returned an unexpected response. Please use manual entry.");
        }
        
        // Try to parse as JSON anyway (some APIs don't set content-type correctly)
        try {
          const data = JSON.parse(responseText);
          console.log("HasData API raw response:", JSON.stringify(data, null, 2));
          
          if (isRedfin) {
            return this.transformRedfinResponse(data);
          } else {
            return await this.transformZillowResponse(data);
          }
        } catch (parseError) {
          console.error("Failed to parse HasData API response:", responseText.substring(0, 500));
          throw new Error("Property lookup service returned invalid data. Please use manual entry.");
        }
      }

      const data = await response.json();
      
      console.log("HasData API raw response:", JSON.stringify(data, null, 2));
      
      // Log ALL property keys to help identify missing field mappings
      const property = data.property || data;
      console.log("=== ALL PROPERTY KEYS ===");
      console.log("Top-level keys:", Object.keys(property));
      
      // Look for any keys containing 'tax' (case insensitive)
      const taxRelatedKeys = Object.keys(property).filter(k => 
        k.toLowerCase().includes('tax') || 
        k.toLowerCase().includes('assess')
      );
      console.log("Tax-related keys found:", taxRelatedKeys);
      if (taxRelatedKeys.length > 0) {
        taxRelatedKeys.forEach(key => {
          console.log(`  ${key}:`, JSON.stringify(property[key]));
        });
      }

      if (isRedfin) {
        return this.transformRedfinResponse(data);
      } else {
        return await this.transformZillowResponse(data);
      }
    } catch (error: any) {
      console.error("Error fetching property data from HasData:", error);
      
      // Re-throw with a user-friendly message if it's a network error
      if (error.name === "TypeError" && error.message.includes("fetch")) {
        throw new Error("Unable to connect to property lookup service. Please check your connection and try again.");
      }
      
      throw error;
    }
  }

  private parseNumber(value: any): number | undefined {
    if (value === null || value === undefined || value === "") {
      return undefined;
    }
    
    let stringValue = String(value);
    
    // Remove currency symbols, commas, and common suffixes
    // Handles formats like: "$2,871", "$2,871/year", "2,871/mo", "$223,200"
    stringValue = stringValue
      .replace(/[$,]/g, '')           // Remove $ and commas
      .replace(/\/(year|yr|month|mo|annually|monthly)/gi, '')  // Remove time suffixes
      .replace(/per\s*(year|month|yr|mo)/gi, '')  // Remove "per year" etc.
      .trim();
    
    // If no digits remain, return undefined
    if (!/\d/.test(stringValue)) {
      return undefined;
    }
    
    const parsed = parseFloat(stringValue);
    return isNaN(parsed) ? undefined : parsed;
  }

  // Normalize property type from API values to human-readable display values
  private normalizePropertyType(rawType: string | undefined): string | undefined {
    if (!rawType) return undefined;
    
    const normalized = rawType.toLowerCase().trim();
    
    // Map common API values to human-readable display values
    if (normalized.includes('townhouse') || normalized.includes('town house') || normalized.includes('townhome')) {
      return 'Townhouse';
    }
    if (normalized.includes('single') && normalized.includes('family')) {
      return 'Single Family';
    }
    if (normalized.includes('condo') || normalized.includes('co-op') || normalized.includes('coop')) {
      return 'Condo';
    }
    if (normalized.includes('multi') && normalized.includes('family')) {
      return 'Multi-Family';
    }
    if (normalized.includes('apartment')) {
      return 'Apartment';
    }
    if (normalized.includes('manufactured') || normalized.includes('mobile')) {
      return 'Manufactured';
    }
    if (normalized.includes('lot') || normalized.includes('land')) {
      return 'Land';
    }
    
    // Return the original value if no match (let user edit if needed)
    console.log(`Unknown property type: "${rawType}" - returning as-is`);
    return rawType;
  }

  private transformRedfinResponse(data: any): PropertyData {
    const property = data.property || data;
    
    // Extract first photo URL from Redfin data
    let imageUrl: string | undefined;
    if (property.photos && Array.isArray(property.photos) && property.photos.length > 0) {
      imageUrl = property.photos[0];
    } else if (property.images && Array.isArray(property.images) && property.images.length > 0) {
      imageUrl = property.images[0];
    } else if (property.photoUrl) {
      imageUrl = property.photoUrl;
    }
    
    // Extract property type - Redfin uses various field names
    const propertyType = property.propertyType || 
                         property.homeType || 
                         property.propertyTypeName ||
                         property.homeTypeLabel ||
                         property.type;
    
    // Extract HOA fees - Redfin uses various field names
    const hoaFees = this.parseNumber(
      property.hoaDues ||
      property.hoaFee ||
      property.hoaFees ||
      property.monthlyHoaFee ||
      property.associationDues ||
      property.associationFee ||
      property.hoa?.dues ||
      property.hoa?.fee
    );
    
    // Extract tax from taxHistory array (most recent entry) if available
    let taxHistoryAmount: number | undefined;
    let taxHistoryAssessedValue: number | undefined;
    if (property.taxHistory && Array.isArray(property.taxHistory) && property.taxHistory.length > 0) {
      const sortedHistory = [...property.taxHistory].sort((a: any, b: any) => (b.year || 0) - (a.year || 0));
      const mostRecent = sortedHistory[0];
      taxHistoryAmount = this.parseNumber(mostRecent.taxPaid || mostRecent.tax || mostRecent.amount || mostRecent.taxAmount);
      taxHistoryAssessedValue = this.parseNumber(mostRecent.value || mostRecent.assessedValue || mostRecent.taxAssessedValue);
    }
    
    // Extract tax assessed value (the property's assessed value for tax purposes)
    const taxAssessedValue = this.parseNumber(
      property.taxAssessedValue ||
      property.taxValue ||
      property.tax?.assessedValue ||
      property.taxInfo?.assessedValue
    ) || taxHistoryAssessedValue;
    
    // Extract annual tax amount (the actual dollar amount paid in taxes)
    const annualTax = this.parseNumber(
      property.propertyTaxes ||
      property.annualTax ||
      property.tax?.annualAmount ||
      property.taxInfo?.annualTax ||
      property.yearlyTax ||
      property.taxAnnualAmount
    ) || taxHistoryAmount;
    
    return {
      address: property.address?.street || '',
      city: property.address?.city || '',
      state: property.address?.state || '',
      zipCode: property.address?.zipcode || '',
      propertyType: this.normalizePropertyType(propertyType),
      bedrooms: this.parseNumber(property.beds || property.bedrooms),
      bathrooms: this.parseNumber(property.baths || property.bathrooms),
      sqft: this.parseNumber(property.area || property.sqFt || property.squareFeet),
      lotSize: this.parseNumber(property.lotSize),
      yearBuilt: this.parseNumber(property.yearBuilt),
      taxAssessedValue,
      annualTax,
      estimatedValue: this.parseNumber(property.price || property.listPrice),
      lastSalePrice: this.parseNumber(property.lastSoldPrice),
      lastSaleDate: property.lastSoldDate,
      imageUrl,
      hoaFees,
      latitude: this.parseNumber(property.latitude ?? property.geo?.latitude),
      longitude: this.parseNumber(property.longitude ?? property.geo?.longitude),
    };
  }

  private async fetchExtendedData(jsonUrl: string): Promise<any> {
    try {
      console.log("Fetching extended property data from:", jsonUrl);
      const response = await fetch(jsonUrl);
      if (!response.ok) {
        console.log("Failed to fetch extended data:", response.status);
        return null;
      }
      const extendedData = await response.json();
      console.log("Extended data keys:", Object.keys(extendedData));
      return extendedData;
    } catch (error) {
      console.error("Error fetching extended data:", error);
      return null;
    }
  }

  private async transformZillowResponse(data: any): Promise<PropertyData> {
    let property = data.property || data;
    const requestMetadata = data.requestMetadata;
    
    // Check if tax data is missing and we have an extended JSON URL
    // Be strict: empty arrays and undefined values don't count as having tax data
    const taxHistoryHasData = Array.isArray(property.taxHistory) && property.taxHistory.length > 0;
    const hasTaxData = taxHistoryHasData || 
                       (property.taxAssessedValue && property.taxAssessedValue > 0) || 
                       (property.annualTax && property.annualTax > 0) || 
                       (property.propertyTaxes && property.propertyTaxes > 0) || 
                       (property.taxAnnualAmount && property.taxAnnualAmount > 0) || 
                       (property.resoFacts?.taxAnnualAmount && property.resoFacts.taxAnnualAmount > 0);
    
    if (!hasTaxData && requestMetadata?.json) {
      console.log("Tax data missing from initial response, fetching extended data...");
      const extendedData = await this.fetchExtendedData(requestMetadata.json);
      if (extendedData) {
        // Merge extended data with property data
        // Extended data might have different structure - check common patterns
        const extendedProperty = extendedData.property || extendedData;
        
        // Log extended data tax-related keys
        const extendedTaxKeys = Object.keys(extendedProperty).filter(k => 
          k.toLowerCase().includes('tax') || k.toLowerCase().includes('assess')
        );
        console.log("Extended data tax-related keys:", extendedTaxKeys);
        extendedTaxKeys.forEach(key => {
          console.log(`  ${key}:`, JSON.stringify(extendedProperty[key]).substring(0, 200));
        });
        
        // Check for resoFacts in extended data
        if (extendedProperty.resoFacts) {
          console.log("Extended resoFacts found, tax keys:", 
            Object.keys(extendedProperty.resoFacts).filter(k => 
              k.toLowerCase().includes('tax') || k.toLowerCase().includes('assess')
            )
          );
        }
        
        // Merge extended property data, preferring extended data for missing fields
        const PROTECTED_FIELDS = ['image', 'address', 'homeType', 'beds', 'baths', 'area', 'zestimate', 'price', 'listPrice'];
        const safeExtended = Object.fromEntries(
          Object.entries(extendedProperty).filter(([key, val]) =>
            !PROTECTED_FIELDS.includes(key) || property[key] == null
          )
        );
        property = { ...property, ...safeExtended };
      }
    }
    
    const lastSale = property.priceHistory?.find((h: any) => h.event === 'sold');
    
    // Extract first photo URL from Zillow data
    let imageUrl: string | undefined;
    if (property.image) {
      // Zillow API returns main image as 'image' field
      imageUrl = property.image;
    } else if (property.photos && Array.isArray(property.photos) && property.photos.length > 0) {
      imageUrl = property.photos[0];
    } else if (property.images && Array.isArray(property.images) && property.images.length > 0) {
      imageUrl = property.images[0];
    } else if (property.hiResImageLink) {
      imageUrl = property.hiResImageLink;
    } else if (property.photoUrl) {
      imageUrl = property.photoUrl;
    }
    
    // Extract HOA fees - Zillow uses various field names in different locations
    // Check all possible locations where HOA data might be stored
    const hoaFees = this.parseNumber(
      property.hoaFee || 
      property.monthlyHoaFee || 
      property.associationFee ||
      property.hoaDues ||
      property.hoa?.fee ||
      property.hoa?.monthlyFee ||
      property.resoFacts?.hoaFee ||
      property.resoFacts?.associationFee ||
      property.resoFacts?.associationFee2 ||
      property.homeValues?.hoaFee ||
      property.attributionInfo?.hoaFee
    );
    
    // Look for any keys containing 'hoa' or 'association' (case insensitive) for debugging
    const hoaRelatedKeys = Object.keys(property).filter(k => 
      k.toLowerCase().includes('hoa') || 
      k.toLowerCase().includes('association')
    );
    
    // Log HOA-related fields for debugging
    console.log("Zillow HOA fields:", {
      hoaFee: property.hoaFee,
      monthlyHoaFee: property.monthlyHoaFee,
      associationFee: property.associationFee,
      hoaDues: property.hoaDues,
      hoa: property.hoa,
      resoFactsHoaFee: property.resoFacts?.hoaFee,
      resoFactsAssociationFee: property.resoFacts?.associationFee,
      hoaRelatedKeys: hoaRelatedKeys,
      extractedHoaFees: hoaFees
    });
    
    // If we have resoFacts, log all its keys to find HOA
    if (property.resoFacts) {
      const resoHoaKeys = Object.keys(property.resoFacts).filter(k => 
        k.toLowerCase().includes('hoa') || 
        k.toLowerCase().includes('association') ||
        k.toLowerCase().includes('fee')
      );
      console.log("Zillow resoFacts fee-related keys:", resoHoaKeys);
      resoHoaKeys.forEach(key => {
        console.log(`  resoFacts.${key}:`, property.resoFacts[key]);
      });
    }
    
    // Extract tax from taxHistory array (most recent entry) if available
    let taxHistoryAmount: number | undefined;
    let taxHistoryAssessedValue: number | undefined;
    if (property.taxHistory && Array.isArray(property.taxHistory) && property.taxHistory.length > 0) {
      // Sort by year descending to get the most recent
      const sortedHistory = [...property.taxHistory].sort((a: any, b: any) => (b.year || 0) - (a.year || 0));
      const mostRecent = sortedHistory[0];
      taxHistoryAmount = this.parseNumber(mostRecent.taxPaid || mostRecent.tax || mostRecent.amount || mostRecent.taxAmount);
      taxHistoryAssessedValue = this.parseNumber(mostRecent.value || mostRecent.assessedValue || mostRecent.taxAssessedValue);
    }
    
    // Extract tax assessed value (the property's assessed value for tax purposes)
    const taxAssessedValue = this.parseNumber(
      property.taxAssessedValue ||
      property.taxValue ||
      property.tax?.assessedValue ||
      property.taxInfo?.assessedValue ||
      property.resoFacts?.taxAssessedValue
    ) || taxHistoryAssessedValue;
    
    // Extract annual tax amount (the actual dollar amount paid in taxes)
    // Check multiple possible field locations including nested objects and taxHistory
    const annualTax = this.parseNumber(
      property.propertyTaxes ||
      property.annualTax ||
      property.taxAnnualAmount ||
      property.tax?.annualAmount ||
      property.taxInfo?.annualTax ||
      property.yearlyTax ||
      property.resoFacts?.taxAnnualAmount ||
      property.attributionInfo?.taxAmount
    ) || taxHistoryAmount;
    
    console.log("Zillow tax fields:", {
      taxAssessedValue: property.taxAssessedValue,
      taxValue: property.taxValue,
      tax: property.tax,
      taxInfo: property.taxInfo,
      taxHistory: property.taxHistory ? `Array with ${property.taxHistory.length} entries` : undefined,
      resoFacts: property.resoFacts ? 'present' : undefined,
      propertyTaxes: property.propertyTaxes,
      annualTax: property.annualTax,
      taxAnnualAmount: property.taxAnnualAmount,
      extractedTaxAssessedValue: taxAssessedValue,
      extractedAnnualTax: annualTax
    });
    
    // Log price/Zestimate fields for debugging
    // Zestimate is the estimated market value, price is the listing price
    // For deal analysis, we want Zestimate (estimated value) not list price
    
    return {
      address: property.address?.street || property.addressRaw || '',
      city: property.address?.city || '',
      state: property.address?.state || '',
      zipCode: property.address?.zipcode || '',
      propertyType: this.normalizePropertyType(property.homeType),
      bedrooms: this.parseNumber(property.beds),
      bathrooms: this.parseNumber(property.baths),
      sqft: this.parseNumber(typeof property.area === 'object' ? property.area?.livingArea : property.area),
      lotSize: this.parseNumber(typeof property.area === 'object' ? (property.area?.lotSize || property.area?.lotAreaValue) : (property.lotSize || property.lotAreaValue)),
      yearBuilt: this.parseNumber(property.yearBuilt),
      taxAssessedValue,
      annualTax,
      estimatedValue: this.parseNumber(
        typeof property.zestimate === 'object'
          ? property.zestimate?.zestimate
          : property.zestimate
      ) || this.parseNumber(property.price),
      estimatedRent: this.parseNumber(
        typeof property.zestimate === 'object'
          ? property.zestimate?.rentZestimate
          : property.rentZestimate
      ),
      lastSalePrice: this.parseNumber(lastSale?.price),
      lastSaleDate: lastSale?.date,
      listPrice: this.parseNumber(property.price || property.listPrice), // Current listing price for active/pending
      imageUrl,
      hoaFees,
      latitude: this.parseNumber(property.latitude ?? property.geo?.latitude),
      longitude: this.parseNumber(property.longitude ?? property.geo?.longitude),
    };
  }

  /**
   * Search for recently sold properties as comparables
   * Uses Zillow Search API with type=sold
   * Auto-expands search if fewer than minResults found
   */
  async searchSoldComps(params: CompsSearchParams): Promise<SoldPropertyComp[]> {
    const minResults = params.minResults || 3;
    const maxResults = params.maxResults || 5;
    
    if (!this.apiKey) {
      throw new Error("HasData API key not configured. Cannot search for comparables.");
    }

    // Use user-selected radius if provided, otherwise expand progressively
    const userRadiusMiles = params.radiusMiles;
    const userDaysBack = params.daysBack || 180; // Default to 6 months
    
    // If user specified a radius, only search within that radius
    // Otherwise use progressive expansion (legacy behavior)
    const searchConfigs = userRadiusMiles 
      ? [{ radiusMiles: userRadiusMiles, daysBack: userDaysBack }]
      : [
          { radiusMiles: 1, daysBack: 180 },    // 1 mile, 6 months
          { radiusMiles: 2, daysBack: 180 },    // 2 miles, 6 months
          { radiusMiles: 3, daysBack: 270 },    // 3 miles, 9 months
          { radiusMiles: 5, daysBack: 365 },    // 5 miles, 12 months
        ];
    
    console.log(`[Comps Search] Using radius: ${userRadiusMiles || 'progressive'}, daysBack: ${userDaysBack}`);
    
    // Track best comps found across all search configs
    let bestCompsFound: SoldPropertyComp[] = [];

    const location = `${params.city}, ${params.state} ${params.zipCode}`;
    const sqftMin = Math.round(params.sqft * 0.8);
    const sqftMax = Math.round(params.sqft * 1.2);
    // Skip bedroom filter when caller passes bedrooms <= 0 (soft scoring path)
    const bedroomFilterEnabled = params.bedrooms > 0;
    const bedsMin = bedroomFilterEnabled ? Math.max(1, params.bedrooms - 1) : 0;
    const bedsMax = bedroomFilterEnabled ? params.bedrooms + 1 : 0;

    for (const config of searchConfigs) {
      try {
        console.log(`[Comps Search] Trying radius=${config.radiusMiles}mi, days=${config.daysBack}`);
        
        // Build search parameters with filtering
        const searchParams = new URLSearchParams({
          keyword: location,
          type: "sold",
        });
        if (bedroomFilterEnabled) {
          searchParams.append('beds_min', String(bedsMin));
          searchParams.append('beds_max', String(bedsMax));
        }

        // Build the request URL - correct endpoint is /scrape/zillow/listing
        const endpoint = `${this.baseUrl}/scrape/zillow/listing`;
        
        console.log(`[Comps Search] Fetching from: ${endpoint}?${searchParams.toString()}`);

        const response = await fetch(`${endpoint}?${searchParams.toString()}`, {
          method: "GET",
          headers: {
            "x-api-key": this.apiKey,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          console.error(`[Comps Search] API error: ${response.status}`);
          continue;
        }

        const data = await response.json();
        console.log(`[Comps Search] Raw response keys:`, Object.keys(data));
        
        // Extract listings from response
        const listings = data.listings || data.searchResults || data.properties || data.results || [];
        console.log(`[Comps Search] Found ${listings.length} raw listings`);

        if (!Array.isArray(listings) || listings.length === 0) {
          continue;
        }

        // Filter and transform listings
        const comps: SoldPropertyComp[] = [];
        
        for (const listing of listings) {
          const sqft = this.parseNumber(listing.area || listing.sqft || listing.squareFeet || listing.livingArea);
          const beds = this.parseNumber(listing.beds || listing.bedrooms);
          const baths = this.parseNumber(listing.baths || listing.bathrooms);
          const salePrice = this.parseNumber(listing.price || listing.soldPrice || listing.lastSoldPrice);
          
          // Skip if missing essential data
          if (!sqft || !salePrice || sqft === 0) {
            continue;
          }

          // Apply sqft filter
          if (sqft < sqftMin || sqft > sqftMax) {
            continue;
          }
          // Apply bedroom filter (only when filter is enabled)
          if (bedroomFilterEnabled && beds && (beds < bedsMin || beds > bedsMax)) {
            continue;
          }
          
          // Apply property type filter - match condos with condos, SF with SF
          const compPropertyType = listing.homeType || listing.propertyType;
          if (!arePropertyTypesCompatible(params.propertyType, compPropertyType)) {
            continue;
          }

          const pricePerSqft = salePrice / sqft;
          
          // Extract coordinates for distance calculation (Zillow uses various nested structures)
          const lat = this.parseNumber(
            listing.latitude || 
            listing.lat || 
            listing.latLong?.latitude ||
            listing.geo?.latitude ||
            listing.coordinates?.lat
          );
          const lng = this.parseNumber(
            listing.longitude || 
            listing.lng || 
            listing.lon ||
            listing.latLong?.longitude ||
            listing.geo?.longitude ||
            listing.coordinates?.lng ||
            listing.coordinates?.lon
          );
          
          // Log first listing's structure for debugging
          if (comps.length === 0) {
            console.log(`[Comps Search] Sample listing coordinate fields:`, {
              latitude: listing.latitude,
              lat: listing.lat,
              longitude: listing.longitude,
              lng: listing.lng,
              latLong: listing.latLong,
              geo: listing.geo,
              coordinates: listing.coordinates,
            });
          }
          
          // Calculate distance from subject property if coordinates available
          let distanceFromSubject: number | undefined;
          if (lat && lng && params.subjectLat && params.subjectLng) {
            distanceFromSubject = calculateDistanceMiles(
              params.subjectLat, 
              params.subjectLng, 
              lat, 
              lng
            );
            
            // Filter by distance based on current search config radius
            // Add small tolerance (0.05 mi = ~264 ft) for floating-point precision
            if (distanceFromSubject > config.radiusMiles + 0.05) {
              continue; // Skip comps outside the current radius
            }
          }

          // Sale date extraction - check all possible field names first
          let saleDate = listing.dateSold || 
            listing.lastSoldDate || 
            listing.soldDate || 
            listing.saleDate ||
            listing.datePosted ||
            listing.listingDate ||
            listing.closingDate ||
            listing.close_date ||
            listing.sold_date ||
            listing.date_sold ||
            (listing.hdpData?.homeInfo?.dateSold) ||
            '';
          
          // If no direct sale date, calculate from daysOnZillow (for sold listings, this is days since sale recorded)
          const daysOnZillow = this.parseNumber(listing.daysOnZillow);
          if (!saleDate && daysOnZillow && daysOnZillow > 0) {
            const saleDateTime = new Date();
            saleDateTime.setDate(saleDateTime.getDate() - daysOnZillow);
            saleDate = saleDateTime.toISOString().split('T')[0]; // Format: YYYY-MM-DD
            console.log(`[Comps Search] Calculated sale date from daysOnZillow (${daysOnZillow}): ${saleDate}`);
          }

          comps.push({
            address: listing.address?.street || listing.streetAddress || listing.addressLine1 || '',
            city: listing.address?.city || listing.city || params.city,
            state: listing.address?.state || listing.state || params.state,
            zipCode: listing.address?.zipcode || listing.zipCode || listing.postalCode || '',
            salePrice,
            saleDate,
            bedrooms: beds || 0,
            bathrooms: baths || 0,
            sqft,
            pricePerSqft: Math.round(pricePerSqft),
            yearBuilt: this.parseNumber(listing.yearBuilt),
            lotSize: this.parseNumber(listing.lotSize || listing.lotAreaValue),
            propertyType: listing.homeType || listing.propertyType,
            daysOnMarket: this.parseNumber(listing.daysOnZillow || listing.daysOnMarket),
            imageUrl: listing.imgSrc || listing.image || listing.photos?.[0],
            latitude: lat,
            longitude: lng,
            distanceFromSubject,
            listingUrl: listing.detailUrl || listing.url || listing.hdpUrl || listing.homeDetailsUrl || listing.link || '',
          });
        }

        // Sort by highest price (for ARV, we want top sales)
        comps.sort((a, b) => b.salePrice - a.salePrice);

        console.log(`[Comps Search] Filtered to ${comps.length} comps after criteria`);

        // Track the best results found so far (keep whichever config found more comps)
        if (comps.length > bestCompsFound.length) {
          bestCompsFound = comps.slice(0, maxResults);
        }

        // If we have enough results, return them immediately
        if (comps.length >= minResults) {
          return comps.slice(0, maxResults);
        }

        // Otherwise continue to next search config (if any)
        console.log(`[Comps Search] Only ${comps.length} comps, need ${minResults}, expanding search...`);

      } catch (error) {
        console.error(`[Comps Search] Error with config:`, config, error);
        continue;
      }
    }

    // Return whatever we found, even if less than minResults
    console.log(`[Comps Search] Exhausted all search configs, returning ${bestCompsFound.length} best available`);
    return bestCompsFound;
  }

  /**
   * Fetch property sale history from Zillow to detect flip properties
   * A flip is detected when the same property sold 2+ times within 12 months
   */
  async getPropertySaleHistory(
    address: string,
    city: string,
    state: string,
    zipCode: string
  ): Promise<FlipDetectionResult> {
    try {
      if (!this.apiKey) {
        return { isFlip: false, sales: [] };
      }

      // Build a Zillow search URL from the address
      // Format: street-address-city-state-zip
      const formattedAddress = address
        .toLowerCase()
        .replace(/[#.,]/g, '')
        .replace(/\s+/g, '-');
      const formattedCity = city.toLowerCase().replace(/\s+/g, '-');
      const zillowUrl = `https://www.zillow.com/homedetails/${formattedAddress}-${formattedCity}-${state.toLowerCase()}-${zipCode}`;

      console.log(`[Sale History] Fetching from Zillow: ${zillowUrl}`);

      const endpoint = `${this.baseUrl}/scrape/zillow/property`;
      const params = new URLSearchParams({ url: zillowUrl });

      const response = await fetch(`${endpoint}?${params.toString()}`, {
        method: "GET",
        headers: {
          "x-api-key": this.apiKey,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.log(`[Sale History] API returned ${response.status}`);
        return { isFlip: false, sales: [] };
      }

      const data = await response.json();
      const property = data.property || data;

      // Log what we got back for debugging
      console.log(`[Sale History] Response for ${address}:`, {
        hasPriceHistory: !!property.priceHistory,
        priceHistoryLength: property.priceHistory?.length || 0,
        hasData: !!property.zpid || !!property.address,
        zpid: property.zpid,
        priceHistoryRaw: property.priceHistory?.slice(0, 3) // Log first 3 entries for debugging
      });

      // Extract price history - looking for sale events
      const priceHistory = property.priceHistory || [];
      
      // Filter for actual sales (not listings)
      const sales: PropertySaleEntry[] = priceHistory
        .filter((entry: any) => {
          const event = (entry.event || '').toLowerCase();
          return event === 'sold' || event.includes('sold');
        })
        .map((entry: any) => ({
          date: entry.date || '',
          price: this.parseNumber(entry.price) || 0,
          event: entry.event || 'sold',
        }))
        .filter((sale: PropertySaleEntry) => sale.price > 0 && sale.date)
        .sort((a: PropertySaleEntry, b: PropertySaleEntry) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );

      console.log(`[Sale History] Found ${sales.length} sale(s) for ${address}`);

      // Detect flip: 2+ sales within 12 months
      if (sales.length >= 2) {
        // Check the two most recent sales
        const recentSales = sales.slice(-2);
        const [firstSale, secondSale] = recentSales;
        
        const firstDate = new Date(firstSale.date);
        const secondDate = new Date(secondSale.date);
        const monthsDiff = Math.abs(
          (secondDate.getFullYear() - firstDate.getFullYear()) * 12 +
          (secondDate.getMonth() - firstDate.getMonth())
        );

        if (monthsDiff <= 12) {
          const priceIncrease = secondSale.price - firstSale.price;
          const priceIncreasePercent = (priceIncrease / firstSale.price) * 100;

          console.log(`[Sale History] FLIP DETECTED: $${firstSale.price.toLocaleString()} -> $${secondSale.price.toLocaleString()} (${monthsDiff} months)`);

          return {
            isFlip: true,
            sales,
            originalSale: firstSale,
            flippedSale: secondSale,
            priceIncrease,
            priceIncreasePercent,
          };
        }
      }

      return { isFlip: false, sales };
    } catch (error) {
      console.error(`[Sale History] Error fetching for ${address}:`, error);
      return { isFlip: false, sales: [] };
    }
  }

  /**
   * Search for pending sale properties as potential comparables
   * Uses Zillow Search API with type=pending
   */
  async searchPendingProperties(params: CompsSearchParams): Promise<SoldPropertyComp[]> {
    const maxResults = params.maxResults || 5;
    
    if (!this.apiKey) {
      throw new Error("HasData API key not configured. Cannot search for pending properties.");
    }

    const location = `${params.city}, ${params.state} ${params.zipCode}`;
    const sqftMin = Math.round(params.sqft * 0.75);
    const sqftMax = Math.round(params.sqft * 1.25);
    const bedsMin = Math.max(1, params.bedrooms - 1);
    const bedsMax = params.bedrooms + 1;

    // Search configs - expand if not enough results
    const searchConfigs = [
      { radiusMiles: 2 },
      { radiusMiles: 3 },
      { radiusMiles: 5 },
    ];

    for (const config of searchConfigs) {
      try {
        console.log(`[Pending Search] Trying radius=${config.radiusMiles}mi`);
        
        // Build search parameters for pending properties
        const searchParams = new URLSearchParams({
          keyword: location,
          type: "pending", // Search for pending sales
          beds_min: String(bedsMin),
          beds_max: String(bedsMax),
        });

        const endpoint = `${this.baseUrl}/scrape/zillow/listing`;
        
        console.log(`[Pending Search] Fetching from: ${endpoint}?${searchParams.toString()}`);

        const response = await fetch(`${endpoint}?${searchParams.toString()}`, {
          method: "GET",
          headers: {
            "x-api-key": this.apiKey,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          console.error(`[Pending Search] API error: ${response.status}`);
          continue;
        }

        const data = await response.json();
        console.log(`[Pending Search] Raw response keys:`, Object.keys(data));
        
        // Extract listings from response
        const listings = data.listings || data.searchResults || data.properties || data.results || [];
        console.log(`[Pending Search] Found ${listings.length} raw listings`);

        if (!Array.isArray(listings) || listings.length === 0) {
          continue;
        }

        // Filter and transform listings
        const pendingProps: SoldPropertyComp[] = [];
        
        for (const listing of listings) {
          const sqft = this.parseNumber(listing.area || listing.sqft || listing.squareFeet || listing.livingArea);
          const beds = this.parseNumber(listing.beds || listing.bedrooms);
          const baths = this.parseNumber(listing.baths || listing.bathrooms);
          const listPrice = this.parseNumber(listing.price || listing.listPrice);
          
          // Skip if missing essential data
          if (!sqft || !listPrice || sqft === 0) {
            continue;
          }

          // Apply sqft filter
          if (sqft < sqftMin || sqft > sqftMax) {
            continue;
          }
          
          // Apply bedroom filter
          if (beds && (beds < bedsMin || beds > bedsMax)) {
            continue;
          }
          
          // Apply property type filter
          const compPropertyType = listing.homeType || listing.propertyType;
          if (!arePropertyTypesCompatible(params.propertyType, compPropertyType)) {
            continue;
          }

          const pricePerSqft = listPrice / sqft;
          
          // Extract coordinates
          const lat = this.parseNumber(
            listing.latitude || listing.lat || listing.latLong?.latitude || listing.geo?.latitude
          );
          const lng = this.parseNumber(
            listing.longitude || listing.lng || listing.lon || listing.latLong?.longitude || listing.geo?.longitude
          );
          
          // Calculate distance
          let distanceFromSubject: number | undefined;
          if (lat && lng && params.subjectLat && params.subjectLng) {
            distanceFromSubject = calculateDistanceMiles(params.subjectLat, params.subjectLng, lat, lng);
            
            // Filter by radius with small tolerance for floating-point precision
            if (distanceFromSubject > config.radiusMiles + 0.05) {
              continue;
            }
          }

          pendingProps.push({
            address: listing.address?.street || listing.streetAddress || listing.addressLine1 || '',
            city: listing.address?.city || listing.city || params.city,
            state: listing.address?.state || listing.state || params.state,
            zipCode: listing.address?.zipcode || listing.zipCode || listing.postalCode || '',
            salePrice: listPrice, // Use list price for pending
            saleDate: 'Pending', // Mark as pending
            bedrooms: beds || 0,
            bathrooms: baths || 0,
            sqft,
            pricePerSqft: Math.round(pricePerSqft),
            yearBuilt: this.parseNumber(listing.yearBuilt),
            lotSize: this.parseNumber(listing.lotSize || listing.lotAreaValue),
            propertyType: listing.homeType || listing.propertyType,
            daysOnMarket: this.parseNumber(listing.daysOnZillow || listing.daysOnMarket),
            imageUrl: listing.imgSrc || listing.image || listing.photos?.[0],
            latitude: lat,
            longitude: lng,
            distanceFromSubject,
            listingUrl: listing.detailUrl || listing.url || listing.hdpUrl || listing.homeDetailsUrl || listing.link || '',
          });
        }

        // Sort by distance (closest first)
        pendingProps.sort((a, b) => (a.distanceFromSubject || 999) - (b.distanceFromSubject || 999));

        console.log(`[Pending Search] Filtered to ${pendingProps.length} pending properties`);

        if (pendingProps.length > 0) {
          return pendingProps.slice(0, maxResults);
        }

      } catch (error) {
        console.error(`[Pending Search] Error with config:`, config, error);
        continue;
      }
    }

    console.log(`[Pending Search] Exhausted all search configs`);
    return [];
  }
}
