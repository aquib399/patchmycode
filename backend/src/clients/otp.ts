import { IS_PRODUCTION } from "@/lib/constant.js";
import { Otp, OtpType } from "@/models/index.js";
import { Types } from "mongoose";
import crypto from "crypto";

const OTP_TTL_MS = 15 * 60 * 1000; // 15 Minutes

interface CreateInput {
  targetId: string | Types.ObjectId;
  type: OtpType;
}

interface CreateResult {
  otpCode: string;
  otpRequestId: string;
}

interface VerifyByIdInput {
  otpRequestId: string;
  type: OtpType;
  otp: string;
}

interface VerifyByTargetIdInput {
  targetId: string | Types.ObjectId;
  type: OtpType;
  otp: string;
}

export interface OtpVerifyResult {
  valid: boolean;
  error?: string;
}

class OtpClient {
  private generateCode(): string {
    return String(IS_PRODUCTION ? crypto.randomInt(100000, 1000000) : 123456);
  }

  async create(props: CreateInput): Promise<CreateResult> {
    const { targetId, type } = props;
    const code = this.generateCode();
    const expiresAt = Date.now() + OTP_TTL_MS;

    await Otp.findOneAndDelete({
      type,
      targetId: new Types.ObjectId(targetId)
    });

    const doc = await Otp.create({
      targetId: new Types.ObjectId(targetId),
      otp: code,
      expiresAt,
      type
    });

    return { otpCode: code, otpRequestId: doc._id.toString() };
  }

  async verifyById(props: VerifyByIdInput): Promise<OtpVerifyResult> {
    const { otpRequestId, type, otp } = props;
    const doc = await Otp.findOne({ _id: otpRequestId, type });

    if (!doc || doc.expiresAt < Date.now())
      return {
        valid: false,
        error: "OTP expired or not found. Please request a new one."
      };

    if (doc.otp !== otp) {
      await Otp.findByIdAndUpdate(doc._id, { $inc: { attempts: 1 } });
      return { valid: false, error: "Invalid OTP" };
    }

    await Otp.findByIdAndDelete(doc._id);
    return { valid: true };
  }

  async verifyByTargetId(
    props: VerifyByTargetIdInput
  ): Promise<OtpVerifyResult> {
    const { targetId, type, otp } = props;
    const doc = await Otp.findOne({
      targetId: new Types.ObjectId(targetId),
      type
    });

    if (!doc || doc.expiresAt < Date.now())
      return {
        valid: false,
        error: "OTP expired or not found. Please request a new one."
      };

    if (doc.otp !== otp) {
      await Otp.findByIdAndUpdate(doc._id, { $inc: { attempts: 1 } });
      return { valid: false, error: "Invalid OTP" };
    }

    await Otp.findByIdAndDelete(doc._id);
    return { valid: true };
  }
}

export const otpClient = new OtpClient();
