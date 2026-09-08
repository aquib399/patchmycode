import { model, Types, HydratedDocument, Schema } from "mongoose";
import { BaseEntity } from "@/models/base.js";
import { Models } from "@/models/names.js";
import { Role } from "@/types/role.js";

export enum TokenType {
  Refresh = "refresh",
  Invite = "invite"
}

export enum DeviceType {
  Mobile = "mobile",
  Tablet = "tablet",
  Desktop = "desktop",
  Unknown = "unknown"
}

export interface ITokenMetadata {
  deviceName: string;
  deviceType: DeviceType;
  ipAddress: string;
  userAgent: string;
}

export interface IToken extends BaseEntity {
  type: TokenType;
  target: Role;
  targetId: Types.ObjectId;
  token: string;

  metadata: ITokenMetadata;

  isActive: boolean;
  lastUsedAt: Date;
  expiresAt: Date;
}
export type ITokenDocument = HydratedDocument<IToken>;

const TokenMetadataSchema = new Schema<ITokenMetadata>(
  {
    deviceName: { type: String, default: "Unknown Device" },
    deviceType: {
      type: String,
      enum: Object.values(DeviceType),
      default: DeviceType.Unknown
    },
    ipAddress: { type: String, default: "" },
    userAgent: { type: String, default: "" }
  },
  { _id: false }
);

const TokenSchema: Schema<IToken> = new Schema(
  {
    targetId: {
      type: Schema.Types.ObjectId,
      required: true
    },
    type: {
      type: String,
      enum: Object.values(TokenType),
      required: true
    },
    target: {
      type: String,
      enum: Object.values(Role),
      required: true
    },
    token: {
      type: String,
      required: true,
      unique: true,
      select: false
    },

    metadata: {
      type: TokenMetadataSchema,
      required: true
    },

    isActive: {
      type: Boolean,
      default: true
    },
    lastUsedAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      required: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// ── Indexes ───────────────────────────────────────────────────
TokenSchema.index({ targetId: 1, isActive: 1 }); // get all sessions for a user
TokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // auto-delete expired

export const Token = model<IToken>(Models.Token.ref, TokenSchema);
