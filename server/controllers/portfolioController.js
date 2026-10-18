import mongoose from "mongoose";
import Portfolio from "../models/Portfolio.js";
import ApiResponse from "../utils/ApiResponse.js";

const categories = [
  "Concept Art",
  "3D Environment",
  "Character Art",
  "Animation",
  "Other",
];
const editableFields = [
  "title",
  "description",
  "category",
  "imageUrl",
  "tools",
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

const getPortfolioFields = (body) =>
  Object.fromEntries(
    editableFields
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

const validatePortfolioFields = (fields, requireAll = false) => {
  if (requireAll && (!fields.title || !fields.category)) {
    return "Title and category are required";
  }
  if (fields.title !== undefined && typeof fields.title !== "string") {
    return "title must be a string";
  }
  if (fields.title !== undefined && !fields.title.trim()) {
    return "title cannot be empty";
  }
  for (const field of ["description", "imageUrl"]) {
    if (fields[field] !== undefined && typeof fields[field] !== "string") {
      return `${field} must be a string`;
    }
  }
  if (fields.category !== undefined && !categories.includes(fields.category)) {
    return `category must be one of: ${categories.join(", ")}`;
  }
  if (
    fields.tools !== undefined &&
    (!Array.isArray(fields.tools) ||
      !fields.tools.every(
        (tool) => typeof tool === "string" && tool.trim().length > 0,
      ))
  ) {
    return "tools must be an array of non-empty strings";
  }
  return null;
};

export const createPortfolioItem = async (req, res, next) => {
  if (req.user.role !== "artist") {
    return res.status(403).json({
      success: false,
      message: "Only artist accounts can create portfolio items",
    });
  }

  const fields = getPortfolioFields(req.body || {});
  const validationError = validatePortfolioFields(fields, true);
  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  try {
    const portfolio = await Portfolio.create({
      ...fields,
      artist: req.user.id,
    });
    return res
      .status(201)
      .json(new ApiResponse(201, { portfolio }, "Portfolio item created successfully"));
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    return next(error);
  }
};

export const getPortfolioItems = async (req, res, next) => {
  const pagination = getPagination(req.query);
  if (!pagination) {
    return res.status(400).json({
      success: false,
      message: "page must be positive and limit must be between 1 and 100",
    });
  }

  const filters = {};
  if (req.query.category !== undefined) {
    if (
      typeof req.query.category !== "string" ||
      !categories.includes(req.query.category)
    ) {
      return res.status(400).json({
        success: false,
        message: `category must be one of: ${categories.join(", ")}`,
      });
    }
    filters.category = req.query.category;
  }
  if (req.query.tools !== undefined) {
    if (typeof req.query.tools !== "string" || !req.query.tools.trim()) {
      return res.status(400).json({
        success: false,
        message: "tools must be a non-empty string",
      });
    }
    filters.tools = req.query.tools.trim();
  }
  if (req.query.artistId !== undefined) {
    if (!mongoose.isObjectIdOrHexString(req.query.artistId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid artist ID",
      });
    }
    filters.artist = req.query.artistId;
  }

  try {
    const [portfolios, total] = await Promise.all([
      Portfolio.find(filters)
        .populate("artist", "name")
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit),
      Portfolio.countDocuments(filters),
    ]);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          portfolios,
          pagination: {
            page: pagination.page,
            limit: pagination.limit,
            total,
            totalPages: Math.ceil(total / pagination.limit),
          },
        },
        "Portfolio items retrieved successfully",
      ),
    );
  } catch (error) {
    return next(error);
  }
};

export const getPortfolioItemById = async (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid portfolio item ID",
    });
  }

  try {
    const portfolio = await Portfolio.findById(req.params.id).populate(
      "artist",
      "name",
    );
    if (!portfolio) {
      return res.status(404).json({
        success: false,
        message: "Portfolio item not found",
      });
    }

    return res
      .status(200)
      .json(new ApiResponse(200, { portfolio }, "Portfolio item retrieved successfully"));
  } catch (error) {
    return next(error);
  }
};

export const updatePortfolioItem = async (req, res, next) => {
  if (req.user.role !== "artist") {
    return res.status(403).json({
      success: false,
      message: "Only artist accounts can update portfolio items",
    });
  }
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid portfolio item ID",
    });
  }

  const fields = getPortfolioFields(req.body || {});
  if (Object.keys(fields).length === 0) {
    return res.status(400).json({
      success: false,
      message: "Provide at least one portfolio field to update",
    });
  }

  const validationError = validatePortfolioFields(fields);
  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  try {
    const portfolio = await Portfolio.findById(req.params.id);
    if (!portfolio) {
      return res.status(404).json({
        success: false,
        message: "Portfolio item not found",
      });
    }
    if (portfolio.artist.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own portfolio items",
      });
    }

    Object.assign(portfolio, fields);
    await portfolio.save();
    return res
      .status(200)
      .json(new ApiResponse(200, { portfolio }, "Portfolio item updated successfully"));
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    return next(error);
  }
};

export const deletePortfolioItem = async (req, res, next) => {
  if (req.user.role !== "artist") {
    return res.status(403).json({
      success: false,
      message: "Only artist accounts can delete portfolio items",
    });
  }
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid portfolio item ID",
    });
  }

  try {
    const portfolio = await Portfolio.findById(req.params.id);
    if (!portfolio) {
      return res.status(404).json({
        success: false,
        message: "Portfolio item not found",
      });
    }
    if (portfolio.artist.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own portfolio items",
      });
    }

    await portfolio.deleteOne();
    return res
      .status(200)
      .json(new ApiResponse(200, null, "Portfolio item deleted successfully"));
  } catch (error) {
    return next(error);
  }
};
