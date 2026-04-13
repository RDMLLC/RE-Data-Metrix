import type { IPropertyAPIService, PropertyData } from "./property-api.interface";
import { z } from "zod";
import { apiUsageService, API_COSTS } from "./api-usage.service";

const RENTCAST_BASE_URL = "https://api.rentcast.io/v1";
const HASDATA_BASE_URL = "https://api.hasdata.com";
const PLACEHOLDER_IMAGE_URL = "/images/property-placeholder.svg";

// HasData API configuration
const HASDATA_CONFIG = {
  maxRetries: 3,
  timeoutMs: 15000,
  backoffScheduleMs: [1500, 3000], // Fixed schedule: wait 1.5s after 1st fail, 3s after 2nd fail
};

// Zod schema for extracting image URLs from various response formats
const photoObjectSchema = z.object({
  url: z.string().optional(),
  src: z.string().optional(),
  href: z.string().optional(),
}).passthrough();

const photoArrayItemSchema = z.union([
  z.string(),
  photoObjectSchema,
]);

// Schema for HasData response - flexible to handle different formats
const hasDataResponseSchema = z.object({
  responsivePhotos: z.array(photoArrayItemSchema).optional(),
  photos: z.array(photoArrayItemSchema).optional(),
  images: z.array(photoArrayItemSchema).optional(),
  image: z.string().optional(),
  photoUrl: z.string().optional(),
  hiResImageLink: z.string().optional(),
  primaryPhoto: z.string().optional(),
  mainImage: z.string().optional(),
  thumbnail: z.string().optional(),
}).passthrough();

interface RentCastTaxAssessment {
  year: number;
  value?: number;
  land?: number;
  improvements?: number;
}

interface RentCastPropertyTax {
  year: number;
  total?: number;
}

interface RentCastProperty {
  id?: string;
  formattedAddress?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  county?: string;
  latitude?: number;
  longitude?: number;
  propertyType?: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
  lotSize?: number;
  yearBuilt?: number;
  assessedValue?: number;
  lastSaleDate?: string;
  lastSalePrice?: number;
  ownerOccupied?: boolean;
  features?: Record<string, any>;
  taxAssessments?: Record<string, RentCastTaxAssessment>;
  propertyTaxes?: Record<string, RentCastPropertyTax>;
  hoa?: {
    fee?: number;
  };
}

interface RentCastAVMResponse {
  price?: number;
  priceRangeLow?: number;
  priceRangeHigh?: number;
  comparables?: Array<{
    formattedAddress?: string;
    price?: number;
    squareFootage?: number;
    bedrooms?: number;
    bathrooms?: number;
    distance?: number;
    daysOld?: number;
  }>;
}

interface RentCastRentResponse {
  rent?: number;
  rentRangeLow?: number;
  rentRangeHigh?: number;
  comparables?: Array<{
    formattedAddress?: string;
    price?: number;
    squareFootage?: number;
    bedrooms?: number;
    bathrooms?: number;
    distance?: number;
  }>;
}

export class RentCastAPIService implements IPropertyAPIService {
  private apiKey: string;
  private hasDataApiKey: string;
  private baseUrl: string;
  private currentUserId?: string;

  constructor(apiKey?: string, baseUrl: string = RENTCAST_BASE_URL) {
    this.apiKey = process.env.RENTCAST_API_KEY || apiKey || "";
    this.hasDataApiKey = process.env.HASDATA_API_KEY || "";
    this.baseUrl = baseUrl;
    
    if (!this.apiKey) {
      console.warn("RentCast API key not configured. Property lookup will not work.");
    }
  }

  setCurrentUserId(userId?: string): void {
    this.currentUserId = userId;
  }

  private async logApiUsage(params: {
    endpoint: string;
    apiProvider: string;
    apiEndpoint?: string;
    requestPayload?: object;
    responseStatus?: number;
    costCents: number;
    durationMs?: number;
    success?: boolean;
    errorMessage?: string;
  }): Promise<void> {
    try {
      await apiUsageService.logApiCall({
        userId: this.currentUserId,
        ...params
      });
    } catch (err) {
      console.error("Failed to log API usage:", err);
    }
  }

  async getPropertyByAddress(
    address: string,
    city: string,
    state: string,
    zipCode: string
  ): Promise<PropertyData | null> {
    try {
      if (!this.apiKey) {
        throw new Error("Property lookup service is not configured. Please use manual entry.");
      }

      const fullAddress = `${address}, ${city}, ${state} ${zipCode}`;
      console.log(`Fetching property data from RentCast API for: ${fullAddress}`);

      const propertyData = await this.fetchPropertyData(fullAddress);
      
      if (!propertyData) {
        return null;
      }

      const [valueData, rentData] = await Promise.all([
        this.fetchValueEstimate(fullAddress).catch(err => {
          console.log("Could not fetch value estimate:", err.message);
          return null;
        }),
        this.fetchRentEstimate(fullAddress).catch(err => {
          console.log("Could not fetch rent estimate:", err.message);
          return null;
        })
      ]);

      return this.transformResponse(propertyData, valueData, rentData);
    } catch (error: any) {
      console.error("Error fetching property data from RentCast:", error);
      
      if (error.name === "TypeError" && error.message.includes("fetch")) {
        throw new Error("Unable to connect to property lookup service. Please check your connection and try again.");
      }
      
      throw error;
    }
  }

