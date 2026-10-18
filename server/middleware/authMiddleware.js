import jwt from "jsonwebtoken";

const authMiddleware = (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication token is required",
    });
  }

  const token = authorization.slice(7).trim();
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authentication token is required",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (typeof decoded === "string" || !decoded.id || !decoded.role) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired authentication token",
      });
    }

    req.user = { id: decoded.id, role: decoded.role };
    return next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token",
    });
  }
};

export default authMiddleware;
