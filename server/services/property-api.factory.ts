import type { IPropertyAPIService } from "./property-api.interface";
import { RentCastAPIService } from "./rentcast-api.service";
import { HasDataAPIService } from "./hasdata-api.service";
import { CachedPropertyAPIService } from "./property-cache.service";

export class PropertyAPIFactory {
  private static instances: Map<string, IPropertyAPIService> = new Map();

  static getService(provider: string = "hasdata"): IPropertyAPIService {
    const key = provider.toLowerCase();
    
    if (!this.instances.has(key)) {
      let baseService: IPropertyAPIService;
      
      switch (key) {
        case "rentcast":
          baseService = new RentCastAPIService();
          break;
        case "hasdata":
          baseService = new HasDataAPIService();
          break;
        default:
          throw new Error(`Unknown property API provider: ${provider}`);
      }
      
      // Wrap with caching layer
      this.instances.set(key, new CachedPropertyAPIService(baseService, key));
    }
    return this.instances.get(key)!;
  }

  static resetInstance(provider?: string): void {
    if (provider) {
      this.instances.delete(provider.toLowerCase());
    } else {
      this.instances.clear();
    }
  }
}

// Default to HasData for URL-based lookups (Zillow/Redfin URLs)
export const propertyAPIService = PropertyAPIFactory.getService("hasdata");
