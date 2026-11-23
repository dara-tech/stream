import mongoose, { Schema, Document } from "mongoose";

export interface IMovieDoc extends Document {
  tmdbId?: number;
  imdbId?: string;
  title: string;
  overview: string;
  releaseDate: Date;
  posterPath: string;
  backdropPath?: string;
  runtime?: number;
  voteAverage?: number;
  voteCount?: number;
  streamUrl?: string;
  isAvailable?: boolean;
  telegramPostedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const MovieDocSchema = new Schema<IMovieDoc>(
  {
    tmdbId: { type: Number, index: true },
    imdbId: { type: String, index: true },
    title: { type: String, required: true },
    overview: { type: String, required: true },
    releaseDate: { type: Date, required: true },
    posterPath: { type: String, required: true },
    backdropPath: { type: String },
    runtime: { type: Number },
    voteAverage: { type: Number, default: 0 },
    voteCount: { type: Number, default: 0 },
    streamUrl: { type: String },
    isAvailable: { type: Boolean, default: true },
    telegramPostedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: "movies",
  }
);

export const MovieModel =
  mongoose.models.Movie || mongoose.model<IMovieDoc>("Movie", MovieDocSchema);
