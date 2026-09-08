import { BaseCacheTier, TierEntry, TierWriteOptions } from "./base.js";
import { LRUCache } from "lru-cache";

export interface L1TierConfig {
  maxSizeBytes: number;
  logger?: Pick<Console, "warn" | "error">;
}

export class L1Tier extends BaseCacheTier {
  public readonly tierName = "L1";

  private readonly cache: LRUCache<string, TierEntry<unknown>>;
  private readonly logger: Pick<Console, "warn" | "error">;

  constructor(config: L1TierConfig) {
    super();
    this.logger = config.logger ?? console;
    this.cache = new LRUCache<string, TierEntry<unknown>>({
      maxSize: config.maxSizeBytes,
      sizeCalculation: (entry) => entry.sizeBytes,
      ttlAutopurge: true,
      updateAgeOnGet: false,
      updateAgeOnHas: false
    });
  }

  public async get<T>(key: string): Promise<TierEntry<T> | undefined> {
    try {
      return this.cache.get(key) as TierEntry<T> | undefined;
    } catch (err) {
      this.logger.warn(`[${this.tierName}] read failed for key "${key}":`, err);
      return undefined;
    }
  }

  public async set<T>(
    key: string,
    entry: TierEntry<T>,
    options: TierWriteOptions
  ): Promise<void> {
    try {
      this.cache.set(key, entry, { ttl: options.ttlSeconds * 1000 });
    } catch (err) {
      this.logger.warn(
        `[${this.tierName}] write failed for key "${key}":`,
        err
      );
    }
  }

  public async delete(key: string): Promise<void> {
    try {
      this.cache.delete(key);
    } catch (err) {
      this.logger.warn(
        `[${this.tierName}] delete failed for key "${key}":`,
        err
      );
    }
  }

  public async deleteByPattern(pattern: string): Promise<void> {
    try {
      for (const key of this.cache.keys()) {
        if (this.globMatch(pattern, key)) {
          this.cache.delete(key);
        }
      }
    } catch (err) {
      this.logger.warn(
        `[${this.tierName}] pattern delete failed for pattern "${pattern}":`,
        err
      );
    }
  }

  public async clear(): Promise<void> {
    this.cache.clear();
  }
}
