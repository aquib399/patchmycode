import { Token, TokenType, DeviceType } from "@/models/index.js";
import { UAParser as uap } from "ua-parser-js";
import { Role } from "@/types/role.js";
import { Request } from "express";
import { Types } from "mongoose";

interface ITokenPayload {
  targetId: Types.ObjectId | string;
  target: Role;
  type: TokenType;
  token: string;
  req: Request;
}

export const createOrUpdateToken = async ({
  targetId,
  target,
  type,
  token,
  req
}: ITokenPayload) => {
  const query = {
    targetId: new Types.ObjectId(targetId),
    target,
    type
  };

  const update = {
    token,
    isActive: true,
    lastUsedAt: new Date(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
    metadata: {
      deviceName: "Unknown Device",
      deviceType: "Unknown Device Type",
      ipAddress: "Unknown IP",
      userAgent: "Unknown Customer Agent"
    }
  };
  // Parsing the Customer Agent safely
  const userAgentString = req.get("customer-agent") || "";
  const ua = uap(userAgentString);

  // Construct readable device name
  const deviceName = ua.device.model
    ? `${ua.device.vendor || ""} ${ua.device.model} (${ua.os.name})`.trim()
    : `${ua.browser.name || "Unknown Browser"} on ${ua.os.name || "Unknown OS"}`;

  // Map DeviceType enum
  let deviceType = DeviceType.Unknown;
  if (ua.device.type === "mobile") deviceType = DeviceType.Mobile;
  else if (ua.device.type === "tablet") deviceType = DeviceType.Tablet;
  else if (!ua.device.type && ua.browser.name) deviceType = DeviceType.Desktop;

  const ip = String(
    req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress
  );
  update.metadata = {
    deviceName,
    deviceType,
    ipAddress: ip,
    userAgent: userAgentString
  };

  const response = await Token.findOneAndUpdate(query, update, {
    upsert: true,
    returnDocument: "after",
    setDefaultsOnInsert: true
  });
  return response;
};