  async getPropertyByUrl(url: string): Promise<PropertyData | null> {
    try {
      if (!this.apiKey) {
        throw new Error("Property lookup service is not configured. Please use manual entry.");
      }

      const addressInfo = this.parseAddressFromUrl(url);
      
      if (!addressInfo) {
        throw new Error("Unable to parse address from URL. Please enter the address manually or use a Zillow/Redfin property URL.");
      }

      console.log(`Parsed address from URL: ${JSON.stringify(addressInfo)}`);
      
      return this.getPropertyByAddress(
        addressInfo.address,
        addressInfo.city,
        addressInfo.state,
        addressInfo.zipCode
      );
    } catch (error: any) {
      console.error("Error fetching property data from RentCast by URL:", error);
      throw error;
    }
  }

  private parseAddressFromUrl(url: string): { address: string; city: string; state: string; zipCode: string } | null {
    try {
      const isZillow = url.includes('zillow.com');
      const isRedfin = url.includes('redfin.com');

      if (!isZillow && !isRedfin) {
        return null;
      }

      if (isZillow) {
        const match = url.match(/\/homedetails\/([^\/]+)/);
        if (match) {
          const addressPart = match[1];
          const parts = addressPart.split('-');
          
          if (parts.length >= 4) {
            const zipCode = parts[parts.length - 1];
            const state = parts[parts.length - 2];
            
            let cityStartIndex = -1;
            for (let i = parts.length - 3; i >= 0; i--) {
              if (/^\d/.test(parts[i]) || /^(St|Ave|Rd|Dr|Ln|Ct|Blvd|Way|Pl|Cir|Ter|Pkwy|Hwy)$/i.test(parts[i])) {
                cityStartIndex = i + 1;
                break;
              }
            }
            
            if (cityStartIndex === -1) cityStartIndex = Math.max(0, parts.length - 4);
            
            const streetParts = parts.slice(0, cityStartIndex);
            const cityParts = parts.slice(cityStartIndex, parts.length - 2);
            const address = streetParts.join(' ');
            const city = cityParts.join(' ');
            
            if (address && city && state && zipCode && /^\d{5}$/.test(zipCode) && /^[A-Z]{2}$/i.test(state)) {
              return {
                address: this.formatStreetAddress(address),
                city: this.formatCityName(city),
                state: state.toUpperCase(),
                zipCode
              };
            }
          }
        }
      }

      if (isRedfin) {
        const match = url.match(/\/home\/\d+/) || url.match(/\/([A-Z]{2})\/([^\/]+)\/([^\/]+)/);
        if (match) {
          const pathParts = url.split('/').filter(p => p);
          
          for (let i = 0; i < pathParts.length; i++) {
            if (/^[A-Z]{2}$/.test(pathParts[i]) && i + 2 < pathParts.length) {
              const state = pathParts[i];
              const city = pathParts[i + 1];
              const addressPart = pathParts[i + 2];
              
              const addressMatch = addressPart.match(/^(.+)-(\d{5})$/);
              if (addressMatch) {
                return {
                  address: this.formatStreetAddress(addressMatch[1]),
                  city: this.formatCityName(city),
                  state: state.toUpperCase(),
                  zipCode: addressMatch[2]
                };
              }
            }
          }
        }
      }

      return null;
    } catch (error) {
      console.error("Error parsing address from URL:", error);
      return null;
    }
  }

