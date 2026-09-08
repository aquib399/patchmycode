import { UAParser } from "ua-parser-js";
import { LRUCache } from "lru-cache";
import { Request } from "express";

type UAInfo = {
  browser: Record<string, any>;
  os: Record<string, any>;
  engine: Record<string, any>;
  cpu: Record<string, any>;
  device: Record<string, any>;
  deviceName: string;
};

const uaCache = new LRUCache<string, UAInfo>({ max: 5000 });

function parseUA(userAgent: string): UAInfo {
  const cached = uaCache.get(userAgent);
  if (cached) return cached;

  const ua = new UAParser(userAgent).getResult();
  const info: UAInfo = {
    browser: compact({
      name: ua.browser.name,
      version: ua.browser.version,
      major: ua.browser.major
    }),
    os: compact({ name: ua.os.name, version: ua.os.version }),
    engine: compact({ name: ua.engine.name, version: ua.engine.version }),
    cpu: compact({ architecture: ua.cpu.architecture }),
    device: compact({
      vendor: ua.device.vendor,
      model: ua.device.model,
      type: ua.device.type
    }),
    deviceName: ua.device.model
      ? `${ua.device.vendor ?? ""} ${ua.device.model} (${ua.os.name ?? "Unknown OS"})`.trim()
      : `${ua.browser.name ?? "Unknown Browser"} on ${ua.os.name ?? "Unknown OS"}`
  };

  uaCache.set(userAgent, info);
  return info;
}

function compact<T extends Record<string, any>>(obj: T): T {
  const out: Record<string, any> = {};
  for (const k in obj) {
    const v = obj[k];
    if (v === null || v === undefined || v === "") continue;
    if (typeof v === "object" && !Array.isArray(v)) {
      const sub = compact(v);
      if (Object.keys(sub).length > 0) out[k] = sub;
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

export function extractClientInfo(req: Request) {
  const userAgent = req.get("Customer-Agent") ?? "";
  const ua = parseUA(userAgent);

  return compact({
    ip: req.ip,
    ips: req.ips && req.ips.length > 0 ? req.ips : undefined,
    cfConnectingIp: req.get("CF-Connecting-IP"),
    trueClientIp: req.get("True-Client-IP"),

    userAgent,
    browser: ua.browser,
    os: ua.os,
    engine: ua.engine,
    cpu: ua.cpu,
    device: ua.device,
    deviceName: ua.deviceName,

    clientHints: {
      ua: req.get("Sec-CH-UA"),
      mobile: req.get("Sec-CH-UA-Mobile"),
      platform: req.get("Sec-CH-UA-Platform"),
      platformVersion: req.get("Sec-CH-UA-Platform-Version"),
      model: req.get("Sec-CH-UA-Model"),
      architecture: req.get("Sec-CH-UA-Arch"),
      bitness: req.get("Sec-CH-UA-Bitness"),
      fullVersion: req.get("Sec-CH-UA-Full-Version")
    },

    language: req.get("Accept-Language"),
    encoding: req.get("Accept-Encoding"),
    accept: req.get("Accept"),

    referer: req.get("Referer"),
    origin: req.get("Origin"),

    method: req.method,
    protocol: req.protocol,
    secure: req.secure,
    host: req.get("Host"),
    hostname: req.hostname,
    path: req.path,
    httpVersion: req.httpVersion,

    hasCookies: Boolean(req.headers.cookie),
    hasAuthorization: Boolean(req.headers["authorization"]),

    geo: {
      country: req.get("CF-IPCountry") ?? req.get("X-Vercel-IP-Country"),
      region: req.get("CF-Region") ?? req.get("X-Vercel-IP-Country-Region"),
      city: req.get("CF-City") ?? req.get("X-Vercel-IP-City")
    }
  });
}

export function extractRequestData(req: Request) {
  return compact({
    method: req.method,
    endpoint: req.originalUrl,
    query: Object.keys(req.query).length > 0 ? req.query : undefined
  });
}
