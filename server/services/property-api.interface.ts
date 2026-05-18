export interface PropertyData {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  propertyType?: string;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  lotSize?: number;
  yearBuilt?: number;
  taxAssessedValue?: number;
  annualTax?: number;
  estimatedValue?: number;
  estimatedValueSource?: 'zestimate' | 'rentcast_avm' | 'list_price';
  estimatedRent?: number;
  estimatedRentSource?: "RentCast" | "Zillow";
  rentCastEstimate?: number | null;
  zillowRentEstimate?: number | null;
  lastSalePrice?: number;
  lastSaleDate?: string;
  listPrice?: number; // Current listing price for active/pending properties
  imageUrl?: string;
  hoaFees?: number;
  latitude?: number;
  longitude?: number;
}

export interface IPropertyAPIService {
  getPropertyByAddress(
    address: string,
    city: string,
    state: string,
    zipCode: string
  ): Promise<PropertyData | null>;
  
  getPropertyByUrl(url: string, forceRefresh?: boolean): Promise<PropertyData | null>;

  /** Optional: fetch AVM estimated value for a full formatted address */
  getValueEstimateByAddress?(fullAddress: string): Promise<number | null>;

  /** Optional: fetch AVM long-term rent estimate for a full formatted address */
  getRentEstimateByAddress?(fullAddress: string): Promise<number | null>;
}

export interface BuildingListing {
  url: string;
  displayAddress: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  price?: number;
  status?: string;
  image?: string;
}

export class BuildingUrlError extends Error {
  readonly code = "BUILDING_URL" as const;
  constructor(
    public listings: BuildingListing[],
    public buildingAddress?: string,
  ) {
    super(
      "This Zillow URL points to a building with multiple units. Please select a specific unit to analyze.",
    );
    this.name = "BuildingUrlError";
  }
}
