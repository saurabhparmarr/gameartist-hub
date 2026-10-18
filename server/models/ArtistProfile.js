import mongoose from "mongoose";

const artistProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    skills: {
      type: [String],
      default: [],
    },
    experience: {
      type: Number,
      min: 0,
    },
    location: {
      type: String,
      trim: true,
    },
    profileImage: {
      type: String,
      trim: true,
    },
    software: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true },
);

const ArtistProfile = mongoose.model("ArtistProfile", artistProfileSchema);

export default ArtistProfile;
