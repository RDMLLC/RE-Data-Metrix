import type { IPropertyAPIService, PropertyData } from "./property-api.interface";

const RENTCAST_BASE_URL = "https://api.rentcast.io/v1";
const HASDATA_BASE_URL = "https://api.hasdata.com";

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

  constructor(apiKey?: string, baseUrl: string = RENTCAST_BASE_URL) {
    this.apiKey = process.env.RENTCAST_API_KEY || apiKey || "";
    this.hasDataApiKey = process.env.HASDATA_API_KEY || "";
    this.baseUrl = baseUrl;
    
    if (!this.apiKey) {
      console.warn("RentCast API key not configured. Property lookup will not work.");
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
    
    const response = await fetch(`${this.baseUrl}/properties?${params.toString()}`, {
      method: "GET",
      headers: {
        "X-Api-Key": this.apiKey,
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      await this.handleApiError(response);
    }

    const data = await response.json();
    console.log("RentCast properties response:", JSON.stringify(data, null, 2));

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
    
    const response = await fetch(`${this.baseUrl}/avm/value?${params.toString()}`, {
      method: "GET",
      headers: {
        "X-Api-Key": this.apiKey,
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      console.log("Value estimate API returned:", response.status);
      return null;
    }

    const data = await response.json();
    console.log("RentCast value estimate response:", JSON.stringify(data, null, 2));
    return data;
  }

  private async fetchRentEstimate(address: string): Promise<RentCastRentResponse | null> {
    const params = new URLSearchParams({ 
      address,
      compCount: "10"
    });
    
    const response = await fetch(`${this.baseUrl}/avm/rent/long-term?${params.toString()}`, {
      method: "GET",
      headers: {
        "X-Api-Key": this.apiKey,
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      console.log("Rent estimate API returned:", response.status);
      return null;
    }

    const data = await response.json();
    console.log("RentCast rent estimate response:", JSON.stringify(data, null, 2));
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

    console.log("Transforming RentCast response:", {
      propertyType: property.propertyType,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      sqft: property.squareFootage,
      taxAssessedValue,
      annualTax,
      estimatedValue: valueData?.price,
      estimatedRent: rentData?.rent
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
      hoaFees: undefined,
    };
  }

  async fetchPropertyImageFromUrl(url: string): Promise<string | undefined> {
    if (!this.hasDataApiKey) {
      console.log("HasData API key not configured, cannot fetch property image");
      return undefined;
    }

    try {
      const isZillow = url.includes("zillow.com");
      const isRedfin = url.includes("redfin.com");

      if (!isZillow && !isRedfin) {
        return undefined;
      }

      const endpoint = isZillow 
        ? `${HASDATA_BASE_URL}/scrape/zillow/property`
        : `${HASDATA_BASE_URL}/scrape/redfin/property`;

      console.log(`Fetching property image from HasData for: ${url}`);

      const response = await fetch(`${endpoint}?url=${encodeURIComponent(url)}`, {
        method: "GET",
        headers: {
          "x-api-key": this.hasDataApiKey,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.log(`HasData image fetch failed with status ${response.status}`);
        return undefined;
      }

      const data = await response.json();
      const property = data.property || data;

      let imageUrl: string | undefined;
      if (property.photos && Array.isArray(property.photos) && property.photos.length > 0) {
        imageUrl = property.photos[0];
      } else if (property.images && Array.isArray(property.images) && property.images.length > 0) {
        imageUrl = property.images[0];
      } else if (property.hiResImageLink) {
        imageUrl = property.hiResImageLink;
      } else if (property.photoUrl) {
        imageUrl = property.photoUrl;
      }

      console.log(`HasData returned image URL: ${imageUrl ? 'found' : 'not found'}`);
      return imageUrl;
    } catch (error) {
      console.error("Error fetching property image from HasData:", error);
      return undefined;
    }
  }
}
