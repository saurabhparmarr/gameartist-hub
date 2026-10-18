import "dotenv/config";
import app from "./app.js";
import connectDB from "./config/db.js";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is missing from the environment");
    }

    if (
      process.env.NODE_ENV === "production" &&
      !process.env.CORS_ORIGINS?.split(",").some((origin) => origin.trim())
    ) {
      throw new Error("CORS_ORIGINS must include the deployed frontend origin in production");
    }

    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
