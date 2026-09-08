import { CacheLayerClient } from "./client.js";
import { L1Tier } from "./l1.js";

import {
  DEFAULT_TTL_SECONDS,
  MAXIMUM_IN_MEMORY_CACHE_SIZE_BYTES
} from "@/lib/constant.js";

const tiers = [
  new L1Tier({ maxSizeBytes: MAXIMUM_IN_MEMORY_CACHE_SIZE_BYTES }) // index 0
];

export const cacheNameSpace = "app";

export const cacheClient = new CacheLayerClient(cacheNameSpace, {
  tiers: tiers,
  defaultTtlSeconds: DEFAULT_TTL_SECONDS,
  defaultRefreshInBackground: false
});

export type { CacheGetOptions } from "./client.js";
