import mongoose from "mongoose";
import ArtistProfile from "../models/ArtistProfile.js";
import Portfolio from "../models/Portfolio.js";
import Project from "../models/Project.js";
import Studio from "../models/Studio.js";
import User from "../models/User.js";
import ApiResponse from "../utils/ApiResponse.js";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const userFields = "name email role isActive createdAt updatedAt";

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

const getSearch = (query) => {
  if (query.search === undefined || query.search === "") return "";
  if (typeof query.search !== "string" || query.search.length > 100) return null;
  return query.search.trim();
};

const getStatusFilter = (status) => {
  if (status === undefined || status === "all" || status === "") return {};
  if (status === "active") return { isActive: { $ne: false } };
  if (status === "disabled") return { isActive: false };
  return null;
};

const sendInvalidQuery = (res) =>
  res.status(400).json({
    success: false,
    message: "Invalid search, status, page, or limit parameter",
  });

const sendPage = (res, statusCode, key, items, total, pagination, message) =>
  res.status(statusCode).json(
    new ApiResponse(
      statusCode,
      {
        [key]: items,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages: Math.ceil(total / pagination.limit),
        },
      },
      message,
    ),
  );

export const getDashboard = async (req, res, next) => {
  try {
    const [
      totalUsers,
      artists,
      studios,
      totalProjects,
      activeUsers,
      disabledUsers,
      recentUsers,
      recentProjects,
    ] = await Promise.all([
      User.countDocuments({ role: { $in: ["artist", "studio"] } }),
      User.countDocuments({ role: "artist" }),
      User.countDocuments({ role: "studio" }),
      Project.countDocuments(),
      User.countDocuments({
        role: { $in: ["artist", "studio"] },
        isActive: { $ne: false },
      }),
      User.countDocuments({
        role: { $in: ["artist", "studio"] },
        isActive: false,
      }),
      User.find({ role: { $in: ["artist", "studio"] } })
        .select(userFields)
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Project.find()
        .populate("studio", "name email")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          stats: {
            totalUsers,
            artists,
            studios,
            totalProjects,
            activeUsers,
            disabledUsers,
          },
          recentUsers,
          recentProjects,
        },
        "Admin dashboard retrieved successfully",
      ),
    );
  } catch (error) {
    return next(error);
  }
};

export const getUsers = async (req, res, next) => {
  const pagination = getPagination(req.query);
  const search = getSearch(req.query);
  const statusFilter = getStatusFilter(req.query.status);
  const role = req.query.role ?? "all";
  if (
    !pagination ||
    search === null ||
    statusFilter === null ||
    !["all", "artist", "studio"].includes(role)
  ) {
    return sendInvalidQuery(res);
  }

  const filter = {
    role: role === "all" ? { $in: ["artist", "studio"] } : role,
    ...statusFilter,
  };
  if (search) {
    const pattern = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ name: pattern }, { email: pattern }];
  }

  try {
    const [users, total] = await Promise.all([
      User.find(filter)
        .select(userFields)
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean(),
      User.countDocuments(filter),
    ]);
    return sendPage(
      res,
      200,
      "users",
      users,
      total,
      pagination,
      "Users retrieved successfully",
    );
  } catch (error) {
    return next(error);
  }
};

export const getArtists = async (req, res, next) => {
  const pagination = getPagination(req.query);
  const search = getSearch(req.query);
  const statusFilter = getStatusFilter(req.query.status);
  if (!pagination || search === null || statusFilter === null) {
    return sendInvalidQuery(res);
  }

  try {
    const userFilter = { role: "artist", ...statusFilter };
    const profileFilter = {};
    if (search) {
      const pattern = new RegExp(escapeRegex(search), "i");
      const [matchingUsers, matchingProfiles] = await Promise.all([
        User.find({
          ...userFilter,
          $or: [{ name: pattern }, { email: pattern }],
        }).distinct("_id"),
        ArtistProfile.find({
          $or: [
            { skills: pattern },
            { location: pattern },
            { bio: pattern },
          ],
        }).distinct("user"),
      ]);
      const eligibleUsers = await User.find(userFilter).distinct("_id");
      const eligibleIds = new Set(eligibleUsers.map((id) => id.toString()));
      const matchedIds = [...matchingUsers, ...matchingProfiles]
        .filter((id) => eligibleIds.has(id.toString()));
      profileFilter.user = { $in: [...new Set(matchedIds.map((id) => id.toString()))] };
    } else {
      profileFilter.user = { $in: await User.find(userFilter).distinct("_id") };
    }
    const [artists, total] = await Promise.all([
      ArtistProfile.find(profileFilter)
        .populate("user", userFields)
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean(),
      ArtistProfile.countDocuments(profileFilter),
    ]);
    const artistIds = artists.map((artist) => artist.user?._id).filter(Boolean);
    const portfolioItems = await Portfolio.find({ artist: { $in: artistIds } })
      .select("artist title category imageUrl createdAt")
      .sort({ createdAt: -1 })
      .lean();
    const portfoliosByArtist = new Map();
    for (const item of portfolioItems) {
      const key = item.artist.toString();
      const items = portfoliosByArtist.get(key) || [];
      items.push(item);
      portfoliosByArtist.set(key, items);
    }
    const artistItems = artists
      .filter((artist) => artist.user)
      .map((artist) => {
        const portfolio = portfoliosByArtist.get(artist.user._id.toString()) || [];
        return {
          ...artist,
          portfolioCount: portfolio.length,
          recentPortfolio: portfolio.slice(0, 3),
        };
      });
    return sendPage(
      res,
      200,
      "artists",
      artistItems,
      total,
      pagination,
      "Artists retrieved successfully",
    );
  } catch (error) {
    return next(error);
  }
};

