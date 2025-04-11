// controllers/userController.js
const redisClient = require("../utils/redisClient");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");
const uploadMulter = require("../middleware/multer");
const cloudinary = require("../utils/cloudinary");
const fs = require("fs");
const crypto = require("crypto");
const { sendVerificationEmail } = require("../utils/emailService");

// Import notifications controller
const notificationsController = require("../controllers/notificationsController");

class UserController {
  constructor() {
    // Bind methods to ensure proper 'this' context
    this.sendVerificationCode = this.sendVerificationCode.bind(this);
    this.verifyCodeAndLogin = this.verifyCodeAndLogin.bind(this);
    this.resendVerificationCode = this.resendVerificationCode.bind(this);
    this.fetchUsers = this.fetchUsers.bind(this);
    this.getUserCount = this.getUserCount.bind(this);
    this.getUserProfile = this.getUserProfile.bind(this);

    this.updateUserProfile = this.updateUserProfile.bind(this);
    this.checkEmailAvailability = this.checkEmailAvailability.bind(this);
    this.initiateEmailChange = this.initiateEmailChange.bind(this);
    this.verifyEmailChange = this.verifyEmailChange.bind(this);
    this.cancelEmailChange = this.cancelEmailChange.bind(this);

    this.getAllUsers = this.getAllUsers.bind(this);
    this.updateUserRole = this.updateUserRole.bind(this);
    this.blockUser = this.blockUser.bind(this);
    this.unblockUser = this.unblockUser.bind(this);
    this.deleteUser = this.deleteUser.bind(this);
  }

