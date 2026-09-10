import { model, Schema, HydratedDocument } from "mongoose";
import { BaseEntity } from "@/models/base.js";
import { Models } from "@/models/names.js";

export enum UserStatus {
  Active = "active",
  Suspended = "suspended"
}

export interface IUser extends BaseEntity {
  name: string;
  email: string;
  status: UserStatus;
}
export type IUserDocument = HydratedDocument<IUser>;

export const IUserRefProjections: (keyof IUser)[] = [
  "name",
  "email",
  "status",
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
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export const User = model<IUser>(Models.User.ref, UserSchema);
