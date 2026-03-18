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
        { expiresIn: "24h" }, // 24 hrs
      );

      const refreshToken = jwt.sign(
        {
          userId: user._id,
        },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: "7d" }, // 7 days
      );

      // Store refresh token in Redis
      try {
        await redisClient.storeToken(
          user._id.toString(),
          refreshToken,
          7 * 24 * 60 * 60, // 7 days in seconds
        );
      } catch (redisError) {
        console.error("Redis token storage error:", redisError);
        // Continue even if Redis storage fails
      }

      return { accessToken, refreshToken };
    } catch (error) {
      console.error("Token generation error:", error);
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

        // Find user and attach to request
        const user = await User.findById(decoded.userId).select("-password");
        if (!user) {
          return res.status(401).json({ message: "User not found" });
        }

        req.user = user;
        next();
      } catch (error) {
        console.error("Token verification error:", error);
        if (error.name === "TokenExpiredError") {
          return res.status(401).json({ message: "Token expired" });
        }
        return res.status(401).json({ message: "Invalid token" });
      }
    } catch (error) {
      console.error("Auth middleware error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };

  // Middleware to check user role
  requireRole = (roles) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          message: "You do not have permission to perform this action",
        });
      }

      next();
    };
  };

  // Refresh token handler
  refreshTokens = async (req, res) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ message: "Refresh token required" });
      }

      try {
        // Verify refresh token
        const decoded = jwt.verify(
          refreshToken,
          process.env.JWT_REFRESH_SECRET,
        );

        // Check if token exists in Redis
        const storedToken = await redisClient.get(`token:${decoded.userId}`);
        if (!storedToken || storedToken !== refreshToken) {
          return res.status(401).json({ message: "Invalid refresh token" });
        }

        // Find user
        const user = await User.findById(decoded.userId);
        if (!user) {
          return res.status(401).json({ message: "User not found" });
        }

        // Generate new tokens
        const tokens = await this.generateTokens(user);

        res.json(tokens);
      } catch (error) {
        console.error("Token refresh error:", error);
        if (error.name === "TokenExpiredError") {
          return res.status(401).json({ message: "Refresh token expired" });
        }
        return res.status(401).json({ message: "Invalid refresh token" });
      }
    } catch (error) {
      console.error("Refresh token error:", error);
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

        // Remove refresh token from Redis
        await redisClient.del(`token:${decoded.userId}`);

        res.json({ message: "Logged out successfully" });
      } catch (error) {
        // Even if token verification fails, we'll consider it a successful logout
        res.json({ message: "Logged out successfully" });
      }
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };

  // Verify email token
  verifyEmailToken = async (token) => {
    try {
      const decoded = jwt.verify(token, process.env.JWT_EMAIL_SECRET);
      return decoded;
    } catch (error) {
      console.error("Email verification token error:", error);
      throw error;
    }
  };

  // Generate password reset token
  generatePasswordResetToken = async (userId) => {
    try {
      const token = jwt.sign({ userId }, process.env.JWT_RESET_SECRET, {
        expiresIn: "1h",
      });

      // Store token in Redis
      await redisClient.set(
        `reset:${userId}`,
        token,
        "EX",
        3600, // 1 hour
      );

      return token;
    } catch (error) {
      console.error("Password reset token generation error:", error);
      throw error;
    }
  };

  // Verify password reset token
  verifyPasswordResetToken = async (token) => {
    try {
      const decoded = jwt.verify(token, process.env.JWT_RESET_SECRET);

      // Check if token exists in Redis
      const storedToken = await redisClient.get(`reset:${decoded.userId}`);
      if (!storedToken || storedToken !== token) {
        throw new Error("Invalid or expired reset token");
      }

      return decoded;
    } catch (error) {
      console.error("Password reset token verification error:", error);
      throw error;
    }
  };
}

module.exports = new AuthMiddleware();
