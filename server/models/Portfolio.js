import mongoose from "mongoose";

const portfolioSchema = new mongoose.Schema(
  {
    artist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    category: {
      type: String,
      required: true,
      enum: [
        "Concept Art",
        "3D Environment",
        "Character Art",
        "Animation",
        "Other",
      ],
    },
    imageUrl: {
      type: String,
      trim: true,
    },
    tools: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true },
);

const Portfolio = mongoose.model("Portfolio", portfolioSchema);

export default Portfolio;
