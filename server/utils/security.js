export const normalizeString = (value) => {
  if (typeof value !== "string") return value;
  return value.trim();
};

export const sanitizeEmail = (value) => {
  if (typeof value !== "string") return value;
  return value.trim().toLowerCase();
};

export const sanitizeMongoPayload = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeMongoPayload(item));
  }

  if (value && typeof value === "object") {
    const sanitized = {};

    for (const [key, nestedValue] of Object.entries(value)) {
      if (key.startsWith("$") || key.includes(".")) {
        continue;
      }

      sanitized[key] = sanitizeMongoPayload(nestedValue);
    }

    return sanitized;
  }

  return value;
};

export const getClientMeta = (req) => ({
  ipAddress: req.ip || req.headers["x-forwarded-for"] || req.socket?.remoteAddress || null,
  userAgent: req.headers["user-agent"] || null,
});

export const recordAdminAudit = async (req, payload) => {
  if (!req.user || req.user.role !== "admin") {
    throw new Error("Cannot record an administrative action without an administrator identity");
  }

  const { default: AdminAuditLog } = await import("../models/AdminAuditLog.js");
  const meta = getClientMeta(req);

  return AdminAuditLog.create({
    actor: req.user.id,
    actorRole: req.user.role,
    actorEmail: req.user.email || null,
    actionType: payload.actionType,
    targetType: payload.targetType,
    targetId: payload.targetId || null,
    targetName: payload.targetName || null,
    details: payload.details || null,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });
};

export const completeAdminAudit = async (auditLog) => {
  const { default: AdminAuditLog } = await import("../models/AdminAuditLog.js");
  const result = await AdminAuditLog.updateOne(
    { _id: auditLog._id, status: "pending" },
    { $set: { status: "completed", completedAt: new Date() } },
  );
  if (result.matchedCount !== 1) {
    throw new Error("Administrative action audit record could not be completed");
  }
};

export const failAdminAudit = async (auditLog) => {
  const { default: AdminAuditLog } = await import("../models/AdminAuditLog.js");
  const result = await AdminAuditLog.updateOne(
    { _id: auditLog._id, status: "pending" },
    { $set: { status: "failed" } },
  );
  if (result.matchedCount !== 1) {
    throw new Error("Administrative action audit record could not be marked as failed");
  }
};