  // Send verification code
  async sendVerificationCode(req, res) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      // Generate verification code
      const verificationCode = crypto.randomInt(100000, 999999).toString();
      const codeExpiration = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      // Update user with verification code
      user.verificationCode = verificationCode;
      user.verificationExpires = codeExpiration;
      await user.save();
      // For testing, return code; remove in production
      return res.status(200).json({
        message: "Verification code sent",
        verificationCode,
        codeExpiration: codeExpiration.toISOString(),
      });
    } catch (error) {
      console.error("Send verification code error:", error);
      return res.status(500).json({
        message: "Failed to send verification code",
        error: error.message,
      });
    }
  }

  // Verify code and login
  async verifyCodeAndLogin(req, res) {
    try {
      const { email, verificationCode } = req.body;
      if (!email || !verificationCode) {
        return res.status(400).json({
          message: "Email and verification code are required",
        });
      }
      const user = await User.findOne({
        email,
        verificationCode,
        verificationExpires: { $gt: new Date() },
      });
      if (!user) {
        return res.status(401).json({
          message: "Invalid or expired verification code",
        });
      }
      // Clear verification code and expiration
      user.verificationCode = null;
      user.verificationExpires = null;
      await user.save();
      // Generate tokens
      const { accessToken, refreshToken } =
        await authMiddleware.generateTokens(user);
      return res.status(200).json({
        message: "Login successful",
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
        accessToken,
        refreshToken,
      });
    } catch (error) {
      console.error("Verify code error:", error);
      return res.status(500).json({
        message: "Verification failed",
        error: error.message,
      });
    }
  }

  // Resend verification code
  async resendVerificationCode(req, res) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      // Generate new verification code
      const verificationCode = crypto.randomInt(100000, 999999).toString();
      const codeExpiration = new Date(Date.now() + 15 * 60 * 1000);
      user.verificationCode = verificationCode;
      user.verificationExpires = codeExpiration;
      await user.save();
      return res.status(200).json({
        message: "New verification code sent",
        verificationCode, // Remove in production
        codeExpiration: codeExpiration.toISOString(),
      });
    } catch (error) {
      console.error("Resend code error:", error);
      return res.status(500).json({
        message: "Failed to resend code",
        error: error.message,
      });
    }
  }

  // Fetch users (protected route)
  async fetchUsers(req, res) {
    try {
      const users = await User.find().select(
        "-verificationCode -verificationExpires",
      );
      return res.status(200).json(users);
    } catch (error) {
      console.error("Fetch users error:", error);
      return res.status(500).json({
        message: "Failed to fetch users",
        error: error.message,
      });
    }
  }

  // Get user count
  async getUserCount(req, res) {
    try {
      const count = await User.countDocuments();
      return res.status(200).json({ count });
    } catch (error) {
      console.error("Get user count error:", error);
      return res.status(500).json({
        message: "Failed to get user count",
        error: error.message,
      });
    }
  }

  // Get user profile
  async getUserProfile(req, res) {
    try {
      const user = await User.findById(req.user._id).select(
        "-verificationCode -verificationExpires",
      );
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      return res.status(200).json(user);
    } catch (error) {
      console.error("Get profile error:", error);
      return res.status(500).json({
        message: "Failed to get profile",
        error: error.message,
      });
    }
  }

  // Update user profile and create notification on success
  async updateUserProfile(req, res) {
    return new Promise((resolve, reject) => {
      uploadMulter(req, res, async (err) => {
        if (err) {
          console.error("Error uploading file:", err.message);
          return res.status(500).json({ message: "Failed to upload file" });
        }
        try {
          const { name, removeImage } = req.body; // parse removeImage from form data
          let profilePicture;
          const user = await User.findById(req.user._id);

          // Remove image if requested
          if (removeImage === "true" || removeImage === true) {
            if (user.profilePicture) {
              try {
                const publicId = user.profilePicture
                  .split("/")
                  .pop()
                  .split(".")[0];
                await cloudinary.uploader.destroy(
                  `profile-pictures/${publicId}`,
                );
              } catch (err) {
                console.error(
                  "Error removing image from Cloudinary:",
                  err.message,
                );
              }
            }
            user.profilePicture = null;
          }

          // Handle new file upload if present
          if (req.file) {
            if (user.profilePicture && !removeImage) {
              try {
                const publicId = user.profilePicture
                  .split("/")
                  .pop()
                  .split(".")[0];
                await cloudinary.uploader.destroy(
                  `profile-pictures/${publicId}`,
                );
              } catch (uploadError) {
                console.error("Error removing old image:", uploadError);
              }
            }
            const result = await cloudinary.uploader.upload(req.file.path, {
              folder: "profile-pictures",
            });
            fs.unlinkSync(req.file.path); // Remove temp file
            profilePicture = result.secure_url;
            user.profilePicture = profilePicture;
          }

          // Update name if provided
          if (name) {
            user.name = name;
          }

          await user.save();

          // Create a notification about the profile update
          try {
            await notificationsController.createNotification(
              user._id,
              "user.notify.profileUpdated",   // i18n key
              {},                             // no params needed
              "profileUpdate"
            );
            
          } catch (notificationError) {
            console.error(
              "Notification creation error:",
              notificationError.message,
            );
            // Continue even if notification creation fails
          }

          const updatedUser = user.toObject();
          delete updatedUser.verificationCode;
          delete updatedUser.verificationExpires;
          delete updatedUser.emailChangeRequest;

          return res.status(200).json({
            message: "Profile updated successfully",
            user: updatedUser,
          });
        } catch (error) {
          console.error("Update profile error:", error);
          return res.status(500).json({
            message: "Failed to update profile",
            error: error.message,
          });
        }
      });
    });
  }

  // Check email availability
  async checkEmailAvailability(req, res) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      const existingUser = await User.findOne({
        email,
        _id: { $ne: req.user._id }, // Exclude current user
      });
      return res.status(200).json({
        available: !existingUser,
      });
    } catch (error) {
      console.error("Check email availability error:", error);
      return res.status(500).json({
        message: "Failed to check email availability",
        error: error.message,
      });
    }
  }

  // Initiate email change
  async initiateEmailChange(req, res) {
    try {
      const { newEmail } = req.body;
      const userId = req.user._id;
      if (!newEmail) {
        return res.status(400).json({ message: "New email is required" });
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newEmail)) {
        return res.status(400).json({ message: "Invalid email format" });
      }
      const existingUser = await User.findOne({
        email: newEmail.toLowerCase(),
        _id: { $ne: userId },
      });
      if (existingUser) {
        return res.status(409).json({ message: "Email already in use" });
      }
      const verificationCode = Math.floor(
        100000 + Math.random() * 900000,
      ).toString();
      const codeExpiration = new Date(Date.now() + 15 * 60 * 1000);
      // Store temporarily in Redis
      await redisClient.set(
        `changeEmail:${userId}`,
        verificationCode,
        "EX",
        300,
      );
      await redisClient.set(
        `changeEmail:newEmail:${userId}`,
        newEmail,
        "EX",
        300,
      );
      // Persist the pending request in the user's document
      const user = await User.findById(userId);
      user.emailChangeRequest = {
        newEmail: newEmail.toLowerCase(),
        verificationCode,
        expiresAt: codeExpiration,
      };
      await user.save();
      await sendVerificationEmail(req.user.email, verificationCode);
      return res.status(200).json({
        message: "Verification code sent to your current email address",
      });
    } catch (error) {
      console.error("initiateEmailChange error:", error);
      return res.status(500).json({
        message: "Failed to initiate email change",
        error: error.message,
      });
    }
  }

  // Verify email change and create a notification
  async verifyEmailChange(req, res) {
    try {
      const { verificationCode } = req.body;
      const userId = req.user._id;
      if (!verificationCode) {
        return res
          .status(400)
          .json({ message: "Verification code is required" });
      }
      // Retrieve code from Redis
      const storedCode = await redisClient.get(`changeEmail:${userId}`);
      if (!storedCode) {
        return res
          .status(400)
          .json({ message: "No active email change request or code expired" });
      }
      if (storedCode !== verificationCode) {
        return res.status(400).json({ message: "Invalid verification code" });
      }
      const pendingNewEmail = await redisClient.get(
        `changeEmail:newEmail:${userId}`,
      );
      if (!pendingNewEmail) {
        return res.status(400).json({
          message: "Could not find pending new email. Please try again.",
        });
      }
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      // Optional: Check if the new email is still available
      const emailInUse = await User.findOne({
        email: pendingNewEmail.toLowerCase(),
        _id: { $ne: userId },
      });
      if (emailInUse) {
        return res
          .status(409)
          .json({ message: "This email is no longer available" });
      }
      // Update user's email and clear the pending request
      user.email = pendingNewEmail.toLowerCase();
      user.emailChangeRequest = null;
      await user.save();
      // Cleanup Redis keys
      await redisClient.del(`changeEmail:${userId}`);
      await redisClient.del(`changeEmail:newEmail:${userId}`);
      // Create a notification about the email update
      try {
        await notificationsController.createNotification(
          user._id,
          "user.notify.emailChanged",
          {},
          "emailChange"
        );
        
      } catch (notificationError) {
        console.error(
          "Notification creation error:",
          notificationError.message,
        );
      }
      return res.status(200).json({
        message: "Email updated successfully",
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
        },
      });
    } catch (error) {
      console.error("verifyEmailChange error:", error);
      return res.status(500).json({
        message: "Failed to verify email change",
        error: error.message,
      });
    }
  }

  // Cancel email change request and (optionally) create a cancellation notification
  async cancelEmailChange(req, res) {
    try {
      const userId = req.user._id;
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      user.emailChangeRequest = null;
      await user.save();
      await redisClient.del(`changeEmail:${userId}`);
      await redisClient.del(`changeEmail:newEmail:${userId}`);
      // Optionally, create a notification informing the user that the request was canceled
      try {
        await notificationsController.createNotification(
          user._id,
          "user.notify.emailChangeCancelled",
          {},
          "emailChangeCancel"
        );
        
      } catch (notificationError) {
        console.error(
          "Notification cancellation error:",
          notificationError.message,
        );
      }
      return res
        .status(200)
        .json({ message: "Email change request cancelled." });
    } catch (error) {
      console.error("cancelEmailChange error:", error);
      return res.status(500).json({
        message: "Failed to cancel email change request",
        error: error.message,
      });
    }
  }

  // Admin: Get all users with filters
  // Fix getAllUsers method in UserController
  async getAllUsers(req, res) {
    try {
      const { page = 1, limit = 10, role, search } = req.query;
      const query = {};

      if (role && role !== "all") query.role = role;
      if (search) {
        query.$or = [
          { username: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { name: { $regex: search, $options: "i" } },
        ];
      }

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        select:
          "-verificationCode -verificationExpires -emailChangeRequest -__v",
        sort: { createdAt: -1 },
        collation: { locale: "en", strength: 2 }, // Case-insensitive sorting
      };

      const result = await User.paginate(query, options);

      // Transform the result to match frontend expectations
      return res.status(200).json({
        docs: result.docs,
        total: result.totalDocs,
        limit: result.limit,
        page: result.page,
        totalPages: result.totalPages,
      });
    } catch (error) {
      console.error("Get all users error:", error);
      return res.status(500).json({
        message: "Failed to fetch users",
        error: error.message,
      });
    }
  }

  // Admin: Update user role
  async updateUserRole(req, res) {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      if (!["user", "admin", "manager"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      if (userId === req.user._id.toString()) {
        return res.status(400).json({ message: "Cannot modify your own role" });
      }

      const user = await User.findByIdAndUpdate(
        userId,
        { role },
        { new: true, runValidators: true },
      ).select("-verificationCode -verificationExpires");

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Create notification
      await notificationsController.createNotification(
        user._id,
        "user.notify.roleUpdated",
        { role },
        "roleUpdate"
      );
      

      return res.status(200).json(user);
    } catch (error) {
      console.error("Update role error:", error);
      return res.status(500).json({
        message: "Failed to update role",
        error: error.message,
      });
    }
  }

  // Admin: Block/unblock user
  async blockUser(req, res) {
    try {
      const { userId } = req.params;
      const { blockDuration } = req.body; // in hours

      if (userId === req.user._id.toString()) {
        return res.status(400).json({ message: "Cannot block yourself" });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const blockUntil = new Date(Date.now() + blockDuration * 60 * 60 * 1000);
      user.cancellationStats.blockedUntil = blockUntil;
      await user.save();

      // Create notification
      await notificationsController.createNotification(
        user._id,
        "user.notify.accountBlocked",
        { date: blockUntil.toLocaleDateString() },
        "accountBlocked"
      );
      

      return res.status(200).json({
        message: "User blocked successfully",
        blockedUntil: blockUntil,
      });
    } catch (error) {
      console.error("Block user error:", error);
      return res.status(500).json({
        message: "Failed to block user",
        error: error.message,
      });
    }
  }

  // Admin: Unblock user
  async unblockUser(req, res) {
    try {
      const { userId } = req.params;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      user.cancellationStats.blockedUntil = null;
      await user.save();

      // Create notification
      await notificationsController.createNotification(
        user._id,
        "user.notify.accountUnblocked",
        {},
        "accountUnblocked"
      );
      

      return res.status(200).json({ message: "User unblocked successfully" });
    } catch (error) {
      console.error("Unblock user error:", error);
      return res.status(500).json({
        message: "Failed to unblock user",
        error: error.message,
      });
    }
  }

  // Admin: Delete user
  async deleteUser(req, res) {
    try {
      const { userId } = req.params;

      if (userId === req.user._id.toString()) {
        return res.status(400).json({ message: "Cannot delete yourself" });
      }

      const user = await User.findByIdAndDelete(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      return res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Delete user error:", error);
      return res.status(500).json({
        message: "Failed to delete user",
        error: error.message,
      });
    }
  }
}

module.exports = new UserController();
