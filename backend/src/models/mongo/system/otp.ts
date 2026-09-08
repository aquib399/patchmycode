import { HydratedDocument, model, Schema, Types } from "mongoose";
import { BaseEntity } from "@/models/base.js";
import { Models } from "@/models/names.js";

export enum OtpType {
  USER_SIGNUP = "user_signup",
  USER_FORGET = "user_forget"
}

export interface IOTP extends BaseEntity {
  targetId: Types.ObjectId;
  otp: string;
  expiresAt: number;
  type: OtpType;
  attempts: number;
  createdAt: Date;
  updatedAt: Date;
}
export type IOTPDocument = HydratedDocument<IOTP>;

const OTPSchema: Schema<IOTP> = new Schema(
  {
    targetId: {
      type: Schema.Types.ObjectId,
      required: true
    },
    otp: {
      type: String,
      required: true
    },
    expiresAt: {
      type: Number,
      required: true
    },
    type: {
      type: String,
      enum: Object.values(OtpType),
      required: true
    },
    attempts: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Otp = model<IOTP>(Models.Otp.ref, OTPSchema);
