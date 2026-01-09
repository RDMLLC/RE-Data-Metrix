import type { IPropertyAPIService, PropertyData } from "./property-api.interface";
import { storage } from "../storage";

const CACHE_TTL_HOURS = 24;

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.href.toLowerCase().trim();
  } catch {
    return url.toLowerCase().trim();
  }
}

export class CachedPropertyAPIService implements IPropertyAPIService {
  private wrappedService: IPropertyAPIService;
  private provider: string;

  constructor(service: IPropertyAPIService, provider: string = 'hasdata') {
    this.wrappedService = service;
    this.provider = provider;
  }

  async getPropertyByAddress(
    address: string,
    city: string,
    state: string,
    zipCode: string
  ): Promise<PropertyData | null> {
    const normalizedAddress = `${address}, ${city}, ${state} ${zipCode}`.toLowerCase().trim();
    
    const cached = await storage.getPropertyCache(normalizedAddress, this.provider);
    if (cached) {
      console.log(`[PropertyCache] HIT for address: ${normalizedAddress}`);
      await storage.incrementPropertyCacheHit(cached.id);
      return cached.payload as PropertyData;
    }

    console.log(`[PropertyCache] MISS for address: ${normalizedAddress}`);
    const result = await this.wrappedService.getPropertyByAddress(address, city, state, zipCode);
    
    if (result) {
      await this.cacheResult(normalizedAddress, result, address, city, state, zipCode);
    }
    
    return result;
  }

  async getPropertyByUrl(url: string, forceRefresh: boolean = false): Promise<PropertyData | null> {
    const normalizedAddress = normalizeUrl(url);
    
    if (!forceRefresh) {
      const cached = await storage.getPropertyCache(normalizedAddress, this.provider);
      if (cached) {
        console.log(`[PropertyCache] HIT for URL: ${url}`);
        await storage.incrementPropertyCacheHit(cached.id);
        return cached.payload as PropertyData;
      }
    } else {
      console.log(`[PropertyCache] FORCE REFRESH for URL: ${url}`);
    }

    console.log(`[PropertyCache] MISS for URL: ${url}`);
    const result = await this.wrappedService.getPropertyByUrl(url);
    
    if (result) {
      await this.cacheResult(
        normalizedAddress, 
        result, 
        result.address || '', 
        result.city || '', 
        result.state || '', 
        result.zipCode || ''
      );
    }
    
    return result;
  }

  private async cacheResult(
    normalizedAddress: string, 
    data: PropertyData,
    street: string,
    city: string,
    state: string,
    postalCode: string
  ): Promise<void> {
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + CACHE_TTL_HOURS);
      
      await storage.setPropertyCache({
        normalizedAddress,
        street: street || null,
        city: city || null,
        state: state || null,
        postalCode: postalCode || null,
        provider: this.provider,
        payload: data,
        fetchedAt: new Date(),
        expiresAt,
      });
      
      console.log(`[PropertyCache] Cached property data for: ${normalizedAddress}`);
    } catch (error) {
      console.error('[PropertyCache] Failed to cache property data:', error);
    }
  }
}
