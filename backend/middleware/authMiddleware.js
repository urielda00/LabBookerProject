const jwt = require("jsonwebtoken");
const redisClient = require("../config/redisClient");
const User = require("../models/User");

class AuthMiddleware {
  // Generate access and refresh tokens
  async generateTokens(user) {
    try {
      if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
        throw new Error("JWT secrets not configured");
      }

      const accessToken = jwt.sign(
        {
          userId: user._id,
          email: user.email,
          role: user.role,
        },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: "24h" },
      );

      const refreshToken = jwt.sign(
        {
          userId: user._id,
        },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: "7d" },
      );

      try {
        await redisClient.storeToken(
          user._id.toString(),
          refreshToken,
          7 * 24 * 60 * 60,
        );
      } catch (redisError) {
        if(process.env.NODE_ENV !== 'production') {
          console.error("Redis token storage error:", redisError);
        }else{ 
          console.error("Redis token storage error:", redisError.message);
        }
      }

      return { accessToken, refreshToken };
    } catch (error) {
      if(process.env.NODE_ENV !== 'production') {
        console.error("Token generation error:", error);
      }else{
        console.error("Token generation error:", error.message);
      }
      throw error;
    }
  }

  // Middleware to verify JWT token
  requireAuth = async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res
          .status(401)
          .json({ message: "Authorization token required" });
      }

      const token = authHeader.split(" ")[1];

      try {
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

        const user = await User.findById(decoded.userId).select("-password");
        if (!user) {
          return res.status(401).json({ message: "User not found" });
        }

        req.user = user;
        next();
      } catch (error) {
        if(process.env.NODE_ENV !== 'production') {
          console.error("Token verification error:", error);
        }else{
          console.error("Token verification error:", error.message);
        }
        if (error.name === "TokenExpiredError") {
          return res.status(401).json({ message: "Token expired" });
        }
        return res.status(401).json({ message: "Invalid token" });
      }
    } catch (error) {
      if(process.env.NODE_ENV !== 'production') {
        console.error("Auth middleware error:", error);
      }else{
        console.error("Auth middleware error:", error.message);
      }
      res.status(500).json({ message: "Internal server error" });
    }
  };

  // Middleware to check user role with root bypass
  requireRole = (roles) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Root role automatically bypasses any role restriction
      if (req.user.role === 'root' || roles.includes(req.user.role)) {
        return next();
      }

      return res.status(403).json({
        message: "You do not have permission to perform this action",
      });
    };
  };

  // Middleware to protect root user and prevent manual root role assignment
protectRoot = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    // 1. Prevent any operation on an existing root user
    if (userId) {
      const targetUser = await User.findById(userId);
      if (targetUser && targetUser.role === 'root') {
        return res.status(403).json({
          message: "The root user is immutable and cannot be modified or deleted",
        });
      }
    }

    // 2. Prevent setting a user's role to root via API
    if (role === 'root') {
      return res.status(403).json({
        message: "Root role can only be assigned via system startup seeding",
      });
    }

    // 3. Only root can assign the admin role
    if (role === 'admin' && req.user.role !== 'root') {
      return res.status(403).json({
        message: "Only the root user has permission to grant admin privileges",
      });
    }

    next();
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error("Protect root middleware error:", error);
    } else {
      console.error("Protect root middleware error:", error.message);
    }
    res.status(500).json({ message: "Internal server error" });
  }
};

  // Refresh token handler
  refreshTokens = async (req, res) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ message: "Refresh token required" });
      }

      try {
        const decoded = jwt.verify(
          refreshToken,
          process.env.JWT_REFRESH_SECRET,
        );

        const storedToken = await redisClient.get(`token:${decoded.userId}`);
        if (!storedToken || storedToken !== refreshToken) {
          return res.status(401).json({ message: "Invalid refresh token" });
        }

        const user = await User.findById(decoded.userId);
        if (!user) {
          return res.status(401).json({ message: "User not found" });
        }

        const tokens = await this.generateTokens(user);

        res.json(tokens);
      } catch (error) {
        if(process.env.NODE_ENV !== 'production') {
          console.error("Token refresh error:", error);
        }else{
          console.error("Token refresh error:", error.message);
        }
        if (error.name === "TokenExpiredError") {
          return res.status(401).json({ message: "Refresh token expired" });
        }
        return res.status(401).json({ message: "Invalid refresh token" });
      }
    } catch (error) {
      if(process.env.NODE_ENV !== 'production') {
        console.error("Refresh token error:", error);
      }else{
        console.error("Refresh token error:", error.message);
      }
      res.status(500).json({ message: "Internal server error" });
    }
  };

  // Logout handler
  logout = async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res
          .status(401)
          .json({ message: "Authorization token required" });
      }

      const token = authHeader.split(" ")[1];

      try {
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        await redisClient.del(`token:${decoded.userId}`);
        res.json({ message: "Logged out successfully" });
      } catch (error) {
        res.json({ message: "Logged out successfully" });
      }
    } catch (error) {
      if(process.env.NODE_ENV !== 'production') {
        console.error("Logout error:", error);
      }else{
        console.error("Logout error:", error.message);
      }
      res.status(500).json({ message: "Internal server error" });
    }
  };

  // Verify email token
  verifyEmailToken = async (token) => {
    try {
      const decoded = jwt.verify(token, process.env.JWT_EMAIL_SECRET);
      return decoded;
    } catch (error) {
      if(process.env.NODE_ENV !== 'production') {
        console.error("Email verification token error:", error);
      }else{
        console.error("Email verification token error:", error.message);
      }
      throw error;
    }
  };

  // Generate password reset token
  generatePasswordResetToken = async (userId) => {
    try {
      const token = jwt.sign({ userId }, process.env.JWT_RESET_SECRET, {
        expiresIn: "1h",
      });

      await redisClient.set(
        `reset:${userId}`,
        token,
        "EX",
        3600,
      );

      return token;
    } catch (error) {
        if(process.env.NODE_ENV !== 'production') {
          console.error("Password reset token generation error:", error);
        }else{
          console.error("Password reset token generation error:", error.message);
        }
      throw error;
    }
  };

  // Verify password reset token
  verifyPasswordResetToken = async (token) => {
    try {
      const decoded = jwt.verify(token, process.env.JWT_RESET_SECRET);

      const storedToken = await redisClient.get(`reset:${decoded.userId}`);
      if (!storedToken || storedToken !== token) {
        throw new Error("Invalid or expired reset token");
      }

      return decoded;
    } catch (error) {
      if(process.env.NODE_ENV !== 'production') {
        console.error("Password reset token verification error:", error);
      }else{
        console.error("Password reset token verification error:", error.message);
      }
      throw error;
    }
  };
}

module.exports = new AuthMiddleware();