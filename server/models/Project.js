import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    studio: {
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
      required: true,
      trim: true,
      maxlength: 5000,
    },
    skillsRequired: {
      type: [String],
      default: [],
    },
    budget: {
      type: Number,
      min: 0,
    },
    status: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
    },
  },
  { timestamps: true },
);

projectSchema.index({ status: 1, createdAt: -1, _id: -1 });
projectSchema.index({ studio: 1, createdAt: -1, _id: -1 });
projectSchema.index({ createdAt: -1, _id: -1 });

const Project = mongoose.model("Project", projectSchema);

export default Project;
