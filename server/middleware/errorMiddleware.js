const errorMiddleware = (error, req, res, next) => {
  const statusCode = error.statusCode || error.status || 500;
  const isProduction = process.env.NODE_ENV === "production";

  if (statusCode >= 500) {
    console.error(error);
  }

  res.status(statusCode).json({
    success: false,
    message:
      isProduction && statusCode >= 500
        ? "Internal Server Error"
        : error.message || "Internal Server Error",
  });
};

export default errorMiddleware;
