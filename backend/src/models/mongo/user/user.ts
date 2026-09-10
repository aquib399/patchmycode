import { model, Schema, HydratedDocument } from "mongoose";
import { BaseEntity } from "@/models/base.js";
import { Models } from "@/models/names.js";

export enum UserStatus {
  Active = "active",
  Suspended = "suspended"
}

export interface IUserGithub {
  id: number;
  login: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
  connectedAt?: Date;
}

export interface IUser extends BaseEntity {
  name: string;
  email: string;
  status: UserStatus;
  github?: IUserGithub;
}
export type IUserDocument = HydratedDocument<IUser>;

export const IUserRefProjections: (keyof IUser)[] = [
  "name",
  "email",
  "status",
  "github",
  "createdAt"
];

const UserSchema: Schema<IUser> = new Schema(
  {
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: false,
      unique: true,
      lowercase: true,
      trim: true
    },
    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.Active,
      required: true,
      index: true
    },
    github: {
      type: {
        id: { type: Number, index: true },
        login: { type: String, required: true },
        name: { type: String },
        email: { type: String },
        avatarUrl: { type: String },
        connectedAt: { type: Date, default: Date.now }
      },
      required: false,
      _id: false
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export const User = model<IUser>(Models.User.ref, UserSchema);
