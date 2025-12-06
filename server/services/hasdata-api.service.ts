import type { IPropertyAPIService, PropertyData } from "./property-api.interface";

const HASDATA_BASE_URL = "https://api.hasdata.com";

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
            return this.transformZillowResponse(data);
          }
        } catch (parseError) {
          console.error("Failed to parse HasData API response:", responseText.substring(0, 500));
          throw new Error("Property lookup service returned invalid data. Please use manual entry.");
        }
      }

      const data = await response.json();
      
      console.log("HasData API raw response:", JSON.stringify(data, null, 2));

      if (isRedfin) {
        return this.transformRedfinResponse(data);
      } else {
        return this.transformZillowResponse(data);
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
    const parsed = typeof value === "string" ? parseFloat(value) : Number(value);
    return isNaN(parsed) ? undefined : parsed;
  }

  // Normalize property type from API values to form enum values
  private normalizePropertyType(rawType: string | undefined): string | undefined {
    if (!rawType) return undefined;
    
    const normalized = rawType.toLowerCase().trim();
    
    // Map common API values to form enum values
    if (normalized.includes('single') && normalized.includes('family')) {
      return 'SINGLE_FAMILY';
    }
    if (normalized.includes('condo') || normalized.includes('co-op') || normalized.includes('coop')) {
      return 'CONDO';
    }
    if (normalized.includes('townhouse') || normalized.includes('town house') || normalized.includes('townhome')) {
      return 'TOWNHOUSE';
    }
    if (normalized.includes('multi') && normalized.includes('family')) {
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
    
    // Return undefined if no match - let user select manually
    console.log(`Unknown property type: "${rawType}" - user will need to select manually`);
    return undefined;
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
    
    // Log property type and HOA fields for debugging
    console.log("Redfin property fields:", {
      propertyType: property.propertyType,
      homeType: property.homeType,
      propertyTypeName: property.propertyTypeName,
      homeTypeLabel: property.homeTypeLabel,
      type: property.type,
      extractedPropertyType: propertyType
    });
    
    console.log("Redfin HOA fields:", {
      hoaDues: property.hoaDues,
      hoaFee: property.hoaFee,
      hoaFees: property.hoaFees,
      monthlyHoaFee: property.monthlyHoaFee,
      associationDues: property.associationDues,
      associationFee: property.associationFee,
      hoa: property.hoa,
      extractedHoaFees: hoaFees
    });
    
    // Extract tax assessed value (the property's assessed value for tax purposes)
    const taxAssessedValue = this.parseNumber(
      property.taxAssessedValue ||
      property.taxValue ||
      property.tax?.assessedValue ||
      property.taxInfo?.assessedValue
    );
    
    // Extract annual tax amount (the actual dollar amount paid in taxes)
    const annualTax = this.parseNumber(
      property.propertyTaxes ||
      property.annualTax ||
      property.tax?.annualAmount ||
      property.taxInfo?.annualTax ||
      property.yearlyTax ||
      property.taxAnnualAmount
    );
    
    console.log("Redfin tax fields:", {
      taxAssessedValue: property.taxAssessedValue,
      taxValue: property.taxValue,
      tax: property.tax,
      taxInfo: property.taxInfo,
      propertyTaxes: property.propertyTaxes,
      annualTax: property.annualTax,
      extractedTaxAssessedValue: taxAssessedValue,
      extractedAnnualTax: annualTax
    });
    
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
    };
  }

  private transformZillowResponse(data: any): PropertyData {
    const property = data.property || data;
    const lastSale = property.priceHistory?.find((h: any) => h.event === 'sold');
    
    // Extract first photo URL from Zillow data
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
    
    // Extract HOA fees - Zillow uses various field names
    // Try multiple possible field names for HOA
    const hoaFees = this.parseNumber(
      property.hoaFee || 
      property.monthlyHoaFee || 
      property.associationFee ||
      property.hoaDues ||
      property.hoa?.fee ||
      property.hoa?.monthlyFee
    );
    
    // Log HOA-related fields for debugging
    console.log("Zillow HOA fields:", {
      hoaFee: property.hoaFee,
      monthlyHoaFee: property.monthlyHoaFee,
      associationFee: property.associationFee,
      hoaDues: property.hoaDues,
      hoa: property.hoa,
      extractedHoaFees: hoaFees
    });
    
    // Extract tax assessed value (the property's assessed value for tax purposes)
    const taxAssessedValue = this.parseNumber(
      property.taxAssessedValue ||
      property.taxValue ||
      property.tax?.assessedValue ||
      property.taxInfo?.assessedValue
    );
    
    // Extract annual tax amount (the actual dollar amount paid in taxes)
    const annualTax = this.parseNumber(
      property.propertyTaxes ||
      property.annualTax ||
      property.taxAnnualAmount ||
      property.tax?.annualAmount ||
      property.taxInfo?.annualTax ||
      property.yearlyTax
    );
    
    console.log("Zillow tax fields:", {
      taxAssessedValue: property.taxAssessedValue,
      taxValue: property.taxValue,
      tax: property.tax,
      taxInfo: property.taxInfo,
      propertyTaxes: property.propertyTaxes,
      annualTax: property.annualTax,
      taxAnnualAmount: property.taxAnnualAmount,
      extractedTaxAssessedValue: taxAssessedValue,
      extractedAnnualTax: annualTax
    });
    
    // Log price/Zestimate fields for debugging
    // Zestimate is the estimated market value, price is the listing price
    // For deal analysis, we want Zestimate (estimated value) not list price
    console.log("Zillow value fields:", {
      zestimate: property.zestimate,
      price: property.price,
      listPrice: property.listPrice,
      rentZestimate: property.rentZestimate
    });
    
    return {
      address: property.address?.street || property.addressRaw || '',
      city: property.address?.city || '',
      state: property.address?.state || '',
      zipCode: property.address?.zipcode || '',
      propertyType: this.normalizePropertyType(property.homeType),
      bedrooms: this.parseNumber(property.beds),
      bathrooms: this.parseNumber(property.baths),
      sqft: this.parseNumber(property.area),
      lotSize: this.parseNumber(property.lotSize || property.lotAreaValue),
      yearBuilt: this.parseNumber(property.yearBuilt),
      taxAssessedValue,
      annualTax,
      estimatedValue: this.parseNumber(property.zestimate || property.price),
      estimatedRent: this.parseNumber(property.rentZestimate),
      lastSalePrice: this.parseNumber(lastSale?.price),
      lastSaleDate: lastSale?.date,
      imageUrl,
      hoaFees,
    };
  }
}