  private formatStreetAddress(address: string): string {
    return address
      .replace(/-/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  private formatCityName(city: string): string {
    return city
      .replace(/-/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  private async fetchPropertyData(address: string): Promise<RentCastProperty | null> {
    const params = new URLSearchParams({ address });
    const startTime = Date.now();
    
    const response = await fetch(`${this.baseUrl}/properties?${params.toString()}`, {
      method: "GET",
      headers: {
        "X-Api-Key": this.apiKey,
        "Accept": "application/json",
      },
    });

    const durationMs = Date.now() - startTime;

    if (!response.ok) {
      await this.logApiUsage({
        endpoint: '/api/property/lookup',
        apiProvider: 'rentcast',
        apiEndpoint: '/properties',
        requestPayload: { address },
        responseStatus: response.status,
        costCents: API_COSTS.rentcast.property_details,
        durationMs,
        success: false,
        errorMessage: `HTTP ${response.status}`
      });
      await this.handleApiError(response);
    }

    const data = await response.json();
    console.log("RentCast properties response:", JSON.stringify(data, null, 2));

    await this.logApiUsage({
      endpoint: '/api/property/lookup',
      apiProvider: 'rentcast',
      apiEndpoint: '/properties',
      requestPayload: { address },
      responseStatus: response.status,
      costCents: API_COSTS.rentcast.property_details,
      durationMs,
      success: true
    });

    if (Array.isArray(data) && data.length > 0) {
      return data[0];
    }
    
    return data;
  }

  private async fetchValueEstimate(address: string): Promise<RentCastAVMResponse | null> {
    const params = new URLSearchParams({ 
      address,
      compCount: "10"
    });
    const startTime = Date.now();
    
    const response = await fetch(`${this.baseUrl}/avm/value?${params.toString()}`, {
      method: "GET",
      headers: {
        "X-Api-Key": this.apiKey,
        "Accept": "application/json",
      },
    });

    const durationMs = Date.now() - startTime;

    if (!response.ok) {
      await this.logApiUsage({
        endpoint: '/api/property/value-estimate',
        apiProvider: 'rentcast',
        apiEndpoint: '/avm/value',
        requestPayload: { address },
        responseStatus: response.status,
        costCents: API_COSTS.rentcast.value_estimate,
        durationMs,
        success: false,
        errorMessage: `HTTP ${response.status}`
      });
      if (response.status === 404) {
        return null;
      }
      console.log("Value estimate API returned:", response.status);
      return null;
    }

    const data = await response.json();
    console.log("RentCast value estimate response:", JSON.stringify(data, null, 2));

    await this.logApiUsage({
      endpoint: '/api/property/value-estimate',
      apiProvider: 'rentcast',
      apiEndpoint: '/avm/value',
      requestPayload: { address },
      responseStatus: response.status,
      costCents: API_COSTS.rentcast.value_estimate,
      durationMs,
      success: true
    });

    return data;
  }

  private async fetchRentEstimate(address: string): Promise<RentCastRentResponse | null> {
    const params = new URLSearchParams({ 
      address,
      compCount: "10"
    });
    const startTime = Date.now();
    
    const response = await fetch(`${this.baseUrl}/avm/rent/long-term?${params.toString()}`, {
      method: "GET",
      headers: {
        "X-Api-Key": this.apiKey,
        "Accept": "application/json",
      },
    });

    const durationMs = Date.now() - startTime;

    if (!response.ok) {
      await this.logApiUsage({
        endpoint: '/api/property/rent-estimate',
        apiProvider: 'rentcast',
        apiEndpoint: '/avm/rent/long-term',
        requestPayload: { address },
        responseStatus: response.status,
        costCents: API_COSTS.rentcast.rent_estimate,
        durationMs,
        success: false,
        errorMessage: `HTTP ${response.status}`
      });
      if (response.status === 404) {
        return null;
      }
      console.log("Rent estimate API returned:", response.status);
      return null;
    }

    const data = await response.json();
    console.log("RentCast rent estimate response:", JSON.stringify(data, null, 2));

    await this.logApiUsage({
      endpoint: '/api/property/rent-estimate',
      apiProvider: 'rentcast',
      apiEndpoint: '/avm/rent/long-term',
      requestPayload: { address },
      responseStatus: response.status,
      costCents: API_COSTS.rentcast.rent_estimate,
      durationMs,
      success: true
    });

    return data;
  }

  private async handleApiError(response: Response): Promise<never> {
    const errorText = await response.text().catch(() => "Unknown error");
    
    console.error(`RentCast API error (${response.status}):`, errorText);
    
    if (response.status === 400) {
      throw new Error("Unable to find property. Please check the address and try again, or use manual entry.");
    } else if (response.status === 401 || response.status === 403) {
      throw new Error("Property lookup service is temporarily unavailable. Please use manual entry.");
    } else if (response.status === 404) {
      throw new Error("Property not found. Please verify the address or use manual entry.");
    } else if (response.status === 429) {
      throw new Error("Too many requests. Please wait a moment and try again.");
    }
    
    throw new Error("Unable to fetch property data. Please try manual entry instead.");
  }

  private normalizePropertyType(rawType: string | undefined): string | undefined {
    if (!rawType) return undefined;
    
    const normalized = rawType.toLowerCase().trim();
    
    if (normalized.includes('single') || normalized === 'sfr' || normalized === 'single family') {
      return 'SINGLE_FAMILY';
    }
    if (normalized.includes('condo') || normalized.includes('co-op') || normalized.includes('coop')) {
      return 'CONDO';
    }
    if (normalized.includes('townhouse') || normalized.includes('townhome') || normalized.includes('row')) {
      return 'TOWNHOUSE';
    }
    if (normalized.includes('multi') || normalized.includes('duplex') || normalized.includes('triplex') || normalized.includes('quadplex')) {
      return 'MULTI_FAMILY';
    }
    if (normalized.includes('apartment')) {
      return 'APARTMENT';
    }
    if (normalized.includes('manufactured') || normalized.includes('mobile')) {
      return 'MANUFACTURED';
    }
    if (normalized.includes('lot') || normalized.includes('land')) {
      return 'LOT';
    }
    
    console.log(`Unknown property type: "${rawType}" - user will need to select manually`);
    return undefined;
  }

  private extractLatestTaxAssessedValue(taxAssessments?: Record<string, RentCastTaxAssessment>): number | undefined {
    if (!taxAssessments) return undefined;
    
    const years = Object.keys(taxAssessments).map(Number).sort((a, b) => b - a);
    if (years.length === 0) return undefined;
    
    const latestYear = years[0].toString();
    return taxAssessments[latestYear]?.value;
  }

  private extractLatestAnnualTax(propertyTaxes?: Record<string, RentCastPropertyTax>): number | undefined {
    if (!propertyTaxes) return undefined;
    
    const years = Object.keys(propertyTaxes).map(Number).sort((a, b) => b - a);
    if (years.length === 0) return undefined;
    
    const latestYear = years[0].toString();
    return propertyTaxes[latestYear]?.total;
  }

  private transformResponse(
    property: RentCastProperty,
    valueData: RentCastAVMResponse | null,
    rentData: RentCastRentResponse | null
  ): PropertyData {
    const taxAssessedValue = this.extractLatestTaxAssessedValue(property.taxAssessments) || property.assessedValue;
    const annualTax = this.extractLatestAnnualTax(property.propertyTaxes);

    // Extract HOA fee from RentCast response - it returns { hoa: { fee: number } }
    const hoaFees = property.hoa?.fee;

    console.log("Transforming RentCast response:", {
      propertyType: property.propertyType,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      sqft: property.squareFootage,
      taxAssessedValue,
      annualTax,
      estimatedValue: valueData?.price,
      estimatedRent: rentData?.rent,
      hoaFees
    });

    return {
      address: property.addressLine1 || property.formattedAddress?.split(',')[0] || '',
      city: property.city || '',
      state: property.state || '',
      zipCode: property.zipCode || '',
      propertyType: this.normalizePropertyType(property.propertyType),
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      sqft: property.squareFootage,
      lotSize: property.lotSize,
      yearBuilt: property.yearBuilt,
      taxAssessedValue,
      annualTax,
      estimatedValue: valueData?.price || property.lastSalePrice,
      estimatedRent: rentData?.rent,
      lastSalePrice: property.lastSalePrice,
      lastSaleDate: property.lastSaleDate,
      imageUrl: undefined,
      hoaFees,
      latitude: property.latitude,
      longitude: property.longitude,
    };
  }

  // Supplemental data returned from Zillow/Redfin via HasData
  async fetchSupplementalDataFromUrl(url: string): Promise<{
    imageUrl?: string;
    rentZestimate?: number;
    zestimate?: number;
    monthlyHoaFee?: number;
    annualTax?: number;
  }> {
    if (!this.hasDataApiKey) {
      console.log("[HasData] API key not configured, returning placeholder");
      return { imageUrl: PLACEHOLDER_IMAGE_URL };
    }

    try {
      // Validate URL is from a supported source
      const originalSource = this.detectPropertySource(url);
      if (!originalSource) {
        console.log(`[HasData] URL not from supported source: ${url}`);
        return { imageUrl: PLACEHOLDER_IMAGE_URL };
      }

      // Clean and validate URL
      const cleanUrl = this.cleanPropertyUrl(url);
      if (!cleanUrl) {
        console.log(`[HasData] Could not clean URL: ${url}`);
        return { imageUrl: PLACEHOLDER_IMAGE_URL };
      }

      // Build list of URLs to try: full URL first, then short ZPID URL for Zillow
      const urlsToTry: string[] = [cleanUrl];
      if (originalSource === 'zillow') {
        const zpidMatch = cleanUrl.match(/\/(\d+)_zpid/);
        if (zpidMatch) {
          const shortUrl = `https://www.zillow.com/homedetails/${zpidMatch[1]}_zpid/`;
          if (shortUrl !== cleanUrl) urlsToTry.push(shortUrl);
        }
      }

      for (const tryUrl of urlsToTry) {
        // Try the original source first, then fallback to the other source
        const sources: Array<'redfin' | 'zillow'> = originalSource === 'zillow'
          ? ['zillow', 'redfin']
          : ['redfin', 'zillow'];

        console.log(`[HasData] Trying supplemental fetch for URL: ${tryUrl}`);

        for (const source of sources) {
          console.log(`[HasData] Trying ${source} endpoint...`);
          const supplementalData = await this.fetchDataWithRetry(source, tryUrl);

          if (supplementalData && (supplementalData.imageUrl || supplementalData.rentZestimate)) {
            console.log(`[HasData] SUCCESS: Data retrieved from ${source} (${tryUrl}):`, {
              imageUrl: supplementalData.imageUrl ? 'present' : 'missing',
              rentZestimate: supplementalData.rentZestimate,
              monthlyHoaFee: supplementalData.monthlyHoaFee
            });
            return supplementalData;
          }

          console.log(`[HasData] ${source} endpoint failed or no useful data`);
        }
      }

      console.log(`[HasData] All sources exhausted, returning placeholder`);
      return { imageUrl: PLACEHOLDER_IMAGE_URL };
    } catch (error) {
      console.error("[HasData] Error fetching supplemental data:", error);
      return { imageUrl: PLACEHOLDER_IMAGE_URL };
    }
  }

  async fetchPropertyImageFromUrl(url: string): Promise<string | undefined> {
    const data = await this.fetchSupplementalDataFromUrl(url);
    return data.imageUrl;
  }

  private detectPropertySource(url: string): 'zillow' | 'redfin' | null {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes("zillow.com")) return 'zillow';
    if (lowerUrl.includes("redfin.com")) return 'redfin';
    return null;
  }

  private cleanPropertyUrl(url: string): string | null {
    try {
      // Remove query parameters and hash fragments
      let cleanUrl = url.split('?')[0].split('#')[0];
      
      // Ensure it starts with https://
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = 'https://' + cleanUrl;
      }
      
      // Convert http to https
      if (cleanUrl.startsWith('http://')) {
        cleanUrl = cleanUrl.replace('http://', 'https://');
      }
      
      // Validate it's a proper URL
      new URL(cleanUrl);
      
      return cleanUrl;
    } catch {
      return null;
    }
  }

  private async fetchDataWithRetry(source: 'zillow' | 'redfin', cleanUrl: string): Promise<{
    imageUrl?: string;
    rentZestimate?: number;
    zestimate?: number;
    monthlyHoaFee?: number;
    annualTax?: number;
  } | undefined> {
    const endpoint = source === 'zillow'
      ? `${HASDATA_BASE_URL}/scrape/zillow/property`
      : `${HASDATA_BASE_URL}/scrape/redfin/property`;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= HASDATA_CONFIG.maxRetries; attempt++) {
      try {
        console.log(`[HasData] Attempt ${attempt}/${HASDATA_CONFIG.maxRetries} for ${source}, URL: ${cleanUrl}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), HASDATA_CONFIG.timeoutMs);

        const fullUrl = `${endpoint}?url=${encodeURIComponent(cleanUrl)}`;
        
        const response = await fetch(fullUrl, {
          method: "GET",
          headers: {
            "x-api-key": this.hasDataApiKey,
            "Content-Type": "application/json",
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Don't retry on 4xx errors (except 429 rate limit)
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          const errorText = await response.text().catch(() => "");
          console.log(`[HasData] Client error ${response.status}: ${errorText.substring(0, 200)}`);
          return undefined; // Don't retry on client errors
        }

        // Retry on 5xx or 429
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        return this.extractSupplementalDataFromResponse(data, source);
        
      } catch (error: any) {
        lastError = error;
        const isTimeout = error.name === 'AbortError';
        const isRetryable = isTimeout || error.message?.includes('5') || error.message?.includes('429');
        
        console.log(`[HasData] Attempt ${attempt} failed: ${error.message}${isTimeout ? ' (timeout)' : ''}`);

        if (!isRetryable || attempt === HASDATA_CONFIG.maxRetries) {
          break;
        }

        // Wait before next retry using fixed schedule (1.5s, 3s)
        const backoffIndex = attempt - 1;
        const backoffMs = HASDATA_CONFIG.backoffScheduleMs[backoffIndex] || 3000;
        const jitter = Math.random() * 200; // Small jitter (0-200ms)
        await new Promise(resolve => setTimeout(resolve, backoffMs + jitter));
      }
    }

    if (lastError) {
      console.log(`[HasData] All ${HASDATA_CONFIG.maxRetries} attempts failed: ${lastError.message}`);
    }
    return undefined;
  }

  private extractSupplementalDataFromResponse(data: any, source: 'zillow' | 'redfin'): {
    imageUrl?: string;
    rentZestimate?: number;
    zestimate?: number;
    monthlyHoaFee?: number;
    annualTax?: number;
  } {
    const property = data.property || data;
    
    console.log(`[HasData] Response keys for ${source}:`, Object.keys(property || {}).slice(0, 25));
    
    // Extract image URL
    const imageUrl = this.extractImageFromResponse(data, source);
    
    // Extract numeric values from Zillow response
    const parseNumber = (val: any): number | undefined => {
      if (val === undefined || val === null || val === '') return undefined;
      const num = typeof val === 'string' ? parseFloat(val.replace(/[^0-9.-]/g, '')) : Number(val);
      return isNaN(num) ? undefined : num;
    };
    
    // Zillow-specific fields
    const rentZestimate = parseNumber(property.rentZestimate);
    const zestimate = parseNumber(property.zestimate);
    const monthlyHoaFee = parseNumber(property.monthlyHoaFee);
    
    // Extract annual tax from various possible field names
    let annualTax: number | undefined = undefined;
    
    // Try direct fields first
    annualTax = parseNumber(property.taxAnnualAmount) ||
                parseNumber(property.annualTax) ||
                parseNumber(property.propertyTaxes) ||
                parseNumber(property.yearlyTax) ||
                parseNumber(property.tax?.annualAmount) ||
                parseNumber(property.taxInfo?.annualTax) ||
                parseNumber(property.resoFacts?.taxAnnualAmount);
    
    // If not found, try taxHistory array (most recent year)
    if (!annualTax && property.taxHistory && Array.isArray(property.taxHistory) && property.taxHistory.length > 0) {
      const sortedHistory = [...property.taxHistory].sort((a: any, b: any) => (b.year || 0) - (a.year || 0));
      const mostRecent = sortedHistory[0];
      annualTax = parseNumber(mostRecent.taxPaid || mostRecent.tax || mostRecent.amount || mostRecent.taxAmount);
    }
    
    console.log(`[HasData] Extracted supplemental data:`, {
      rentZestimate,
      zestimate,
      monthlyHoaFee,
      annualTax,
      hasImage: !!imageUrl
    });
    
    return {
      imageUrl,
      rentZestimate,
      zestimate,
      monthlyHoaFee,
      annualTax
    };
  }

  private extractImageFromResponse(data: any, source: 'zillow' | 'redfin'): string | undefined {
    try {
      // Handle nested property object
      const property = data.property || data;
      
      console.log(`[HasData] Response keys for ${source}:`, Object.keys(property || {}).slice(0, 15));

      // Parse with schema for validation
      const parsed = hasDataResponseSchema.safeParse(property);
      if (!parsed.success) {
        console.log(`[HasData] Schema validation warning: ${parsed.error.message}`);
        // Continue anyway - we'll try manual extraction
      }

      const obj = parsed.success ? parsed.data : property;

      // Ordered list of candidate fields (Zillow-preferred first, then Redfin-preferred)
      const candidateArrays = source === 'zillow'
        ? [obj.responsivePhotos, obj.photos, obj.images]
        : [obj.photos, obj.images, obj.responsivePhotos];
      
      const candidateStrings = [
        obj.image,
        obj.photoUrl,
        obj.hiResImageLink,
        obj.primaryPhoto,
        obj.mainImage,
        obj.thumbnail,
      ];

      // Try array fields first
      for (const arr of candidateArrays) {
        if (Array.isArray(arr) && arr.length > 0) {
          const imageUrl = this.extractUrlFromArrayItem(arr[0]);
          if (imageUrl && this.isValidImageUrl(imageUrl)) {
            console.log(`[HasData] Found image in array field`);
            return imageUrl;
          }
        }
      }

      // Try string fields
      for (const str of candidateStrings) {
        if (typeof str === 'string' && this.isValidImageUrl(str)) {
          console.log(`[HasData] Found image in string field`);
          return str;
        }
      }

      console.log(`[HasData] No valid image URL found in response`);
      return undefined;
    } catch (error) {
      console.error(`[HasData] Error extracting image:`, error);
      return undefined;
    }
  }

  private extractUrlFromArrayItem(item: any): string | undefined {
    if (typeof item === 'string') {
      return item;
    }
    if (typeof item === 'object' && item !== null) {
      // Direct URL fields
      if (item.url) return item.url;
      if (item.src) return item.src;
      if (item.href) return item.href;
      
      // Zillow mixedSources format: { jpeg: [{ url: "..." }], webp: [...] }
      if (item.mixedSources) {
        const sources = item.mixedSources.jpeg || item.mixedSources.webp || [];
        if (Array.isArray(sources) && sources.length > 0 && sources[0]?.url) {
          return sources[0].url;
        }
      }
      
      // Nested photo object: { photo: { url: "..." } }
      if (item.photo?.url) return item.photo.url;
    }
    return undefined;
  }

  private isValidImageUrl(url: string): boolean {
    if (!url || typeof url !== 'string') return false;
    
    // Must be a proper URL
    try {
      const parsed = new URL(url);
      // Allow http or https (some CDNs use http)
      if (!['http:', 'https:'].includes(parsed.protocol)) return false;
      // Should look like an image URL or CDN
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Search for comparable sales using RentCast's /properties endpoint
   * Returns recently sold properties with actual sale dates
   */
  async searchComparableSales(params: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    bedrooms: number;
    bathrooms: number;
    sqft: number;
    propertyType?: string;
    radiusMiles?: number;
    saleDateRangeDays?: number;
    maxResults?: number;
    subjectLat?: number;
    subjectLng?: number;
  }): Promise<{
    comps: Array<{
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
    }>;
    searchRadius: number;
    totalFound: number;
  }> {
    if (!this.apiKey) {
      throw new Error("RentCast API key not configured");
    }

    const {
      address,
      city,
      state,
      zipCode,
      bedrooms,
      sqft,
      propertyType,
      radiusMiles = 3,
      saleDateRangeDays = 180, // Default to 6 months
      maxResults = 10,
      subjectLat,
      subjectLng,
    } = params;

    // Build search parameters
    const searchAddress = `${address}, ${city}, ${state} ${zipCode}`;
    const bedsMin = Math.max(1, bedrooms - 1);
    const bedsMax = bedrooms + 1;
    const sqftMin = Math.floor(sqft * 0.75);
    const sqftMax = Math.ceil(sqft * 1.25);

    // Map property type to RentCast format
    const rentCastPropertyType = this.mapPropertyTypeToRentCast(propertyType);

    const queryParams = new URLSearchParams({
      address: searchAddress,
      radius: radiusMiles.toString(),
      saleDateRange: saleDateRangeDays.toString(),
      limit: Math.min(maxResults * 2, 25).toString(), // Fetch extra for filtering
    });

    // Add property type filter if available
    if (rentCastPropertyType) {
      queryParams.append('propertyType', rentCastPropertyType);
    }

    // Add bedroom range
    queryParams.append('bedrooms', `${bedsMin}:${bedsMax}`);

    console.log(`[RentCast Comps] Searching: ${this.baseUrl}/properties?${queryParams.toString()}`);
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.baseUrl}/properties?${queryParams.toString()}`, {
        method: "GET",
        headers: {
          "X-Api-Key": this.apiKey,
          "Accept": "application/json",
        },
      });

      const durationMs = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        console.error(`[RentCast Comps] API error (${response.status}):`, errorText);
        await this.logApiUsage({
          endpoint: '/api/comps/search',
          apiProvider: 'rentcast',
          apiEndpoint: '/properties',
          requestPayload: { address: searchAddress, radius: radiusMiles, saleDateRange: saleDateRangeDays },
          responseStatus: response.status,
          costCents: API_COSTS.rentcast.comparable_sales,
          durationMs,
          success: false,
          errorMessage: `HTTP ${response.status}: ${errorText}`
        });
        throw new Error(`RentCast API error: ${response.status}`);
      }

      const data = await response.json();
      console.log(`[RentCast Comps] Raw response count:`, Array.isArray(data) ? data.length : 'not array');
      
      // Debug: Log first few properties with their sale dates
      if (Array.isArray(data) && data.length > 0) {
        console.log(`[RentCast Comps] Sample sale dates from API:`);
        data.slice(0, 5).forEach((prop: any, i: number) => {
          console.log(`  ${i + 1}. ${prop.addressLine1}: lastSaleDate=${prop.lastSaleDate}, lastSalePrice=${prop.lastSalePrice}`);
        });
      }

      await this.logApiUsage({
        endpoint: '/api/comps/search',
        apiProvider: 'rentcast',
        apiEndpoint: '/properties',
        requestPayload: { address: searchAddress, radius: radiusMiles, saleDateRange: saleDateRangeDays },
        responseStatus: response.status,
        costCents: API_COSTS.rentcast.comparable_sales,
        durationMs,
        success: true
      });

      if (!Array.isArray(data) || data.length === 0) {
        return { comps: [], searchRadius: radiusMiles, totalFound: 0 };
      }

      // Filter and transform results
      const comps: Array<{
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
      }> = [];

      for (const prop of data) {
        // Must have sale price and sale date
        const salePrice = prop.lastSalePrice;
        const saleDate = prop.lastSaleDate;
        const propSqft = prop.squareFootage;

        if (!salePrice || !saleDate || !propSqft) {
          continue;
        }

        // Apply sqft filter
        if (propSqft < sqftMin || propSqft > sqftMax) {
          continue;
        }

        // Check property type compatibility
        if (propertyType && prop.propertyType) {
          if (!this.arePropertyTypesCompatibleForComps(propertyType, prop.propertyType)) {
            continue;
          }
        }

        const pricePerSqft = salePrice / propSqft;

        // Calculate distance if coordinates available
        let distanceFromSubject: number | undefined;
        if (subjectLat && subjectLng && prop.latitude && prop.longitude) {
          distanceFromSubject = this.calculateDistanceMiles(
            subjectLat,
            subjectLng,
            prop.latitude,
            prop.longitude
          );
        }

        comps.push({
          address: prop.addressLine1 || prop.formattedAddress?.split(',')[0] || '',
          city: prop.city || '',
          state: prop.state || '',
          zipCode: prop.zipCode || '',
          salePrice,
          saleDate: this.formatSaleDate(saleDate),
          bedrooms: prop.bedrooms || 0,
          bathrooms: prop.bathrooms || 0,
          sqft: propSqft,
          pricePerSqft: Math.round(pricePerSqft),
          yearBuilt: prop.yearBuilt,
          lotSize: prop.lotSize,
          propertyType: prop.propertyType,
          distanceFromSubject,
          latitude: prop.latitude,
          longitude: prop.longitude,
        });
      }

      // Sort by sale date (most recent first) then by distance (closest first)
      comps.sort((a, b) => {
        // First by sale date (most recent first)
        const dateDiff = new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime();
        if (dateDiff !== 0) return dateDiff;
        // Then by distance
        if (a.distanceFromSubject !== undefined && b.distanceFromSubject !== undefined) {
          return a.distanceFromSubject - b.distanceFromSubject;
        }
        return 0;
      });

      // Limit results (keep all sales including duplicates for same address)
      const limitedComps = comps.slice(0, maxResults);

      console.log(`[RentCast Comps] Returning ${limitedComps.length} comps (${comps.length} total)`);

      return {
        comps: limitedComps,
        searchRadius: radiusMiles,
        totalFound: comps.length,
      };
    } catch (error: any) {
      console.error(`[RentCast Comps] Error:`, error);
      throw error;
    }
  }

  private mapPropertyTypeToRentCast(propertyType?: string): string | null {
    if (!propertyType) return null;

    const normalized = propertyType.toLowerCase().replace(/[_\s-]/g, '');

    if (normalized.includes('single') || normalized === 'sfr' || normalized.includes('house')) {
      return 'Single Family';
    }
    if (normalized.includes('condo') || normalized.includes('coop')) {
      return 'Condo';
    }
    if (normalized.includes('townhouse') || normalized.includes('townhome')) {
      return 'Townhouse';
    }
    if (normalized.includes('multi') || normalized.includes('duplex') || normalized.includes('triplex')) {
      return 'Multi-Family';
    }

    return null;
  }

  private arePropertyTypesCompatibleForComps(subjectType: string, compType: string): boolean {
    const normalize = (t: string) => t.toLowerCase().replace(/[_\s-]/g, '');
    const subject = normalize(subjectType);
    const comp = normalize(compType);

    // Attached types (condos, townhouses)
    const attachedTypes = ['condo', 'condominium', 'townhouse', 'townhome', 'attached', 'coop'];
    const isSubjectAttached = attachedTypes.some(t => subject.includes(t));
    const isCompAttached = attachedTypes.some(t => comp.includes(t));

    // If comp is attached but subject is not, incompatible
    if (isCompAttached && !isSubjectAttached) {
      return false;
    }

    // If both attached, compatible
    if (isSubjectAttached && isCompAttached) return true;

    // Single family types
    const sfTypes = ['singlefamily', 'single', 'detached', 'sfr'];
    const isSubjectSF = !isSubjectAttached && (sfTypes.some(t => subject.includes(t)) || subject.includes('house'));
    const isCompSF = !isCompAttached && (sfTypes.some(t => comp.includes(t)) || comp.includes('house'));

    if (isSubjectSF && isCompSF) return true;

    // Multi-family types
    const mfTypes = ['multi', 'duplex', 'triplex', 'quadplex', 'fourplex'];
    const isSubjectMF = mfTypes.some(t => subject.includes(t));
    const isCompMF = mfTypes.some(t => comp.includes(t));

    if (isSubjectMF && isCompMF) return true;

    // Unknown type - allow
    if (!isSubjectAttached && !isSubjectSF && !isSubjectMF) return true;

    return false;
  }

  private calculateDistanceMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10; // Round to 1 decimal
  }

  private formatSaleDate(dateStr: string): string {
    try {
      // Handle ISO date strings (YYYY-MM-DD) by parsing directly to avoid timezone issues
      const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (isoMatch) {
        const year = isoMatch[1];
        const month = isoMatch[2];
        const day = isoMatch[3];
        return `${month}/${day}/${year}`;
      }
      
      // Handle MM/DD/YYYY format
      const usMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (usMatch) {
        return dateStr; // Already in correct format
      }
      
      // Fallback: use UTC methods to avoid timezone conversion issues
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return dateStr; // Return as-is if can't parse
      }
      // Use UTC methods to prevent timezone shifting
      return `${(date.getUTCMonth() + 1).toString().padStart(2, '0')}/${date.getUTCDate().toString().padStart(2, '0')}/${date.getUTCFullYear()}`;
    } catch {
      return dateStr;
    }
  }
}
