import { createHash } from "crypto";

// The namespace prefix lives in exactly one place: CacheLayerClient.toKey()
// (see clients/cache/index.ts's `cacheNameSpace`). This builder only ever
// produces the resource-scoped part of a key — no separate/optional
// namespace here, so there's a single source of truth instead of two
// competing namespace concepts.
type CacheKeyOptions = {
  resource: string;
  identifier?: string | number;
  query?: Record<string, any>;
};

// Deterministic, order-independent stringification — same query object
// always produces the same string, regardless of key insertion order.
function stableStringify(value: unknown): string {
  if (value == null) return "";

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${k}:${stableStringify(v)}`).join(",")}}`;
  }

  return String(value);
}

// The `query` object (filters/sort/pagination/populate/search) can get
// arbitrarily large, and spelling it out field-by-field made keys balloon —
// hash it down to a short fixed-length tail instead. The prefix
// (namespace:resource:identifier) stays fully readable since
// deleteByPattern's glob matching depends on it.
function hashQuery(query: Record<string, any>): string {
  return createHash("sha1")
    .update(stableStringify(query))
    .digest("hex")
    .slice(0, 16);
}

export function buildCacheKey({
  resource,
  identifier,
  query
}: CacheKeyOptions) {
  const parts = [resource, identifier]
    .filter((v) => v != null && v !== "")
    .map(String);

  if (query && Object.keys(query).length > 0) {
    parts.push(hashQuery(query));
  }

  return parts.join(":");
}
