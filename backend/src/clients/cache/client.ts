import { BaseCacheTier, TierEntry } from "./base.js";

type CacheFetcher<T> = () => Promise<T>;

export interface CacheGetOptions<T> {
  ttlSeconds?: number; // Default TTL applied to every tier unless overridden
  tierTtlSeconds?: Record<number, number>; // Per-tier TTL override, keyed by tier index (0 = first tier, 1 = second, ...)
  skipTiers?: number[]; // Indices of tiers to bypass entirely for this call
  refreshInBackground?: boolean; // Refresh from the source of truth in the background after a hit on any tier
  shouldCache?: (value: T) => boolean;
}

export interface CacheClientConfig {
  tiers: BaseCacheTier[]; // Ordered: index 0 is checked first, then 1, then 2, ...
  defaultTtlSeconds: number;
  fetchTimeoutMs?: number;
  logger?: Pick<Console, "warn" | "error">;
  defaultRefreshInBackground?: boolean;
  skipTiers?: number[];
}

interface ResolvedOptions<T> {
  ttlSeconds: number;
  tierTtlSeconds: Record<number, number>;
  skipTiers: Set<number>;
  refreshInBackground: boolean;
  shouldCache: (value: T) => boolean;
}

interface CacheGetParams<T> {
  key: string;
  query: CacheFetcher<T>;
  config?: CacheGetOptions<T>;
}

export class CacheLayerClient {
  private readonly tiers: BaseCacheTier[];
  private readonly namespace: string;
  private readonly defaultTtlSeconds: number;
  private readonly fetchTimeoutMs: number;
  private readonly defaultRefreshInBackground: boolean;
  private readonly instanceSkipTiers: Set<number>;
  private readonly logger: Pick<Console, "warn" | "error">;

  private readonly inFlightFetches = new Map<string, Promise<unknown>>();

  constructor(namespace: string, config: CacheClientConfig) {
    if (config.tiers.length === 0) {
      throw new Error("CacheClient requires at least one tier.");
    }

    this.namespace = namespace;
    this.tiers = config.tiers;
    this.defaultTtlSeconds = config.defaultTtlSeconds ?? 300;
    this.fetchTimeoutMs = config.fetchTimeoutMs ?? 30_000;
    this.defaultRefreshInBackground =
      config.defaultRefreshInBackground ?? false;
    this.instanceSkipTiers = new Set(config.skipTiers ?? []);
    this.logger = config.logger ?? console;
  }

  async get<T>({ key, query, config = {} }: CacheGetParams<T>): Promise<T> {
    const cacheKey = this.toKey(key);
    const resolved = this.resolveOptions(config);

    // Walk the tiers in order. First hit wins. On a hit, backfill every
    // *earlier* tier we skipped over (so it's warm next time) and
    // optionally kick off a background refresh from the source of truth.
    for (let i = 0; i < this.tiers.length; i++) {
      if (resolved.skipTiers.has(i)) continue;

      const tier = this.tiers[i];
      const hit = await this.safeTierGet<T>(tier, cacheKey);
      if (hit === undefined) continue;

      this.backfillEarlierTiers(i, cacheKey, hit, resolved);

      if (resolved.refreshInBackground) {
        void this.refreshFromSource(cacheKey, query, resolved).catch((err) =>
          this.logger.warn(
            `Background refresh failed for key "${cacheKey}":`,
            err
          )
        );
      }

      return hit.value;
    }

    // Nothing in any tier — fetch from the source of truth once (dedup'd
    // across concurrent callers), then write back to every tier.
    const value = await this.fetchFromSourceOnce(cacheKey, query);

    void this.writeToAllTiers(cacheKey, value, resolved).catch((err) =>
      this.logger.warn(`Cache write-back failed for key "${cacheKey}":`, err)
    );

    return value;
  }

  async set<T>(
    key: string,
    value: T,
    options: CacheGetOptions<T> = {}
  ): Promise<void> {
    const cacheKey = this.toKey(key);
    const resolved = this.resolveOptions(options);
    await this.writeToAllTiers(cacheKey, value, resolved);
  }

  async delete(key: string): Promise<void> {
    const cacheKey = this.toKey(key);

    await Promise.all(
      this.tiers.map((tier) =>
        tier
          .delete(cacheKey)
          .catch((err) =>
            this.logger.warn(
              `[${tier.tierName}] delete failed for key "${cacheKey}":`,
              err
            )
          )
      )
    );
  }

