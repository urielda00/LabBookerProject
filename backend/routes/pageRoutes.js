// routes/pageRoutes.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const pageController = require("../controllers/pageController");

// Public read access with caching headers
router.get("/:slug", 
  (req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  },
  pageController.getPage
);

// Protected update endpoint
router.put("/:slug",
  authMiddleware.requireAuth, // Verify authentication first
  authMiddleware.requireRole("admin"), // Then verify role
  (req, res, next) => {
    // Validate content type before processing
    if (!req.is("application/json")) {
      return res.status(415).json({ message: "Unsupported Media Type" });
    }
    next();
  },
  pageController.updatePage
);

module.exports = router;