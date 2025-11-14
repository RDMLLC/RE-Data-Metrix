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
    const addressParts = data.address?.split(',') || [];
    const streetAddress = addressParts[0]?.trim() || '';
    const city = addressParts[1]?.trim() || '';
    const stateZip = addressParts[2]?.trim() || '';
    const [state, zipCode] = stateZip.split(' ');

    return {
      address: streetAddress,
      city: city,
      state: state || '',
      zipCode: zipCode || '',
      propertyType: data.propertyType || data.homeType,
      bedrooms: this.parseNumber(data.beds || data.bedrooms),
      bathrooms: this.parseNumber(data.baths || data.bathrooms),
      sqft: this.parseNumber(data.sqFt || data.squareFeet),
      lotSize: this.parseNumber(data.lotSize),
      yearBuilt: this.parseNumber(data.yearBuilt),
      taxAssessedValue: this.parseNumber(data.taxAssessedValue),
      estimatedValue: this.parseNumber(data.price || data.listPrice),
      lastSalePrice: this.parseNumber(data.lastSoldPrice),
      lastSaleDate: data.lastSoldDate,
    };
  }

  private transformZillowResponse(data: any): PropertyData {
    return {
      address: data.address?.streetAddress || '',
      city: data.address?.city || '',
      state: data.address?.state || '',
      zipCode: data.address?.zipcode || '',
      propertyType: data.homeType,
      bedrooms: this.parseNumber(data.bedrooms),
      bathrooms: this.parseNumber(data.bathrooms),
      sqft: this.parseNumber(data.livingArea),
      lotSize: this.parseNumber(data.lotSize),
      yearBuilt: this.parseNumber(data.yearBuilt),
      taxAssessedValue: this.parseNumber(data.taxAssessedValue),
      estimatedValue: this.parseNumber(data.price || data.zestimate),
      lastSalePrice: this.parseNumber(data.lastSoldPrice),
      lastSaleDate: data.lastSoldDate,
    };
  }
}
