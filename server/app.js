import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import healthRoutes from "./routes/healthRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import { sanitizeMongoPayload } from "./utils/security.js";
import artistRoutes from "./routes/artistRoutes.js";
import portfolioRoutes from "./routes/portfolioRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import savedArtistRoutes from "./routes/savedArtistRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import errorMiddleware from "./middleware/errorMiddleware.js";

const app = express();
app.set("trust proxy", 1);
const configuredOrigins = process.env.CORS_ORIGINS
  ?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please wait a moment and try again.",
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  message: {
    success: false,
    message: "Too many login or registration attempts. Please try again later.",
  },
});

app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: false,
}));
app.use(cors({
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    if (configuredOrigins?.length) {
      return callback(null, configuredOrigins.includes(origin));
    }

    return callback(null, process.env.NODE_ENV !== "production");
  },
  credentials: false,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(generalLimiter);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use((req, _res, next) => {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeMongoPayload(req.body);
  }
  next();
});

app.use("/", healthRoutes);
app.use("/api/v1/auth", authLimiter, authRoutes);
app.use("/api/v1/artists", artistRoutes);
app.use("/api/v1/portfolio", portfolioRoutes);
app.use("/api/v1/projects", projectRoutes);
app.use("/api/v1/saved-artists", savedArtistRoutes);
app.use("/api/v1/messages", messageRoutes);
app.use("/api/v1/admin", adminRoutes);

app.use((req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
});

app.use(errorMiddleware);

export default app;
