import mongoose, { Schema, Document } from "mongoose";

export interface IUserDoc extends Document {
  username: string;
  email: string;
  password?: string;
  role: "user" | "admin" | "super_admin";
  isActive: boolean;
  lastLogin?: Date;
  loginCount?: number;
  preferences?: {
    assistantName?: string;
    theme?: string;
    language?: string;
  };
  profile?: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
    bio?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDoc>(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["user", "admin", "super_admin"], default: "user" },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
    loginCount: { type: Number, default: 0 },
    preferences: {
      assistantName: { type: String, default: "Alex" },
      theme: { type: String, default: "dark" },
      language: { type: String, default: "en" },
    },
    profile: {
      firstName: { type: String },
      lastName: { type: String },
      avatar: { type: String },
      bio: { type: String },
    },
  },
  {
    timestamps: true,
    collection: "users",
  }
);

export const UserModel =
  mongoose.models.User || mongoose.model<IUserDoc>("User", UserSchema);
