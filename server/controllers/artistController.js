import mongoose from "mongoose";
import ArtistProfile from "../models/ArtistProfile.js";
import User from "../models/User.js";
import ApiResponse from "../utils/ApiResponse.js";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const profileFields = [
  "bio",
  "skills",
  "experience",
  "location",
  "profileImage",
  "software",
];

const getPagination = (query) => {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 10);

  if (
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100
  ) {
    return null;
  }

  return { page, limit, skip: (page - 1) * limit };
};

const validateProfileFields = (fields) => {
  for (const key of ["bio", "location", "profileImage"]) {
    if (fields[key] !== undefined && typeof fields[key] !== "string") {
      return `${key} must be a string`;
    }
  }

  for (const key of ["skills", "software"]) {
    if (
      fields[key] !== undefined &&
      (!Array.isArray(fields[key]) ||
        !fields[key].every((value) => typeof value === "string" && value.trim()))
    ) {
      return `${key} must be an array of non-empty strings`;
    }
  }

  if (
    fields.experience !== undefined &&
    (!Number.isFinite(fields.experience) || fields.experience < 0)
  ) {
    return "experience must be a non-negative number";
  }

  return null;
};

const getProfileFields = (body) =>
  Object.fromEntries(
    profileFields
      .filter((field) => body[field] !== undefined)
      .map((field) => [
        field,
        Array.isArray(body[field])
          ? body[field].map((value) =>
              typeof value === "string" ? value.trim() : value,
            )
          : typeof body[field] === "string"
            ? body[field].trim()
            : body[field],
      ]),
  );

export const getArtists = async (req, res, next) => {
  const pagination = getPagination(req.query);
  if (!pagination) {
    return res.status(400).json({
      success: false,
      message: "page must be positive and limit must be between 1 and 100",
    });
  }

  try {
    const filters = {};
    if (typeof req.query.skill === "string" && req.query.skill.trim()) {
      filters.skills = new RegExp(escapeRegex(req.query.skill.trim()), "i");
    }
    if (typeof req.query.location === "string" && req.query.location.trim()) {
      filters.location = new RegExp(
        escapeRegex(req.query.location.trim()),
        "i",
      );
    }

    if (typeof req.query.name === "string" && req.query.name.trim()) {
      const matchingUsers = await User.find({
        role: "artist",
        name: new RegExp(escapeRegex(req.query.name.trim()), "i"),
      }).select("_id");
      filters.user = { $in: matchingUsers.map((user) => user._id) };
    } else {
      const artistUsers = await User.find({ role: "artist" }).select("_id");
      filters.user = { $in: artistUsers.map((user) => user._id) };
    }

    const [artists, total] = await Promise.all([
      ArtistProfile.find(filters)
        .populate("user", "name")
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit),
      ArtistProfile.countDocuments(filters),
    ]);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          artists,
          pagination: {
            page: pagination.page,
            limit: pagination.limit,
            total,
            totalPages: Math.ceil(total / pagination.limit),
          },
        },
        "Artist profiles retrieved successfully",
      ),
    );
  } catch (error) {
    return next(error);
  }
};

export const getArtistById = async (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid artist profile ID",
    });
  }

  try {
    const artist = await ArtistProfile.findById(req.params.id).populate(
      "user",
      "name",
    );
    if (!artist || !artist.user) {
      return res.status(404).json({
        success: false,
        message: "Artist profile not found",
      });
    }

    return res
      .status(200)
      .json(new ApiResponse(200, { artist }, "Artist profile retrieved successfully"));
  } catch (error) {
    return next(error);
  }
};

export const createArtistProfile = async (req, res, next) => {
  if (req.user.role !== "artist") {
    return res.status(403).json({
      success: false,
      message: "Only artist accounts can create an artist profile",
    });
  }

  const fields = getProfileFields(req.body || {});
  const validationError = validateProfileFields(fields);
  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  try {
    const existingProfile = await ArtistProfile.findOne({ user: req.user.id });
    if (existingProfile) {
      return res.status(409).json({
        success: false,
        message: "An artist profile already exists for this account",
      });
    }

    const artist = await ArtistProfile.create({
      ...fields,
      user: req.user.id,
    });
    return res
      .status(201)
      .json(new ApiResponse(201, { artist }, "Artist profile created successfully"));
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An artist profile already exists for this account",
      });
    }
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    return next(error);
  }
};

export const updateArtistProfile = async (req, res, next) => {
  if (req.user.role !== "artist") {
    return res.status(403).json({
      success: false,
      message: "Only artist accounts can update an artist profile",
    });
  }

  const fields = getProfileFields(req.body || {});
  if (Object.keys(fields).length === 0) {
    return res.status(400).json({
      success: false,
      message: "Provide at least one profile field to update",
    });
  }

  const validationError = validateProfileFields(fields);
  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  try {
    const artist = await ArtistProfile.findOneAndUpdate(
      { user: req.user.id },
      { $set: fields },
      { new: true, runValidators: true },
    );
    if (!artist) {
      return res.status(404).json({
        success: false,
        message: "Artist profile not found; create a profile first",
      });
    }

    return res
      .status(200)
      .json(new ApiResponse(200, { artist }, "Artist profile updated successfully"));
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    return next(error);
  }
};
