import mongoose from "mongoose";
import SavedArtist from "../models/SavedArtist.js";
import User from "../models/User.js";
import ApiResponse from "../utils/ApiResponse.js";

const requireStudio = (req, res) => {
  if (req.user.role === "studio") {
    return true;
  }

  res.status(403).json({
    success: false,
    message: "Only studio accounts can manage saved artists",
  });
  return false;
};

export const saveArtist = async (req, res, next) => {
  if (!requireStudio(req, res)) {
    return;
  }
  if (!mongoose.isObjectIdOrHexString(req.params.artistId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid artist ID",
    });
  }

  try {
    const artist = await User.findOne({
      _id: req.params.artistId,
      role: "artist",
    }).select("_id");
    if (!artist) {
      return res.status(404).json({
        success: false,
        message: "Artist account not found",
      });
    }

    const existingSavedArtist = await SavedArtist.findOne({
      studio: req.user.id,
      artist: artist._id,
    });
    if (existingSavedArtist) {
      return res.status(409).json({
        success: false,
        message: "This artist is already saved",
      });
    }

    const savedArtist = await SavedArtist.create({
      studio: req.user.id,
      artist: artist._id,
    });
    return res
      .status(201)
      .json(new ApiResponse(201, { savedArtist }, "Artist saved successfully"));
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This artist is already saved",
      });
    }
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    return next(error);
  }
};

export const getSavedArtists = async (req, res, next) => {
  if (!requireStudio(req, res)) {
    return;
  }

  try {
    const savedArtists = await SavedArtist.find({ studio: req.user.id })
      .populate("artist", "name")
      .sort({ createdAt: -1 });
    return res
      .status(200)
      .json(
        new ApiResponse(200, { savedArtists }, "Saved artists retrieved successfully"),
      );
  } catch (error) {
    return next(error);
  }
};

export const removeSavedArtist = async (req, res, next) => {
  if (!requireStudio(req, res)) {
    return;
  }
  if (!mongoose.isObjectIdOrHexString(req.params.artistId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid artist ID",
    });
  }

  try {
    const savedArtist = await SavedArtist.findOneAndDelete({
      studio: req.user.id,
      artist: req.params.artistId,
    });
    if (!savedArtist) {
      return res.status(404).json({
        success: false,
        message: "Saved artist not found",
      });
    }

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Artist removed from saved list"));
  } catch (error) {
    return next(error);
  }
};
