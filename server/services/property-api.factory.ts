import type { IPropertyAPIService } from "./property-api.interface";
import { RentCastAPIService } from "./rentcast-api.service";
import { HasDataAPIService } from "./hasdata-api.service";

export class PropertyAPIFactory {
  private static instance: IPropertyAPIService | null = null;

  static getService(provider: string = "rentcast"): IPropertyAPIService {
    if (!this.instance) {
      switch (provider.toLowerCase()) {
        case "rentcast":
          this.instance = new RentCastAPIService();
          break;
        case "hasdata":
          this.instance = new HasDataAPIService();
          break;
        default:
          throw new Error(`Unknown property API provider: ${provider}`);
      }
    }
    return this.instance;
  }

  static resetInstance(): void {
    this.instance = null;
  }
}

export const propertyAPIService = PropertyAPIFactory.getService();