  async deleteByPattern(pattern: string): Promise<void> {
    await Promise.all(
      this.tiers.map((tier) =>
        tier
          .deleteByPattern(pattern)
          .catch((err) =>
            this.logger.warn(
              `[${tier.tierName}] pattern delete failed for pattern "${pattern}":`,
              err
            )
          )
      )
    );
  }

  /** Clear every tier that supports it (some tiers, e.g. a shared Redis
   * instance, may deliberately no-op — see that tier's own clear()). */
  async clearAll(): Promise<void> {
    await Promise.all(
      this.tiers.map((tier) =>
        tier
          .clear()
          .catch((err) =>
            this.logger.warn(`[${tier.tierName}] clear failed:`, err)
          )
      )
    );
  }

  // ---------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------

  private resolveOptions<T>(options: CacheGetOptions<T>): ResolvedOptions<T> {
    const ttlSeconds = options.ttlSeconds ?? this.defaultTtlSeconds;

    return {
      ttlSeconds,
      tierTtlSeconds: options.tierTtlSeconds ?? {},
      skipTiers: options.skipTiers
        ? new Set(options.skipTiers)
        : this.instanceSkipTiers,
      refreshInBackground:
        options.refreshInBackground ?? this.defaultRefreshInBackground,
      shouldCache: options.shouldCache ?? ((value: T) => value !== undefined)
    };
  }

  private ttlForTier<T>(
    tierIndex: number,
    resolved: ResolvedOptions<T>
  ): number {
    return resolved.tierTtlSeconds[tierIndex] ?? resolved.ttlSeconds;
  }

  private toKey(key: string): string {
    return this.namespace ? `${this.namespace}:${key}` : key;
  }

  private async safeTierGet<T>(
    tier: BaseCacheTier,
    key: string
  ): Promise<TierEntry<T> | undefined> {
    try {
      return await tier.get<T>(key);
    } catch (err) {
      this.logger.warn(`[${tier.tierName}] read failed for key "${key}":`, err);
      return undefined;
    }
  }

  /** After a hit at `hitIndex`, warm every tier *before* it in the order
   * (the tiers that were checked first and missed), so the next lookup
   * finds it faster. Fire-and-forget; failures are logged, not thrown. */
  private backfillEarlierTiers<T>(
    hitIndex: number,
    key: string,
    entry: TierEntry<T>,
    resolved: ResolvedOptions<T>
  ): void {
    for (let i = 0; i < hitIndex; i++) {
      if (resolved.skipTiers.has(i)) continue;
      const tier = this.tiers[i];
      void tier
        .set(key, entry, { ttlSeconds: this.ttlForTier(i, resolved) })
        .catch((err) =>
          this.logger.warn(
            `[${tier.tierName}] backfill failed for key "${key}":`,
            err
          )
        );
    }
  }

  private async writeToAllTiers<T>(
    key: string,
    value: T,
    resolved: ResolvedOptions<T>
  ): Promise<void> {
    if (!resolved.shouldCache(value)) return;

    const sizeBytes = this.approximateSize(value);
    const entry: TierEntry<T> = { value, sizeBytes };

    await Promise.all(
      this.tiers.map((tier, i) => {
        if (resolved.skipTiers.has(i)) return Promise.resolve();
        return tier
          .set(key, entry, { ttlSeconds: this.ttlForTier(i, resolved) })
          .catch((err) =>
            this.logger.warn(
              `[${tier.tierName}] write failed for key "${key}":`,
              err
            )
          );
      })
    );
  }

  private approximateSize<T>(value: T): number {
    try {
      return Buffer.byteLength(JSON.stringify(value), "utf8");
    } catch {
      return 0;
    }
  }

  private async refreshFromSource<T>(
    key: string,
    fetcher: CacheFetcher<T>,
    options: ResolvedOptions<T>
  ): Promise<void> {
    const freshValue = await this.fetchFromSourceOnce(key, fetcher);
    await this.writeToAllTiers(key, freshValue, options);
  }

  private async fetchFromSourceOnce<T>(
    key: string,
    fetcher: CacheFetcher<T>
  ): Promise<T> {
    const existing = this.inFlightFetches.get(key) as Promise<T> | undefined;
    if (existing) return existing;

    const promise = (async () => {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Cache fetch timed out for key "${key}"`)),
          this.fetchTimeoutMs
        )
      );

      try {
        return await Promise.race([fetcher(), timeout]);
      } finally {
        this.inFlightFetches.delete(key);
      }
    })();

    this.inFlightFetches.set(key, promise as Promise<unknown>);
    return promise;
  }
}
