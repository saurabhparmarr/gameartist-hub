import mongoose from "mongoose";
import ArtistProfile from "../models/ArtistProfile.js";
import AdminAuditLog from "../models/AdminAuditLog.js";
import Portfolio from "../models/Portfolio.js";
import Project from "../models/Project.js";
import Studio from "../models/Studio.js";
import User from "../models/User.js";
import ApiResponse from "../utils/ApiResponse.js";
import {
  completeAdminAudit,
  failAdminAudit,
  recordAdminAudit,
} from "../utils/security.js";

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
        .sort({ createdAt: -1, _id: -1 })
        .limit(5)
        .lean(),
      Project.find()
        .populate("studio", "name email")
        .sort({ createdAt: -1, _id: -1 })
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

export const getPendingAuditLogs = async (req, res, next) => {
  const pagination = getPagination(req.query);
  if (!pagination) return sendInvalidQuery(res);

  try {
    const filter = { status: "pending" };
    const [logs, total] = await Promise.all([
      AdminAuditLog.find(filter)
        .select(
          "actor actorEmail actionType targetType targetId targetName details status createdAt",
        )
        .sort({ createdAt: 1, _id: 1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean(),
      AdminAuditLog.countDocuments(filter),
    ]);

    const userIds = logs
      .filter((log) => log.targetType === "user" && log.targetId)
      .map((log) => log.targetId);
    const projectIds = logs
      .filter((log) => log.targetType === "project" && log.targetId)
      .map((log) => log.targetId);
    const [users, projects] = await Promise.all([
      userIds.length
        ? User.find({ _id: { $in: userIds } }).select("_id isActive").lean()
        : [],
      projectIds.length
        ? Project.find({ _id: { $in: projectIds } }).select("_id").lean()
        : [],
    ]);
    const usersById = new Map(users.map((user) => [user._id.toString(), user]));
    const projectsById = new Set(projects.map((project) => project._id.toString()));

    const records = logs.map((log) => {
      let reconciliation = { assessment: "manual_review" };
      if (log.targetType === "user" && log.targetId) {
        const target = usersById.get(log.targetId.toString());
        if (!target) {
          reconciliation = { assessment: "target_missing" };
        } else {
          const expectedStatus = log.actionType === "reactivate_account";
          const recognizedAction = ["disable_account", "reactivate_account"]
            .includes(log.actionType);
          reconciliation = {
            assessment: !recognizedAction
              ? "manual_review"
              : target.isActive === expectedStatus
                ? "matches_requested_state"
                : "differs_from_requested_state",
            observedIsActive: target.isActive,
          };
        }
      } else if (log.targetType === "project" && log.targetId) {
        reconciliation = {
          assessment: projectsById.has(log.targetId.toString())
            ? "differs_from_requested_state"
            : "matches_requested_state",
          observedExists: projectsById.has(log.targetId.toString()),
        };
      }

      return {
        id: log._id,
        actor: { id: log.actor, email: log.actorEmail },
        actionType: log.actionType,
        targetType: log.targetType,
        targetId: log.targetId,
        targetName: log.targetName,
        details: log.details,
        status: log.status,
        createdAt: log.createdAt,
        reconciliation,
      };
    });

    return sendPage(
      res,
      200,
      "auditLogs",
      records,
      total,
      pagination,
      "Pending audit records retrieved successfully",
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
        .sort({ createdAt: -1, _id: -1 })
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
    const filter = {
      "user.role": "artist",
      ...(statusFilter.isActive === false
        ? { "user.isActive": false }
        : statusFilter.isActive?.$ne === false
          ? { "user.isActive": { $ne: false } }
          : {}),
    };
    if (search) {
      const pattern = new RegExp(escapeRegex(search), "i");
      filter.$or = [
        { "user.name": pattern },
        { "user.email": pattern },
        { skills: pattern },
        { location: pattern },
        { bio: pattern },
      ];
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
      { $match: filter },
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
                      createdAt: 1,
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
                user: {
                  _id: "$user._id",
                  name: "$user.name",
                  email: "$user.email",
                  role: "$user.role",
                  isActive: "$user.isActive",
                  createdAt: "$user.createdAt",
                  updatedAt: "$user.updatedAt",
                },
              },
            },
          ],
        },
      },
    ]);

    const artistItems = result?.artists || [];
    const artistIds = artistItems.map((artist) => artist.user._id);
    const portfolioCounts = artistIds.length
      ? await Portfolio.aggregate([
          { $match: { artist: { $in: artistIds } } },
          { $group: { _id: "$artist", count: { $sum: 1 } } },
        ])
      : [];
    const countsByArtist = new Map(
      portfolioCounts.map((entry) => [entry._id.toString(), entry.count]),
    );
    const artists = artistItems.map((artist) => ({
      ...artist,
      portfolioCount: countsByArtist.get(artist.user._id.toString()) || 0,
    }));
    const total = result?.metadata[0]?.total || 0;

    return sendPage(
      res,
      200,
      "artists",
      artists,
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
    const filter = {
      "user.role": "studio",
      ...(statusFilter.isActive === false
        ? { "user.isActive": false }
        : statusFilter.isActive?.$ne === false
          ? { "user.isActive": { $ne: false } }
          : {}),
    };
    if (search) {
      const pattern = new RegExp(escapeRegex(search), "i");
      filter.$or = [
        { "user.name": pattern },
        { "user.email": pattern },
        { studioName: pattern },
        { description: pattern },
        { location: pattern },
      ];
    }

    const studioFilterStages = [
      {
        $lookup: {
          from: User.collection.name,
          localField: "user",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      { $match: filter },
    ];
    const [countResult, items] = await Promise.all([
      Studio.aggregate([...studioFilterStages, { $count: "total" }]),
      Studio.aggregate([
        ...studioFilterStages,
        { $sort: { createdAt: -1, _id: -1 } },
        { $skip: pagination.skip },
        { $limit: pagination.limit },
        {
          $lookup: {
            from: Project.collection.name,
            let: { studioId: "$user._id" },
            pipeline: [
              { $match: { $expr: { $eq: ["$studio", "$$studioId"] } } },
              { $sort: { createdAt: -1, _id: -1 } },
              {
                $facet: {
                  recentProjects: [
                    { $limit: 3 },
                    { $project: { title: 1, status: 1, createdAt: 1 } },
                  ],
                  projectCounts: [{ $count: "count" }],
                },
              },
            ],
            as: "projectSummary",
          },
        },
        {
          $addFields: {
            projectSummary: { $arrayElemAt: ["$projectSummary", 0] },
          },
        },
        {
          $addFields: {
            projectCount: {
              $ifNull: [
                { $arrayElemAt: ["$projectSummary.projectCounts.count", 0] },
                0,
              ],
            },
            recentProjects: {
              $ifNull: ["$projectSummary.recentProjects", []],
            },
          },
        },
        {
          $project: {
            studioName: 1,
            description: 1,
            website: 1,
            location: 1,
            createdAt: 1,
            updatedAt: 1,
            projectCount: 1,
            recentProjects: 1,
            user: {
              _id: "$user._id",
              name: "$user.name",
              email: "$user.email",
              role: "$user.role",
              isActive: "$user.isActive",
              createdAt: "$user.createdAt",
              updatedAt: "$user.updatedAt",
            },
          },
        },
      ]),
    ]);
    const total = countResult[0]?.total || 0;
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
        .sort({ createdAt: -1, _id: -1 })
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
    const target = await User.findOne({
      _id: req.params.id,
      role: { $in: ["artist", "studio"] },
    })
      .select(userFields)
      .lean();
    if (!target) {
      return res.status(404).json({
        success: false,
        message: "Artist or studio account not found",
      });
    }

    const auditLog = await recordAdminAudit(req, {
      actionType: req.body.isActive ? "reactivate_account" : "disable_account",
      targetType: "user",
      targetId: target._id,
      targetName: target.name,
      details: `${req.body.isActive ? "Reactivated" : "Disabled"} account ${target.email}`,
    });
    let user;
    try {
      user = await User.findOneAndUpdate(
        { _id: req.params.id, role: { $in: ["artist", "studio"] } },
        { $set: { isActive: req.body.isActive } },
        { returnDocument: "after", runValidators: true },
      )
        .select(userFields)
        .lean();
    } catch (error) {
      await failAdminAudit(auditLog);
      throw error;
    }

    if (!user) {
      await failAdminAudit(auditLog);
      return res.status(404).json({
        success: false,
        message: "Artist or studio account not found",
      });
    }
    await completeAdminAudit(auditLog);

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
    const project = await Project.findById(req.params.id).populate("studio", "name email");
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const auditLog = await recordAdminAudit(req, {
      actionType: "remove_project",
      targetType: "project",
      targetId: project._id,
      targetName: project.title,
      details: `Removed project from ${project.studio?.name || "studio"}`,
    });
    let removedProject;
    try {
      removedProject = await Project.findByIdAndDelete(req.params.id);
    } catch (error) {
      await failAdminAudit(auditLog);
      throw error;
    }
    if (!removedProject) {
      await failAdminAudit(auditLog);
      return res.status(404).json({ success: false, message: "Project not found" });
    }
    await completeAdminAudit(auditLog);

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Project removed successfully"));
  } catch (error) {
    return next(error);
  }
};
