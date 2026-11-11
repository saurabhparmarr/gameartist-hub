import mongoose from "mongoose";

const adminAuditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    actorRole: {
      type: String,
      enum: ["admin", "artist", "studio"],
      required: true,
    },
    actorEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    actionType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
      required: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    targetType: {
      type: String,
      enum: ["user", "project"],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
      default: null,
    },
    targetName: {
      type: String,
      trim: true,
      maxlength: 200,
      default: null,
    },
    details: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null,
    },
    ipAddress: {
      type: String,
      trim: true,
      default: null,
    },
    userAgent: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { timestamps: true },
);

adminAuditLogSchema.index({ createdAt: -1 });
adminAuditLogSchema.index({ actor: 1, createdAt: -1 });
adminAuditLogSchema.index({ status: 1, createdAt: 1, _id: 1 });

const AdminAuditLog = mongoose.model("AdminAuditLog", adminAuditLogSchema);

export default AdminAuditLog;
