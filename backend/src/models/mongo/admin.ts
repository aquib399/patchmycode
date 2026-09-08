import { model, Types, Schema, HydratedDocument } from "mongoose";
import { BaseEntity } from "@/models/base.js";
import { Models } from "@/models/names.js";

export interface IAdmin extends BaseEntity {
  name: string;
  email: string;
}
export type IAdminDocument = HydratedDocument<IAdmin>;

const AdminSchema: Schema<IAdmin> = new Schema(
  {
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export const Admin = model<IAdmin>(Models.Admin.ref, AdminSchema);
