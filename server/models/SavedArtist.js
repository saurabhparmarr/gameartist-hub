import mongoose from "mongoose";

const savedArtistSchema = new mongoose.Schema(
  {
    studio: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    artist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

savedArtistSchema.index({ studio: 1, artist: 1 }, { unique: true });

const SavedArtist = mongoose.model("SavedArtist", savedArtistSchema);

export default SavedArtist;
