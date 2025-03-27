const User = require("../models/User");
const redisClient = require("../config/redisClient");
const authMiddleware = require("../middleware/authMiddleware");
const { sendVerificationEmail } = require("../utils/emailService");

// Helper function for email validation
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Debug verification (remove in production)
const debugVerification = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email });
    const redisCode = await redisClient.get(`login:${req.params.email}`);

    res.json({
      userCode: user?.verificationCode,
      redisCode,
      expires: user?.verificationExpires,
      now: new Date(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Signup request
const signup = async (req, res) => {
  const { username, name, email } = req.body;

  try {
    console.log("Signup attempt:", { username, name, email });

    // Input validation
    if (!username || !name || !email) {
      return res.status(400).json({
        message: "Username, name, and email are required",
      });
    }

    // Validate username
    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({
        message: "Username must be between 3 and 30 characters",
      });
    }

    // Validate name
    if (name.length < 2 || name.length > 50) {
      return res.status(400).json({
        message: "Name must be between 2 and 50 characters",
      });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({
        message: "Invalid email format",
      });
    }

    // Normalize inputs
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim();
    const normalizedName = name.trim();

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { username: normalizedUsername }],
    });

    if (existingUser) {
      return res.status(409).json({
        message:
          existingUser.email === normalizedEmail
            ? "Email already registered"
            : "Username already taken",
      });
    }

    // Generate verification code
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();
    const verificationExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    console.log(verificationCode);

    await redisClient.set(
      `signup:${normalizedEmail}`,
      JSON.stringify({
        username: normalizedUsername,
        name: normalizedName,
        email: normalizedEmail,
        verificationCode,
        verificationExpires
      }),
      "EX", 300 // 5 minutes expiration
    );

    // Send verification email
    await sendVerificationEmail(normalizedEmail, verificationCode);

    const response = {
      message: "Signup successful. Please check  your email.",
      userId: normalizedEmail
    };

    // Include verification code in development
    if (process.env.NODE_ENV === "development") {
      response.verificationCode = verificationCode;
    }
  
    res.status(201).json(response);

  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({
      message: "Failed to create account",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Login with email verification
const login = async (req, res) => {
  const { email } = req.body;

  try {
    console.log("Login attempt:", { email });

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ message: "Valid email is required" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find user
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      console.log("User not found:", normalizedEmail);
      return res.status(404).json({ message: "User not found" });
    }

    // Generate verification code
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();
    console.log("Generated code:", verificationCode);

    // Update user's verification code
    user.verificationCode = verificationCode;
    user.verificationExpires = new Date(Date.now() + 5 * 60 * 1000);
    await user.save();

    // Store code in Redis
    await redisClient.set(
      `login:${normalizedEmail}`,
      verificationCode,
      "EX",
      300,
    );

    // Send verification email
    await sendVerificationEmail(normalizedEmail, verificationCode);

    const response = {
      message: "Login verification code sent",
      userId: user._id,
    };

    // Include verification code in development
    if (process.env.NODE_ENV === "development") {
      response.verificationCode = verificationCode;
    }

    res.status(200).json(response);
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      message: "Login failed",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const verifyLoginCode = async (req, res) => {
  const { email, code } = req.body;

  try {
    console.log("Verification attempt:", { email, code });

    if (!email || !code) {
      return res.status(400).json({
        message: "Email and verification code are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verification checks...
    if (user.verificationExpires < new Date()) {
      return res.status(400).json({ message: "Verification code has expired" });
    }

    const providedCodeStr = String(code);
    const storedCodeStr = String(user.verificationCode);

    if (providedCodeStr !== storedCodeStr) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    // Generate tokens
    let tokens;
    try {
      tokens = await authMiddleware.generateTokens(user);
    } catch (tokenError) {
      console.error("Token generation error:", tokenError);
      return res.status(500).json({
        message: "Error generating authentication tokens",
        error:
          process.env.NODE_ENV === "development"
            ? tokenError.message
            : undefined,
      });
    }

    // Clear verification data
    user.verificationCode = null;
    user.verificationExpires = null;
    await user.save();

    // Try to clean up Redis, but don't fail if it errors
    try {
      await redisClient.del(`login:${normalizedEmail}`);
    } catch (redisError) {
      console.error("Redis cleanup error:", redisError);
    }

    res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        name: user.name,
        profilePicture: user.profilePicture || null, // Add this line
      },
      ...tokens,
    });
  } catch (error) {
    console.error("Login verification error:", error);
    res.status(500).json({
      message: "Login verification failed",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
// Request a new verification code
const requestCode = async (req, res) => {
  const { email } = req.body;

  try {
    console.log("Code request:", { email });

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ message: "Valid email is required" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check rate limiting
    const attempts = await redisClient.get(`${normalizedEmail}_attempts`);
    if (attempts && parseInt(attempts) >= 3) {
      return res.status(429).json({
        message: "Too many attempts. Please try again later.",
      });
    }

    // Find user
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate new code
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();

    // Update user
    user.verificationCode = verificationCode;
    user.verificationExpires = new Date(Date.now() + 5 * 60 * 1000);
    await user.save();

    // Update Redis
    await Promise.all([
      redisClient.set(normalizedEmail, verificationCode, "EX", 300),
      redisClient.incr(`${normalizedEmail}_attempts`),
      redisClient.expire(`${normalizedEmail}_attempts`, 3600),
    ]);

    // Send email
    await sendVerificationEmail(normalizedEmail, verificationCode);

    const response = {
      message: "New verification code sent",
      expiresIn: "5 minutes",
    };

    if (process.env.NODE_ENV === "development") {
      response.verificationCode = verificationCode;
    }

    res.status(200).json(response);
  } catch (error) {
    console.error("Request code error:", error);
    res.status(500).json({
      message: "Failed to send verification code",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
// Add verifySignup method
const verifySignup = async (req, res) => {
  const { email, code } = req.body;

  try {
    console.log("Signup verification attempt:", { email, code });
    const normalizedEmail = email.trim().toLowerCase();

    // Get stored data from Redis
    const redisData = await redisClient.get(`signup:${normalizedEmail}`);
    if (!redisData) {
      return res.status(400).json({ message: "Verification expired or invalid" });
    }

    const {
      username,
      name,
      verificationCode: storedCode,
      verificationExpires
    } = JSON.parse(redisData);

    // Validate code and expiration
    if (code !== storedCode) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    if (new Date(verificationExpires) < new Date()) {
      return res.status(400).json({ message: "Verification code expired" });
    }

    // Check if user exists (prevent race condition)
    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { username }]
    });
    if (existingUser) {
      return res.status(409).json({
        message: "User already registered during verification process"
      });
    }

    // Create user ONLY after successful verification
    const newUser = await User.create({
      username,
      name,
      email: normalizedEmail,
      role: "user"
    });

    // Cleanup Redis data
    await redisClient.del(`signup:${normalizedEmail}`);

    // Generate tokens
    const { accessToken, refreshToken } = await authMiddleware.generateTokens(newUser);

    res.status(201).json({
      message: "Account activated successfully",
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error("Signup verification error:", error);
    res.status(500).json({
      message: "Verification failed",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  debugVerification,
  signup,
  login,
  verifyLoginCode,
  requestCode,
  verifySignup,
};
