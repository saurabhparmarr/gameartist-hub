import mongoose from "mongoose";
import Project from "../models/Project.js";
import ApiResponse from "../utils/ApiResponse.js";

const editableFields = [
  "title",
  "description",
  "skillsRequired",
  "budget",
  "status",
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

const getProjectFields = (body) =>
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

const validateProjectFields = (fields, requireAll = false) => {
  if (
    requireAll &&
    (typeof fields.title !== "string" ||
      !fields.title ||
      typeof fields.description !== "string" ||
      !fields.description)
  ) {
    return "Title and description are required";
  }

  for (const field of ["title", "description"]) {
    if (fields[field] !== undefined && typeof fields[field] !== "string") {
      return `${field} must be a string`;
    }
    if (fields[field] !== undefined && !fields[field]) {
      return `${field} cannot be empty`;
    }
  }

  if (
    fields.skillsRequired !== undefined &&
    (!Array.isArray(fields.skillsRequired) ||
      !fields.skillsRequired.every(
        (skill) => typeof skill === "string" && skill.length > 0,
      ))
  ) {
    return "skillsRequired must be an array of non-empty strings";
  }

  if (
    fields.budget !== undefined &&
    (typeof fields.budget !== "number" ||
      !Number.isFinite(fields.budget) ||
      fields.budget < 0)
  ) {
    return "budget must be a non-negative number";
  }

  if (
    fields.status !== undefined &&
    !["open", "closed"].includes(fields.status)
  ) {
    return "status must be open or closed";
  }

  return null;
};

export const createProject = async (req, res, next) => {
  if (req.user.role !== "studio") {
    return res.status(403).json({
      success: false,
      message: "Only studio accounts can create projects",
    });
  }

  const fields = getProjectFields(req.body || {});
  const validationError = validateProjectFields(fields, true);
  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  try {
    const project = await Project.create({
      ...fields,
      studio: req.user.id,
    });
    return res
      .status(201)
      .json(new ApiResponse(201, { project }, "Project created successfully"));
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    return next(error);
  }
};

export const getProjects = async (req, res, next) => {
  const pagination = getPagination(req.query);
  if (!pagination) {
    return res.status(400).json({
      success: false,
      message: "page must be positive and limit must be between 1 and 100",
    });
  }

  const filters = { status: "open" };
  if (req.query.skill !== undefined) {
    if (typeof req.query.skill !== "string" || !req.query.skill.trim()) {
      return res.status(400).json({
        success: false,
        message: "skill must be a non-empty string",
      });
    }
    filters.skillsRequired = req.query.skill.trim();
  }

  try {
    const [projects, total] = await Promise.all([
      Project.find(filters)
        .populate("studio", "name")
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit),
      Project.countDocuments(filters),
    ]);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          projects,
          pagination: {
            page: pagination.page,
            limit: pagination.limit,
            total,
            totalPages: Math.ceil(total / pagination.limit),
          },
        },
        "Open projects retrieved successfully",
      ),
    );
  } catch (error) {
    return next(error);
  }
};

export const getMyProjects = async (req, res, next) => {
  if (req.user.role !== "studio") {
    return res.status(403).json({
      success: false,
      message: "Only studio accounts can view their projects",
    });
  }

  const pagination = getPagination(req.query);
  if (!pagination) {
    return res.status(400).json({
      success: false,
      message: "page must be positive and limit must be between 1 and 100",
    });
  }

  try {
    const filter = { studio: req.user.id };
    const [projects, total] = await Promise.all([
      Project.find(filter)
        .populate("studio", "name")
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit),
      Project.countDocuments(filter),
    ]);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          projects,
          pagination: {
            page: pagination.page,
            limit: pagination.limit,
            total,
            totalPages: Math.ceil(total / pagination.limit),
          },
        },
        "Studio projects retrieved successfully",
      ),
    );
  } catch (error) {
    return next(error);
  }
};

export const getProjectById = async (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid project ID",
    });
  }

  try {
    const project = await Project.findById(req.params.id).populate(
      "studio",
      "name",
    );
    if (!project) {
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    }

    return res
      .status(200)
      .json(new ApiResponse(200, { project }, "Project retrieved successfully"));
  } catch (error) {
    return next(error);
  }
};

export const updateProject = async (req, res, next) => {
  if (req.user.role !== "studio") {
    return res.status(403).json({
      success: false,
      message: "Only studio accounts can update projects",
    });
  }
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid project ID",
    });
  }

  const fields = getProjectFields(req.body || {});
  if (Object.keys(fields).length === 0) {
    return res.status(400).json({
      success: false,
      message: "Provide at least one project field to update",
    });
  }

  const validationError = validateProjectFields(fields);
  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    }
    if (project.studio.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own projects",
      });
    }

    Object.assign(project, fields);
    await project.save();
    return res
      .status(200)
      .json(new ApiResponse(200, { project }, "Project updated successfully"));
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    return next(error);
  }
};

export const deleteProject = async (req, res, next) => {
  if (req.user.role !== "studio") {
    return res.status(403).json({
      success: false,
      message: "Only studio accounts can delete projects",
    });
  }
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid project ID",
    });
  }

  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    }
    if (project.studio.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own projects",
      });
    }

    await project.deleteOne();
    return res
      .status(200)
      .json(new ApiResponse(200, null, "Project deleted successfully"));
  } catch (error) {
    return next(error);
  }
};
