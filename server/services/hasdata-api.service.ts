import type { IPropertyAPIService, PropertyData } from "./property-api.interface";

const HASDATA_API_KEY = "981d27db-574b-411a-ad4e-cdc48676a5e8";
const HASDATA_BASE_URL = "https://api.hasdataapi.com/v1";

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
    try {
      const url = `${this.baseUrl}/property/search`;
      const params = new URLSearchParams({
        address,
        city,
        state,
        zipCode,
      });

      const response = await fetch(`${url}?${params.toString()}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
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

      const envelope = await response.json();

      if (!envelope.results || envelope.results.length === 0) {
        return null;
      }

      const propertyData = envelope.results[0];
      return this.transformHasDataResponse(propertyData, address, city, state, zipCode);
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

  private transformHasDataResponse(
    data: any,
    address: string,
    city: string,
    state: string,
    zipCode: string
  ): PropertyData {
    return {
      address: data.address || address,
      city: data.city || city,
      state: data.state || state,
      zipCode: data.zipCode || data.zip_code || zipCode,
      propertyType: data.propertyType || data.property_type,
      bedrooms: this.parseNumber(data.bedrooms || data.bed_count),
      bathrooms: this.parseNumber(data.bathrooms || data.bath_count),
      sqft: this.parseNumber(data.sqft || data.square_feet || data.living_area),
      lotSize: this.parseNumber(data.lotSize || data.lot_size),
      yearBuilt: this.parseNumber(data.yearBuilt || data.year_built),
      taxAssessedValue: this.parseNumber(data.taxAssessedValue || data.tax_assessed_value || data.assessed_value),
      estimatedValue: this.parseNumber(data.estimatedValue || data.estimated_value || data.market_value),
      lastSalePrice: this.parseNumber(data.lastSalePrice || data.last_sale_price || data.sale_price),
      lastSaleDate: data.lastSaleDate || data.last_sale_date || data.sale_date,
    };
  }
}
