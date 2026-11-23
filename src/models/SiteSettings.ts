import mongoose, { Schema, Document } from "mongoose";

export interface ICustomServer {
  id: string;
  name: string;
  baseUrl: string;
  quality?: string;
  description?: string;
  moviePattern?: string;
  tvPattern?: string;
  createdAt?: Date;
}

export interface ISiteSettings extends Document {
  siteName: string;
  siteDescription?: string;
  logo?: {
    text?: string;
    imageUrl?: string;
    subtitle?: string;
    color?: string;
  };
  ads?: {
    enabled?: boolean;
    zoneId?: string;
    scriptUrl?: string;
    headerScript?: string;
    updatedAt?: Date;
  };
  streaming?: {
    defaultServerId?: string;
    disabledServerIds?: string[];
    customServers?: ICustomServer[];
    updatedAt?: Date;
  };
  telegram?: {
    botToken?: string;
    chatId?: string;
    enabled?: boolean;
    notifyNewMovies?: boolean;
    notifyNewTvShows?: boolean;
    autoPostEveryMinute?: boolean;
    siteUrl?: string;
    groupLink?: string;
    updatedAt?: Date;
  };
  bluesky?: {
    identifier?: string;
    appPassword?: string;
    serviceUrl?: string;
    enabled?: boolean;
    updatedAt?: Date;
  };
  reddit?: {
    clientId?: string;
    clientSecret?: string;
    username?: string;
    password?: string;
    subreddit?: string;
    enabled?: boolean;
    updatedAt?: Date;
  };
  facebook?: {
    pageAccessToken?: string;
    pageId?: string;
    enabled?: boolean;
    updatedAt?: Date;
  };
  tumblr?: {
    consumerKey?: string;
    consumerSecret?: string;
    token?: string;
    tokenSecret?: string;
    blogIdentifier?: string;
    enabled?: boolean;
    updatedAt?: Date;
  };
  seo?: {
    siteTitle?: string;
    siteDescription?: string;
    siteKeywords?: string;
    siteUrl?: string;
    googleVerification?: string;
    bingVerification?: string;
    ogImage?: string;
    twitterHandle?: string;
    updatedAt?: Date;
  };
  dailyPosts?: {
    count?: number;
    lastResetDate?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const SiteSettingsSchema = new Schema<ISiteSettings>(
  {
    siteName: { type: String, default: "StreamFlix" },
    siteDescription: { type: String },
    logo: {
      text: { type: String, default: "STREAMFLIX" },
      imageUrl: { type: String, default: "" },
      subtitle: { type: String, default: "Ultra HD & 4K Streaming Platform" },
      color: { type: String, default: "#E50914" },
    },
    ads: {
      enabled: { type: Boolean, default: true },
      zoneId: { type: String, default: "12330101" },
      scriptUrl: { type: String, default: "https://al5sm.com/tag.min.js" },
      headerScript: { type: String, default: "" },
      updatedAt: { type: Date, default: Date.now },
    },
    streaming: {
      defaultServerId: { type: String, default: "moviepire" },
      disabledServerIds: { type: [String], default: [] },
      customServers: {
        type: [
          {
            id: { type: String, required: true },
            name: { type: String, required: true },
            baseUrl: { type: String, required: true },
            quality: { type: String, default: "1080p" },
            description: { type: String, default: "" },
            moviePattern: { type: String, default: "" },
            tvPattern: { type: String, default: "" },
            createdAt: { type: Date, default: Date.now },
          },
        ],
        default: [],
      },
      updatedAt: { type: Date, default: Date.now },
    },
    telegram: {
      botToken: { type: String },
      chatId: { type: String },
      enabled: { type: Boolean, default: false },
      notifyNewMovies: { type: Boolean, default: true },
      notifyNewTvShows: { type: Boolean, default: true },
      autoPostEveryMinute: { type: Boolean, default: false },
      siteUrl: { type: String, default: "https://moviestream.cc" },
      groupLink: { type: String },
      updatedAt: { type: Date, default: Date.now },
    },
    bluesky: {
      identifier: { type: String },
      appPassword: { type: String },
      serviceUrl: { type: String, default: "https://bsky.social" },
      enabled: { type: Boolean, default: false },
      updatedAt: { type: Date, default: Date.now },
    },
    reddit: {
      clientId: { type: String },
      clientSecret: { type: String },
      username: { type: String },
      password: { type: String },
      subreddit: { type: String },
      enabled: { type: Boolean, default: false },
      updatedAt: { type: Date, default: Date.now },
    },
    facebook: {
      pageAccessToken: { type: String },
      pageId: { type: String },
      enabled: { type: Boolean, default: false },
      updatedAt: { type: Date, default: Date.now },
    },
    tumblr: {
      consumerKey: { type: String },
      consumerSecret: { type: String },
      token: { type: String },
      tokenSecret: { type: String },
      blogIdentifier: { type: String },
      enabled: { type: Boolean, default: false },
      updatedAt: { type: Date, default: Date.now },
    },
    seo: {
      siteTitle: { type: String, default: "StreamFlix - Watch TV Shows & Movies Online Free" },
      siteDescription: {
        type: String,
        default: "Watch the latest movies and TV series online in HD and 4K with multiple high-speed stream servers.",
      },
      siteKeywords: {
        type: String,
        default: "watch movies online, free streaming, hd movies, watch tv series, stream movies free",
      },
      siteUrl: { type: String, default: "https://moviestream.cc" },
      googleVerification: { type: String, default: "" },
      bingVerification: { type: String, default: "" },
      ogImage: { type: String, default: "/og-image.jpg" },
      twitterHandle: { type: String, default: "@StreamFlix" },
      updatedAt: { type: Date, default: Date.now },
    },
    dailyPosts: {
      count: { type: Number, default: 0 },
      lastResetDate: { type: String },
    },
  },
  {
    timestamps: true,
    collection: "sitesettings",
  }
);

export const SiteSettings =
  mongoose.models.SiteSettings || mongoose.model<ISiteSettings>("SiteSettings", SiteSettingsSchema);