export const getStudios = async (req, res, next) => {
  const pagination = getPagination(req.query);
  const search = getSearch(req.query);
  const statusFilter = getStatusFilter(req.query.status);
  if (!pagination || search === null || statusFilter === null) {
    return sendInvalidQuery(res);
  }

  try {
    const userFilter = { role: "studio", ...statusFilter };
    const profileFilter = {};
    if (search) {
      const pattern = new RegExp(escapeRegex(search), "i");
      const [matchingUsers, matchingProfiles] = await Promise.all([
        User.find({
          ...userFilter,
          $or: [{ name: pattern }, { email: pattern }],
        }).distinct("_id"),
        Studio.find({
          $or: [
            { studioName: pattern },
            { description: pattern },
            { location: pattern },
          ],
        }).distinct("user"),
      ]);
      const eligibleUsers = await User.find(userFilter).distinct("_id");
      const eligibleIds = new Set(eligibleUsers.map((id) => id.toString()));
      const matchedIds = [...matchingUsers, ...matchingProfiles]
        .filter((id) => eligibleIds.has(id.toString()));
      profileFilter.user = { $in: [...new Set(matchedIds.map((id) => id.toString()))] };
    } else {
      profileFilter.user = { $in: await User.find(userFilter).distinct("_id") };
    }

    const [studios, total] = await Promise.all([
      Studio.find(profileFilter)
        .populate("user", userFields)
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean(),
      Studio.countDocuments(profileFilter),
    ]);
    const studioIds = studios.map((studio) => studio.user?._id).filter(Boolean);
    const [projectCounts, recentProjectLists] = await Promise.all([
      Project.aggregate([
        { $match: { studio: { $in: studioIds } } },
        { $group: { _id: "$studio", count: { $sum: 1 } } },
      ]),
      Promise.all(
        studioIds.map((studioId) =>
          Project.find({ studio: studioId })
            .select("studio title status createdAt")
            .sort({ createdAt: -1 })
            .limit(3)
            .lean(),
        ),
      ),
    ]);
    const countByStudio = new Map(
      projectCounts.map((entry) => [entry._id.toString(), entry.count]),
    );
    const recentProjectsByStudio = new Map(
      studioIds.map((studioId, index) => [
        studioId.toString(),
        recentProjectLists[index],
      ]),
    );
    const items = studios
      .filter((studio) => studio.user)
      .map((studio) => ({
        ...studio,
        projectCount: countByStudio.get(studio.user._id.toString()) || 0,
        recentProjects: recentProjectsByStudio.get(studio.user._id.toString()) || [],
      }));
    return sendPage(
      res,
      200,
      "studios",
      items,
      total,
      pagination,
      "Studios retrieved successfully",
    );
  } catch (error) {
    return next(error);
  }
};

export const getProjects = async (req, res, next) => {
  const pagination = getPagination(req.query);
  const search = getSearch(req.query);
  const status = req.query.status ?? "all";
  if (
    !pagination ||
    search === null ||
    !["all", "open", "closed"].includes(status)
  ) {
    return sendInvalidQuery(res);
  }

  try {
    const filter = status === "all" ? {} : { status };
    if (search) {
      const pattern = new RegExp(escapeRegex(search), "i");
      const studios = await User.find({
        role: "studio",
        $or: [{ name: pattern }, { email: pattern }],
      }).distinct("_id");
      filter.$or = [{ title: pattern }, { description: pattern }, { studio: { $in: studios } }];
    }
    const [projects, total] = await Promise.all([
      Project.find(filter)
        .populate("studio", "name email")
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean(),
      Project.countDocuments(filter),
    ]);
    return sendPage(
      res,
      200,
      "projects",
      projects,
      total,
      pagination,
      "Projects retrieved successfully",
    );
  } catch (error) {
    return next(error);
  }
};

export const setUserStatus = async (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid user ID" });
  }
  if (new mongoose.Types.ObjectId(req.params.id).toString() === req.user.id) {
    return res.status(400).json({
      success: false,
      message: "You cannot change your own account status",
    });
  }
  if (typeof req.body?.isActive !== "boolean") {
    return res.status(400).json({
      success: false,
      message: "isActive must be a boolean",
    });
  }

  try {
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: { $in: ["artist", "studio"] } },
      { $set: { isActive: req.body.isActive } },
      { new: true, runValidators: true },
    )
      .select(userFields)
      .lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Artist or studio account not found",
      });
    }
    return res
      .status(200)
      .json(new ApiResponse(200, { user }, "Account status updated successfully"));
  } catch (error) {
    return next(error);
  }
};

export const deleteProject = async (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid project ID" });
  }
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }
    return res
      .status(200)
      .json(new ApiResponse(200, null, "Project removed successfully"));
  } catch (error) {
    return next(error);
  }
};
