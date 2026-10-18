import express from "express";
import cors from "cors";
import healthRoutes from "./routes/healthRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import artistRoutes from "./routes/artistRoutes.js";
import portfolioRoutes from "./routes/portfolioRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import savedArtistRoutes from "./routes/savedArtistRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import errorMiddleware from "./middleware/errorMiddleware.js";

const app = express();
const configuredOrigins = process.env.CORS_ORIGINS
  ?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

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
}));
app.use(express.json());

app.use("/", healthRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/artists", artistRoutes);
app.use("/api/v1/portfolio", portfolioRoutes);
app.use("/api/v1/projects", projectRoutes);
app.use("/api/v1/saved-artists", savedArtistRoutes);
app.use("/api/v1/messages", messageRoutes);

// Send unknown routes through the same JSON error handler.
app.use((req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
});

app.use(errorMiddleware);

export default app;
