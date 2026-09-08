import { model, Types, Schema, HydratedDocument } from "mongoose";
import { BaseEntity } from "@/models/base.js";
import { Models } from "@/models/names.js";
import { Role } from "@/types/role.js";

export enum NotificationSeverity {
  INFO = "info",
  WARNING = "warning",
  ERROR = "error"
}

export interface INotification extends BaseEntity {
  title: string;
  message: string | null;
  severity: NotificationSeverity;

  targetId: Types.ObjectId;
  target: Role;

  referenceId: Types.ObjectId | null;
  reference: any | null;
}

export type INotificationDocument = HydratedDocument<INotification>;

const NotificationSchema: Schema<INotification> = new Schema(
  {
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: false
    },
    severity: {
      type: String,
      enum: Object.values(NotificationSeverity),
      required: true
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: true
    },
    target: {
      type: String,
      enum: Object.values(Role),
      required: true
    },
    referenceId: {
      type: Schema.Types.ObjectId,
      required: false
    },
    reference: {
      type: Schema.Types.Mixed,
      required: false
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export const Notification = model<INotification>(
  Models.Notification.ref,
  NotificationSchema
);
