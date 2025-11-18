import type { IPropertyAPIService, PropertyData } from "./property-api.interface";

const HASDATA_API_KEY = "981d27db-574b-411a-ad4e-cdc48676a5e8";
const HASDATA_BASE_URL = "https://api.hasdata.com";

export class HasDataAPIService implements IPropertyAPIService {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string = HASDATA_API_KEY, baseUrl: string = HASDATA_BASE_URL) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
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
      const isRedfin = url.includes('redfin.com');
      const isZillow = url.includes('zillow.com');

      if (!isRedfin && !isZillow) {
        throw new Error("Please provide a valid Redfin or Zillow property URL");
      }

      const endpoint = isRedfin 
        ? `${this.baseUrl}/scrape/redfin/property`
        : `${this.baseUrl}/scrape/zillow/property`;

      const params = new URLSearchParams({ url });

      const response = await fetch(`${endpoint}?${params.toString()}`, {
        method: "GET",
        headers: {
          "x-api-key": this.apiKey,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        const errorText = await response.text();
        throw new Error(`HasData API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      
      console.log("HasData API raw response:", JSON.stringify(data, null, 2));

      if (isRedfin) {
        return this.transformRedfinResponse(data);
      } else {
        return this.transformZillowResponse(data);
      }
    } catch (error) {
      console.error("Error fetching property data from HasData:", error);
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
    
    return {
      address: property.address?.street || '',
      city: property.address?.city || '',
      state: property.address?.state || '',
      zipCode: property.address?.zipcode || '',
      propertyType: property.propertyType || property.homeType,
      bedrooms: this.parseNumber(property.beds || property.bedrooms),
      bathrooms: this.parseNumber(property.baths || property.bathrooms),
      sqft: this.parseNumber(property.area || property.sqFt || property.squareFeet),
      lotSize: this.parseNumber(property.lotSize),
      yearBuilt: this.parseNumber(property.yearBuilt),
      taxAssessedValue: this.parseNumber(property.taxAssessedValue),
      estimatedValue: this.parseNumber(property.price || property.listPrice),
      lastSalePrice: this.parseNumber(property.lastSoldPrice),
      lastSaleDate: property.lastSoldDate,
      imageUrl,
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
    
    return {
      address: property.address?.street || property.addressRaw || '',
      city: property.address?.city || '',
      state: property.address?.state || '',
      zipCode: property.address?.zipcode || '',
      propertyType: property.homeType,
      bedrooms: this.parseNumber(property.beds),
      bathrooms: this.parseNumber(property.baths),
      sqft: this.parseNumber(property.area),
      lotSize: this.parseNumber(property.lotSize || property.lotAreaValue),
      yearBuilt: this.parseNumber(property.yearBuilt),
      taxAssessedValue: this.parseNumber(property.taxAssessedValue),
      estimatedValue: this.parseNumber(property.price || property.zestimate),
      estimatedRent: this.parseNumber(property.rentZestimate),
      lastSalePrice: this.parseNumber(lastSale?.price),
      lastSaleDate: lastSale?.date,
      imageUrl,
    };
  }
}
