import mongoose from "mongoose";
import ArtistProfile from "../models/ArtistProfile.js";
import Portfolio from "../models/Portfolio.js";
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

  const searchFields = ["name", "skill", "location"];
  const searchValues = {};
  for (const field of searchFields) {
    const value = req.query[field];
    if (value === undefined) continue;
    if (typeof value !== "string" || value.trim().length > 100) {
      return res.status(400).json({
        success: false,
        message: `${field} must be a string no longer than 100 characters`,
      });
    }
    if (value.trim()) searchValues[field] = value.trim();
  }

  try {
    const profileFilter = {};
    if (searchValues.skill) {
      profileFilter.skills = new RegExp(escapeRegex(searchValues.skill), "i");
    }
    if (searchValues.location) {
      profileFilter.location = new RegExp(escapeRegex(searchValues.location), "i");
    }
    if (searchValues.name) {
      profileFilter["user.name"] = new RegExp(escapeRegex(searchValues.name), "i");
    }

    const [result] = await ArtistProfile.aggregate([
      {
        $lookup: {
          from: User.collection.name,
          localField: "user",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $match: {
          ...profileFilter,
          "user.role": "artist",
          "user.isActive": { $ne: false },
        },
      },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          artists: [
            { $sort: { createdAt: -1, _id: -1 } },
            { $skip: pagination.skip },
            { $limit: pagination.limit },
            {
              $lookup: {
                from: Portfolio.collection.name,
                let: { artistId: "$user._id" },
                pipeline: [
                  { $match: { $expr: { $eq: ["$artist", "$$artistId"] } } },
                  { $sort: { createdAt: -1, _id: -1 } },
                  {
                    $project: {
                      title: 1,
                      category: 1,
                      imageUrl: 1,
                    },
                  },
                  { $limit: 3 },
                ],
                as: "recentPortfolio",
              },
            },
            {
              $project: {
                bio: 1,
                skills: 1,
                experience: 1,
                location: 1,
                profileImage: 1,
                software: 1,
                createdAt: 1,
                updatedAt: 1,
                recentPortfolio: 1,
                user: { _id: "$user._id", name: "$user.name" },
              },
            },
          ],
        },
      },
    ]);
    const artists = result?.artists || [];
    const total = result?.metadata[0]?.total || 0;

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
      "name role isActive",
    );
    if (
      !artist ||
      !artist.user ||
      artist.user.role !== "artist" ||
      artist.user.isActive === false
    ) {
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
