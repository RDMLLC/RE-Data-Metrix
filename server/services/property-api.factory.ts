import type { IPropertyAPIService } from "./property-api.interface";
import { HasDataAPIService } from "./hasdata-api.service";

export class PropertyAPIFactory {
  private static instance: IPropertyAPIService | null = null;

  static getService(provider: string = "hasdata"): IPropertyAPIService {
    if (!this.instance) {
      switch (provider.toLowerCase()) {
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
