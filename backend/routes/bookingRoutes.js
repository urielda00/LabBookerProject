// routes/bookingRoutes.js
const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");
const authMiddleware = require("../middleware/authMiddleware");

// // Debugging middleware
// const debugMiddleware = (req, res, next) => {
//   console.log(`[DEBUG] Route called: ${req.method} ${req.path}`);
//   next();
// };

// Routes
// Route to get the next upcoming booking for the logged-in user
router.get(
  "/booking/next",
  authMiddleware.requireAuth,
  bookingController.getNextUpcomingBooking,
);

// router.get("/booking/missed", authMiddleware.requireAuth, bookingController.getMissedBooking);

// 2. System Maintenance Routes
router.get(
  "/booking/update-past",
  authMiddleware.requireAuth,
  bookingController.updatePastBookings,
);

router.get("/bookings", bookingController.getBookings);
router.get('/weekly', bookingController.getWeeklyBookings);
// routes/bookingRoutes.js
router.get('/:id/transfer-requests', authMiddleware.requireAuth, bookingController.getTransferRequests);
router.post('/:id/transfer-request', authMiddleware.requireAuth, bookingController.createTransferRequest);
router.patch('/transfer-requests/:id/accept', authMiddleware.requireAuth, bookingController.acceptTransferRequest);
router.patch('/transfer-requests/:id/decline', authMiddleware.requireAuth, bookingController.declineTransferRequest);
router.get("/booking/:id", bookingController.getBookingById);
router.post("/booking", bookingController.createBooking);
router.get(
  "/my-bookings",
  authMiddleware.requireAuth,
  bookingController.getMyBooking,
);
router.patch(
  "/booking/:id/status",
  authMiddleware.requireAuth,
  bookingController.updateBookingStatus,
);
router.delete("/booking/:id", bookingController.deleteBooking);
router.get("/bookings/count", bookingController.getBookingCounts);

// moe added these three routes for testing
router.get(
  "/bookings/upcoming/:username",
  bookingController.getUserUpcomingBookings,
);

// PATCH /booking/:id/status/by-username?username=john_doe
router.patch(
  "/booking/:id/status/by-username",
  authMiddleware.requireAuth,
  bookingController.updateBookingStatusByUsername,
);

router.delete(
  "/booking/:id/by-username",
  authMiddleware.requireAuth,
  bookingController.deleteBookingByUsername,
);

// e.g. GET /bookings/all-by-username/:username
router.get(
  "/bookings/all-by-username/:username",
  bookingController.getAllBookingsByUsername,
);

// e.g. POST /api/book/booking/by-names
router.post(
  "/booking/create-by-names",
  authMiddleware.requireAuth,
  bookingController.createBookingByNames,
);

// to delete bookings using room name
router.get(
  "/bookings/by-room/:roomName",
  bookingController.getAllBookingsByRoomName,
);

router.post(
  "/booking/:id/check-in",
  authMiddleware.requireAuth,
  bookingController.checkInToBooking,
);

// router.post("/booking/:id/late-check-in", authMiddleware.requireAuth, bookingController.lateCheckIn);

module.exports = router;
