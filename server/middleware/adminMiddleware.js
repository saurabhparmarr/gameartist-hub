const adminMiddleware = (req, res, next) => {
  if (req.user?.role !== "admin" || req.user.isActive !== true) {
    return res.status(403).json({
      success: false,
      message: "Administrator access is required",
    });
  }

  return next();
};

export default adminMiddleware;
