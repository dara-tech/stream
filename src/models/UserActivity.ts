import mongoose, { Schema, Document } from "mongoose";

export interface IUserActivity extends Document {
  sessionId: string;
  user?: mongoose.Types.ObjectId | null;
  userType: "anonymous" | "authenticated";
  eventType: string;
  path?: string;
  query?: Record<string, any>;
  referrer?: string | null;
  searchTerm?: string;
  contentType?: "movie" | "tvshow" | "cast" | "collection" | null;
  contentId?: string | null;
  device?: string;
  browser?: string;
  locale?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const UserActivitySchema = new Schema<IUserActivity>(
  {
    sessionId: { type: String, required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    userType: { type: String, enum: ["anonymous", "authenticated"], default: "anonymous" },
    eventType: {
      type: String,
      required: true,
      index: true,
    },
    path: { type: String },
    query: { type: Object, default: {} },
    referrer: { type: String },
    searchTerm: { type: String },
    contentType: { type: String, default: null },
    contentId: { type: String, default: null },
    device: { type: String },
    browser: { type: String },
    locale: { type: String },
    ipAddress: { type: String },
    userAgent: { type: String },
    metadata: { type: Object, default: {} },
  },
  {
    timestamps: true,
    collection: "useractivities",
  }
);

UserActivitySchema.index({ createdAt: -1 });
UserActivitySchema.index({ eventType: 1, createdAt: -1 });

export const UserActivity =
  mongoose.models.UserActivity || mongoose.model<IUserActivity>("UserActivity", UserActivitySchema);
