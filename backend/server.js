const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

//Moe added this
require("./utils/cron");

// Verbose logging for route imports
const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/authRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const roomRoutes = require("./routes/roomsRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const configRoutes = require("./routes/configRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const notificationsRoutes = require("./routes/notificationsRoutes");
const healthRoutes = require("./routes/healthRoutes");
const issueRoutes = require("./routes/issueRoutes");
const pageRoutes = require("./routes/pageRoutes");
const contactRoutes = require("./routes/contactRoutes");
const faqRoutes = require("./routes/faqRoutes");
console.log("[IMPORT] Route imports completed");

// Debugging function for route registration
function debugRouteRegistration(app, path, routes) {
  try {
    console.log(`[ROUTE] Registering routes for path: ${path}`);
    // Log the methods available in the routes
    if (routes && typeof routes === "function") {
      console.log(`[ROUTE] Routes type: function`);
    } else if (routes && typeof routes === "object") {
      console.log(`[ROUTE] Routes methods:`, Object.keys(routes));
    } else {
      console.warn(
        `[ROUTE] Unexpected routes type for ${path}:`,
        typeof routes,
      );
    }
    app.use(path, routes);
    console.log(`[ROUTE] Successfully registered routes for path: ${path}`);
  } catch (error) {
    console.error(`[ROUTE] Error registering routes for path ${path}:`, error);
  }
}

const app = express();

// Extensive Logging Middleware
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  const originalEnd = res.end;
  res.end = function (chunk, encoding) {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.url} - ${
        res.statusCode
      } (${duration}ms)`,
    );
    originalEnd.call(this, chunk, encoding);
  };

  next();
});

// Middleware
app.use(
  cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],

    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["X-System-Health", "X-Response-Time"],
    credentials: true,
  }),
);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }),
);

app.use(express.json());
app.use(morgan("dev"));

// Rate Limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many login attempts, please try again later",
});
app.use("/api/auth/", authLimiter);

// Add after existing rate limit configuration
const healthLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // Limit each IP to 60 requests per minute
  message: "Too many health check requests",
});

app.use("/api/health", healthLimiter);

// Database Connection and TTL Index Setup
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("✅ MongoDB Connected Successfully!");

    // Setup TTL index for bookings (your existing code)
    try {
      const Booking = require("./models/Booking");
      const ONE_WEEK_IN_SECONDS = 7 * 24 * 60 * 60; // 259200 seconds

      // Remove existing index if it exists
      try {
        await Booking.collection.dropIndex("deletedAt_1");
        console.log("✅ Existing TTL index dropped successfully");
      } catch (error) {
        console.log("ℹ️ No existing TTL index to drop");
      }

      // Create new TTL index for bookings
      await Booking.collection.createIndex(
        { deletedAt: 1 },
        { expireAfterSeconds: ONE_WEEK_IN_SECONDS },
      );
      console.log(
        "✅ TTL index for Bookings created successfully (7 days expiration)",
      );
    } catch (error) {
      console.error("❌ Error setting up TTL index for Bookings:", error);
    }

    // Setup TTL index for notifications
    try {
      const Notification = require("./models/Notification");
      const THREE_DAYS_IN_SECONDS = 3 * 24 * 60 * 60; // 259200 seconds

      // Drop existing index on readAt if it exists (the index name is usually 'readAt_1')
      try {
        await Notification.collection.dropIndex("readAt_1");
        console.log("✅ Existing Notification TTL index dropped successfully");
      } catch (error) {
        console.log("ℹ️ No existing Notification TTL index to drop");
      }

      // Create a TTL index on the readAt field so that once a notification is marked as read,
      // it will be automatically removed after 3 days.
      await Notification.collection.createIndex(
        { readAt: 1 },
        { expireAfterSeconds: THREE_DAYS_IN_SECONDS },
      );
      console.log(
        "✅ Notification TTL index created successfully (3 days expiration)",
      );
    } catch (error) {
      console.error("❌ Error setting up Notification TTL index:", error);
    }
    // Setup TTL index for HealthChecks
    try {
      const HealthCheck = require("./models/HealthCheck");
      const THIRTY_DAYS_IN_SECONDS = 30 * 24 * 60 * 60; // 2592000 seconds

      // Drop existing TTL index on timestamp if it exists (index name is typically 'timestamp_1')
      try {
        await HealthCheck.collection.dropIndex("timestamp_1");
        console.log("✅ Existing HealthCheck TTL index dropped successfully");
      } catch (error) {
        console.log("ℹ️ No existing TTL index for HealthCheck to drop");
      }

      // Create TTL index for HealthCheck documents
      await HealthCheck.collection.createIndex(
        { timestamp: 1 },
        { expireAfterSeconds: THIRTY_DAYS_IN_SECONDS },
      );
      console.log(
        "✅ TTL index for HealthCheck created successfully (30 days expiration)",
      );
    } catch (error) {
      console.error("❌ Error setting up TTL index for HealthCheck:", error);
    }
  })
  .catch((err) => {
    console.error("❌ MongoDB Connection Failed:", err.message);
    process.exit(1);
  });

// Routes
app.get("/", (req, res) => {
  res.send("Backend is running!");
});

app.get("/health", async (req, res) => {
  try {
    await mongoose.connection.db.command({ ping: 1 });
    res.status(200).json({ message: "Server is healthy!" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Database connection issue", error: error.message });
  }
});

// Detailed Route Registration with Debugging
try {
  console.log("[ROUTE] Attempting to register routes");

  // Verify each route before registration
  const routesToRegister = [
    { path: "/api/user", routes: userRoutes },
    { path: "/api/auth", routes: authRoutes },
    { path: "/api/settings", routes: settingsRoutes },
    { path: "/api/room", routes: roomRoutes },
    { path: "/api/book", routes: bookingRoutes },
    { path: "/api/upload", routes: uploadRoutes },
    { path: "/api/config", routes: configRoutes },
    { path: "/api/dashboard", routes: dashboardRoutes },
    { path: "/api/notifications", routes: notificationsRoutes },
    { path: "/api/health", routes: healthRoutes },
    { path: "/api/issues", routes: issueRoutes },
    { path: "/api/pages", routes: pageRoutes },
    { path: "/api/contact", routes: contactRoutes },
    { path: "/api/faq", routes: faqRoutes },
  ];

  routesToRegister.forEach(({ path, routes }) => {
    debugRouteRegistration(app, path, routes);
  });

  console.log("[ROUTE] All routes registered successfully");
} catch (error) {
  console.error("[ROUTE] Critical error registering routes:", error);
}

// Specific Booking Routes Debugging
console.log(
  "[DEBUG] Booking Routes Content:",
  require("./routes/bookingRoutes"),
);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err);

  const statusCode = err.status || 500;
  const errorResponse = {
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && {
      stack: err.stack,
      details: err.toString(),
    }),
  };

  res.status(statusCode).json(errorResponse);
});

// Add this with your other middleware
app.use((req, res, next) => {
  res.set("X-Response-Time", `${Date.now() - req.startTime}ms`);
  next();
});

// Graceful Shutdown
process.on("SIGINT", async () => {
  console.log("Received SIGINT. Closing server and database connection...");

  try {
    await mongoose.connection.close(false);
    process.exit(0);
  } catch (err) {
    console.error("Error during graceful shutdown:", err);
    process.exit(1);
  }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log("[SERVER] Startup Complete");
});

module.exports = app;
