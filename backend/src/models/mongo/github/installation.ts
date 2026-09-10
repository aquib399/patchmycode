import { model, Schema, HydratedDocument, Types } from "mongoose";
import { BaseEntity } from "@/models/base.js";
import { Models } from "@/models/names.js";

export enum InstallationStatus {
  Active = "active",
  Suspended = "suspended",
  Deleted = "deleted"
}
export enum InstallationAccountType {
  User = "User",
  Organization = "Organization"
}

export interface IInstallationRepository {
  repoId: number;
  name: string;
  fullName: string;
  private: boolean;
  isActive: boolean;
  htmlUrl?: string;
  description?: string;
}

export interface IInstallation extends BaseEntity {
  installationId: number;
  userId?: Types.ObjectId;
  accountLogin: string;
  accountId: number;
  accountType: InstallationAccountType;
  accountAvatarUrl?: string;
  repositories: IInstallationRepository[];
  status: InstallationStatus;
}

export type IInstallationDocument = HydratedDocument<IInstallation>;

export const IInstallationRefProjections: (keyof IInstallation)[] = [
  "installationId",
  "userId",
  "accountLogin",
  "accountId",
  "accountType",
  "accountAvatarUrl",
  "repositories",
  "status",
  "createdAt"
];

const InstallationRepositorySchema = new Schema<IInstallationRepository>(
  {
    repoId: { type: Number, required: true },
    name: { type: String, required: true },
    fullName: { type: String, required: true },
    private: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    htmlUrl: { type: String },
    description: { type: String }
  },
  { _id: false }
);

const InstallationSchema: Schema<IInstallation> = new Schema(
  {
    installationId: {
      type: Number,
      required: true,
      unique: true,
      index: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: Models.User.ref,
      required: false,
      index: true
    },
    accountLogin: {
      type: String,
      required: true
    },
    accountId: {
      type: Number,
      required: true
    },
    accountType: {
      type: String,
      enum: ["User", "Organization"],
      required: true
    },
    accountAvatarUrl: {
      type: String,
      required: false
    },
    repositories: {
      type: [InstallationRepositorySchema],
      default: []
    },
    status: {
      type: String,
      enum: Object.values(InstallationStatus),
      default: InstallationStatus.Active,
      required: true,
      index: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

InstallationSchema.index({ userId: 1, status: 1 });
InstallationSchema.index({ "repositories.repoId": 1 });

export const Installation = model<IInstallation>(
  Models.Installation.ref,
  InstallationSchema
);
