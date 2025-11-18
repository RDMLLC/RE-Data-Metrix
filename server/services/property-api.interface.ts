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
  estimatedValue?: number;
  lastSalePrice?: number;
  lastSaleDate?: string;
  imageUrl?: string;
}

export interface IPropertyAPIService {
  getPropertyByAddress(
    address: string,
    city: string,
    state: string,
    zipCode: string
  ): Promise<PropertyData | null>;
  
  getPropertyByUrl(url: string): Promise<PropertyData | null>;
}
