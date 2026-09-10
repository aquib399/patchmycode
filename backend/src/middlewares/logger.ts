import { Request, Response, NextFunction } from "express";
import { IS_PRODUCTION } from "@/lib/constant.js";
import { performance } from "node:perf_hooks";

const methodColorMap: Record<string, string> = {
  GET: "\x1b[44m\x1b[97m", // blue bg, white text
  POST: "\x1b[42m\x1b[30m", // green bg, black text
  PUT: "\x1b[43m\x1b[30m", // yellow bg, black text
  PATCH: "\x1b[46m\x1b[30m", // cyan bg, black text
  DELETE: "\x1b[41m\x1b[97m", // red bg, white text
  OPTIONS: "\x1b[45m\x1b[97m", // magenta bg, white text
  HEAD: "\x1b[100m\x1b[97m" // gray bg, white text
};

const statusColorMap: { [key: number]: string } = {
  200: "\x1b[92m", // bright green — success
  201: "\x1b[92m", // bright green — created

  304: "\x1b[2m", // dimmed white — cache hit

  400: "\x1b[93m", // bright yellow — bad request
  401: "\x1b[95m", // bright magenta — unauthorized
  403: "\x1b[33m", // yellow — forbidden (distinct from 401)
  404: "\x1b[38;5;208m", // orange — not found
  409: "\x1b[38;5;208m", // orange — conflict
  429: "\x1b[91m", // bright red — rate limited

  500: "\x1b[31m", // red — server error
  503: "\x1b[91m" // bright red — unavailable
};

export const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false
});

const RESET = "\x1b[0m";

const shouldLogBody = true;

export function getDateTime(date: Date) {
  return dateFormatter.format(date);
}

export function logger(
  req: Request,
  res: Response<ResponseData>,
  next: NextFunction
) {
  if (req.method === "OPTIONS") {
    return next();
  }

  const body = req.body;
  const start = performance.now();

  res.on("finish", () => {
    const responseTime = `${(performance.now() - start).toFixed(1)}ms`.padStart(
      10
    );

    const sizeHeader = res.get("Content-Length");
    const sizeKB = sizeHeader
      ? `${(parseInt(sizeHeader, 10) / 1024).toFixed(2)} KB`
      : "0.00 KB";

    const datetime = getDateTime(new Date());

    const color = statusColorMap[res.statusCode] || "\x1b[0m";

    const methodStyle = methodColorMap[req.method] || "\x1b[47m\x1b[30m";
    const method = `${methodStyle} ${req.method.padStart(6)} ${RESET}${color}`;
    const ip = req?.ip || req?.socket?.remoteAddress || "unknown";

    if (shouldLogBody) {
      console.log(`----Request Body----`);
      console.dir(body, { depth: null });
    }

    const log = `${datetime} | ${res.statusCode} | ${responseTime} | ${sizeKB} | ${method} | ${req.originalUrl} | ${ip}`;
    console.log(`${color}[ ${log} ]${RESET}`);
  });

  return next();
}
