/**
 * base.ts
 *
 * A "tier" is a single layer of the cache stack (memory, redis, disk,
 * whatever). The CacheClient never knows what a tier actually is — it only
 * knows it can get/set/delete/clear on it. That's the whole point: to swap
 * L1 and L2 tomorrow, you just reorder the array in client.ts. No renamed
 * methods, no branching logic, nothing else changes.
 */

export interface TierEntry<T> {
  value: T;
  sizeBytes: number;
}

export interface TierWriteOptions {
  ttlSeconds: number;
}

/**
 * Every tier — L1, L2, ..., L99 — extends this. The base class is
 * deliberately "dumb": it has no idea if it's backed by an in-memory LRU,
 * Redis, disk, or a third-party API. It just exposes a uniform surface.
 *
 * Concrete tiers only need to implement the abstract methods. Anything
 * that's genuinely shared (key namespacing, safe-guarded serialization)
 * lives here so it isn't duplicated per-tier.
 */
export abstract class BaseCacheTier {
  /** Human-readable label used only for logging, e.g. "L1", "L2". */
  public abstract readonly tierName: string;

  /**
   * Fetch a raw entry from this tier. Returns undefined on a miss.
   * Must not throw for a normal miss — only for genuine failures.
   */
  public abstract get<T>(key: string): Promise<TierEntry<T> | undefined>;

  /** Write an entry into this tier with the given options. */
  public abstract set<T>(
    key: string,
    entry: TierEntry<T>,
    options: TierWriteOptions
  ): Promise<void>;

  /** Remove a single key from this tier. */
  public abstract delete(key: string): Promise<void>;

  /**
   * Remove all keys matching a glob-style pattern (`*` wildcard) from this
   * tier. Each tier implements this however makes sense for its backing
   * store (iterate a Map, SCAN in Redis, etc).
   */
  public abstract deleteByPattern(pattern: string): Promise<void>;

  /** Wipe this tier entirely. */
  public abstract clear(): Promise<void>;

  // -------------------------------------------------------------------
  // Shared helpers available to all tiers
  // -------------------------------------------------------------------

  /** Simple glob (`*` wildcard) -> RegExp test, shared by any tier that
   * needs to match keys manually (e.g. an in-memory Map). */
  protected globMatch(pattern: string, str: string): boolean {
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    const regexStr = escaped.replace(/\*/g, ".*");
    return new RegExp(`^${regexStr}$`).test(str);
  }

  protected serialize<T>(
    value: T,
    onError: (err: unknown) => void
  ): string | undefined {
    try {
      return JSON.stringify(value);
    } catch (err) {
      onError(err);
      return undefined;
    }
  }

  protected deserialize<T>(
    raw: string,
    onError: (err: unknown) => void
  ): T | undefined {
    try {
      return JSON.parse(raw) as T;
    } catch (err) {
      onError(err);
      return undefined;
    }
  }
}
