// controllers/bookingController.js
const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const TransferRequest = require("../models/TransferRequest");
const Room = require("../models/Room");
const User = require("../models/User");
const Config = require("../models/Config");
const nodemailer = require("nodemailer");
const notificationsController = require("../controllers/notificationsController");
const moment = require("moment-timezone");
const R = require("../utils/response");
const {
  sendAdminApprovalRequest,
  sendBookingConfirmation,
  sendPendingConfirmation,
} = require("../utils/emailService");

// Constants
const BOOKING_CONSTANTS = {
  STATUSES: {
    PENDING: "Pending",
    CONFIRMED: "Confirmed",
    CANCELED: "Canceled",
    COMPLETED: "Completed",
    ACTIVE: "Active",
    MISSED: "Missed",
  },
  MAX_DURATION: 3,
  MIN_DURATION: 0,
};

const ROOM_TYPES = {
  LARGE_SEMINAR: "Large Seminar",
  SMALL_SEMINAR: "Small Seminar",
  OPEN: "Open", // Considered as "Open"
  COMPUTER_LAB: "Computer Lab",
  STUDY_ROOM: "Study Room",
};

// Email configuration
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Add under existing constants
const LIMITS = {
  MAX_WEEKLY_BOOKINGS: 4,
  CANCELLATION_WARN_THRESHOLD: 3,
  CANCELLATION_BLOCK_THRESHOLD: 5,
  BLOCK_DURATION_DAYS: 7,
};

class BookingController {
  // Helper Methods
  static calculateDurationInHours(startTime, endTime) {
    const [startHour, startMinute] = startTime.split(":").map(Number);
    const [endHour, endMinute] = endTime.split(":").map(Number);
    return (endHour * 60 + endMinute - (startHour * 60 + startMinute)) / 60;
  }

  static isBookingPast(date, endTime) {
    const bookingDateTime = new Date(date);
    const [hours, minutes] = endTime.split(":").map(Number);
    bookingDateTime.setHours(hours, minutes, 0);
    return bookingDateTime < new Date();
  }

  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // GET /booking/:id
  getBookingById = async (req, res) => {
    try {
      const booking = await Booking.findById(req.params.id)
        .populate("roomId", "name type capacity description")
        .populate("userId", "username email")
        .populate("additionalUsers", "username email");
      if (!booking) {
        return R.send(req, res, 404, "booking.errors.notFound");
      }
      return R.send(req, res, 200, "booking.success.single", {}, { booking });
    } catch (error) {
      console.error("getBookingById - Error:", error);
      return R.send(req, res, 500, "booking.errors.fetchFailed");
    }
  };

  // GET /bookings
  getBookings = async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      const query = {};

      if (req.query.status) query.status = req.query.status;
      if (req.query.roomId) query.roomId = req.query.roomId;
      if (req.query.userId) query.userId = req.query.userId;
      if (req.query.startDate && req.query.endDate) {
        query.date = {
          $gte: new Date(req.query.startDate),
          $lte: new Date(req.query.endDate),
        };
      }

      const bookings = await Booking.find(query)
        .populate("roomId", "name type capacity description")
        .populate("userId", "username email")
        .populate("additionalUsers", "username email")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });
      const total = await Booking.countDocuments(query);

      return R.send(
        req,
        res,
        200,
        "booking.success.list",
        {},
        {
          bookings,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalBookings: total,
          },
        },
      );
    } catch (error) {
      console.error("getBookings - Error:", error);
      return R.send(req, res, 500, "booking.errors.fetchFailed");
    }
  };

  // controllers/bookingController.js  – inside class BookingController
  createBooking = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const {
        roomId,
        userId,
        date,
        startTime,
        endTime,
        additionalUsers = [],
      } = req.body;

      if (!roomId || !userId || !date || !startTime || !endTime) {
        await session.abortTransaction();
        session.endSession();
        return R.send(req, res, 400, "booking.errors.missingFields");
      }

      const user = await User.findById(userId).session(session);
      if (!user) {
        await session.abortTransaction();
        session.endSession();
        return R.send(req, res, 404, "booking.errors.userNotFound");
      }

      // Check if user is blocked
      if (
        user.cancellationStats?.blockedUntil &&
        user.cancellationStats.blockedUntil > new Date()
      ) {
        await session.abortTransaction();
        session.endSession();
        return R.send(req, res, 403, "booking.errors.blocked", {
          date: user.cancellationStats.blockedUntil.toLocaleDateString(),
        });
      }

      // Check for existing upcoming bookings
      const timezone = "Asia/Jerusalem";
      const today = moment().tz(timezone).format("YYYY-MM-DD");
      const currentTime = moment().tz(timezone).format("HH:mm");

      const existingUpcoming = await Booking.findOne({
        userId: userId,
        status: {
          $nin: [
            BOOKING_CONSTANTS.STATUSES.CANCELED,
            BOOKING_CONSTANTS.STATUSES.COMPLETED,
            BOOKING_CONSTANTS.STATUSES.MISSED,
          ],
        },
        $or: [
          { date: { $gt: today } },
          {
            date: today,
            endTime: { $gt: currentTime },
          },
        ],
      }).session(session);

      if (existingUpcoming) {
        await session.abortTransaction();
        session.endSession();
        return R.send(req, res, 400, "booking.errors.hasUpcoming");
      }

      // Calculate weekly bookings across all rooms
      const startOfWeek = moment()
        .tz("Asia/Jerusalem")
        .startOf("week")
        .toDate();
      const weeklyBookingsCount = await Booking.countDocuments({
        userId,
        createdAt: { $gte: startOfWeek },
        status: { $ne: BOOKING_CONSTANTS.STATUSES.CANCELED },
      }).session(session);

      if (weeklyBookingsCount >= LIMITS.MAX_WEEKLY_BOOKINGS) {
        await session.abortTransaction();
        session.endSession();
        return R.send(req, res, 400, "booking.errors.weeklyLimit");
      }

      const room = await Room.findById(roomId).session(session);
      if (!room) {
        await session.abortTransaction();
        session.endSession();
        return R.send(req, res, 404, "booking.errors.roomNotFound");
      }

      // Check per-room type weekly limit
      const roomTypeLimits = {
        [ROOM_TYPES.OPEN]: 3,
        [ROOM_TYPES.SMALL_SEMINAR]: 2,
        [ROOM_TYPES.LARGE_SEMINAR]: 1,
      };

      const roomTypeLimit = roomTypeLimits[room.type];
      if (roomTypeLimit !== undefined) {
        const roomTypeBookingsCount = await Booking.countDocuments({
          userId: userId,
          createdAt: { $gte: startOfWeek },
          status: { $ne: BOOKING_CONSTANTS.STATUSES.CANCELED },
          roomType: room.type,
        }).session(session);

        if (roomTypeBookingsCount >= roomTypeLimit) {
          await session.abortTransaction();
          session.endSession();
          return R.send(req, res, 400, "booking.errors.roomTypeLimit", {
            type: req.t(`roomTypes.${room.type}`),
          });
        }
      }

      // Format date for comparison
      const [year, day, month] = date.split("-");
      const formattedDate = `${year}-${month}-${day}`;
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
        await session.abortTransaction();
        session.endSession();
        return R.send(req, res, 400, "booking.errors.timeFormat");
      }

      const [startHour, startMinute] = startTime.split(":").map(Number);
      const [endHour, endMinute] = endTime.split(":").map(Number);
      const bookingDateTime = new Date(formattedDate);
      bookingDateTime.setHours(startHour, startMinute, 0);
      const currentDateTime = new Date();

      if (bookingDateTime < currentDateTime) {
        await session.abortTransaction();
        session.endSession();
        return R.send(req, res, 400, "booking.errors.pastDate");
      }

      if (startHour < 8 || endHour > 22) {
        await session.abortTransaction();
        session.endSession();
        return R.send(req, res, 400, "booking.errors.outOfHours");
      }

      const thirtyMinutesFromNow = new Date(
        currentDateTime.getTime() + 30 * 60000,
      );
      if (bookingDateTime < thirtyMinutesFromNow) {
        await session.abortTransaction();
        session.endSession();
        return R.send(req, res, 400, "booking.errors.minAdvance");
      }

      const invalidEmails = additionalUsers.filter(
        (email) => !BookingController.validateEmail(email),
      );
      if (invalidEmails.length > 0) {
        await session.abortTransaction();
        session.endSession();
        return R.send(
          req,
          res,
          400,
          "booking.errors.invalidEmail",
          {},
          { invalidEmails },
        );
      }

      let additionalUserIds = [];
      if (additionalUsers.length > 0) {
        const users = await User.find({
          email: { $in: additionalUsers },
        })
          .select("_id")
          .session(session);

        additionalUserIds = users.map((user) => user._id);

        if (additionalUserIds.length !== additionalUsers.length) {
          await session.abortTransaction();
          session.endSession();
          return R.send(
            req,
            res,
            400,
            "booking.errors.notFoundAdditionalEmail",
            {
              missingEmails: additionalUsers.filter(
                (e) => !users.some((u) => u.email === e),
              ),
            },
          );
        }
      }

      const duration = BookingController.calculateDurationInHours(
        startTime,
        endTime,
      );
      if (
        duration <= BOOKING_CONSTANTS.MIN_DURATION ||
        duration > BOOKING_CONSTANTS.MAX_DURATION
      ) {
        await session.abortTransaction();
        session.endSession();
        return R.send(req, res, 400, "booking.errors.duration", {
          min: BOOKING_CONSTANTS.MIN_DURATION,
          max: BOOKING_CONSTANTS.MAX_DURATION,
        });
      }

      const conflictingBooking = await Booking.findOne({
        roomId,
        date,
        status: { $ne: BOOKING_CONSTANTS.STATUSES.CANCELED },
        $or: [{ startTime: { $lt: endTime }, endTime: { $gt: startTime } }],
      }).session(session);

      if (conflictingBooking) {
        await session.abortTransaction();
        session.endSession();
        return R.send(req, res, 400, "booking.errors.slotTaken");
      }

      const bookingStatus =
        room.type === ROOM_TYPES.LARGE_SEMINAR
          ? BOOKING_CONSTANTS.STATUSES.PENDING
          : BOOKING_CONSTANTS.STATUSES.CONFIRMED;

      const booking = new Booking({
        roomId,
        userId,
        date,
        startTime,
        endTime,
        additionalUsers: additionalUserIds,
        status: bookingStatus,
        roomType: room.type,
      });

      await booking.save({ session });

      const bookingDetails = {
        roomName: room.name,
        date: date,
        startTime: startTime,
        endTime: endTime,
        id: booking._id,
      };

      const userDetails = {
        name: user.username,
        email: user.email,
      };

      if (room.type === ROOM_TYPES.LARGE_SEMINAR) {
        await sendPendingConfirmation(
          user.email,
          user.username,
          bookingDetails,
        );
        await sendAdminApprovalRequest(bookingDetails, userDetails);
      } else {
        await sendBookingConfirmation(
          user.email,
          user.username,
          bookingDetails,
        );
      }

      try {
        const notifyKey =
          room.type === ROOM_TYPES.LARGE_SEMINAR
            ? "booking.notify.createdLarge"
            : room.type === ROOM_TYPES.OPEN ||
                room.type === ROOM_TYPES.SMALL_SEMINAR
              ? "booking.notify.createdOpen"
              : "booking.notify.createdGeneric";

        await notificationsController.createNotification(
          user._id, // user
          notifyKey, // key
          { room: room.name }, // params
          "bookingCreation", // type
        );
      } catch (notificationError) {
        console.error(
          "Booking creation notification error:",
          notificationError.message,
        );
      }

      const populatedBooking = await Booking.findById(booking._id)
        .populate("roomId", "name type capacity description")
        .populate("userId", "username email")
        .populate("additionalUsers", "username email");

      await session.commitTransaction();
      session.endSession();

      return R.send(
        req,
        res,
        201,
        bookingStatus === BOOKING_CONSTANTS.STATUSES.PENDING
          ? "booking.success.pendingApproval"
          : "booking.success.created",
        {},
        {
          booking: populatedBooking,
          weeklyBookingsRemaining:
            LIMITS.MAX_WEEKLY_BOOKINGS - (weeklyBookingsCount + 1),
        },
      );
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error("createBooking - Error:", error);
      return R.send(req, res, 500, "booking.errors.createFailed");
    }
  };

  // GET /bookings/by-room/:roomName
  getAllBookingsByRoomName = async (req, res) => {
    try {
      const { roomName } = req.params;
      const room = await Room.findOne({ name: roomName }).select("_id");
      if (!room) {
        return R.send(req, res, 404, "booking.errors.roomNotFoundByName", {
          room: roomName,
        });
      }
      const bookings = await Booking.find({ roomId: room._id })
        .populate("roomId", "name type capacity description")
        .populate("userId", "username email")
        .populate("additionalUsers", "username email")
        .sort({ date: -1, startTime: -1 });
      return R.send(
        req,
        res,
        200,
        "booking.success.list",
        {},
        { bookings, count: bookings.length },
      );
    } catch (error) {
      console.error("getAllBookingsByRoomName - Error:", error);
      return R.send(req, res, 500, "booking.errors.fetchFailed");
    }
  };

  // GET /my-bookings
  getMyBooking = async (req, res) => {
    try {
      const userId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      const bookings = await Booking.find({
        $or: [{ userId }, { additionalUsers: userId }],
      })
        .populate("roomId", "name type capacity")
        .populate("userId", "username email")
        .populate("additionalUsers", "username email")
        .sort({ date: -1, startTime: -1 })
        .skip(skip)
        .limit(limit);
      const total = await Booking.countDocuments({
        $or: [{ userId }, { additionalUsers: userId }],
      });
      return R.send(
        req,
        res,
        200,
        "booking.success.list",
        {},
        {
          bookings,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalBookings: total,
          },
        },
      );
    } catch (error) {
      console.error("getMyBooking - Error:", error);
      return R.send(req, res, 500, "booking.errors.fetchFailed");
    }
  };

  // DELETE /booking/:id
  deleteBooking = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const booking = await Booking.findById(req.params.id).session(session);
      if (!booking) {
        await session.abortTransaction();
        session.endSession();
        return R.send(req, res, 404, "booking.errors.notFound");
      }

      const room = await Room.findById(booking.roomId).session(session);
      if (!room) {
        await session.abortTransaction();
        session.endSession();
        return R.send(req, res, 404, "booking.errors.roomNotFound");
      }

      const user = await User.findById(booking.userId).session(session);
      if (!user) {
        await session.abortTransaction();
        session.endSession();
        return R.send(req, res, 404, "booking.errors.userNotFound");
      }

      if (req.user) {
        if (
          booking.userId.toString() !== req.user.id &&
          req.user.role !== "admin"
        ) {
          await session.abortTransaction();
          session.endSession();
          return R.send(req, res, 403, "booking.errors.notAuthorized");
        }
      }

      if (booking.status.toLowerCase() === "active") {
        await session.abortTransaction();
        session.endSession();
        return R.send(req, res, 403, "booking.errors.activeCannotCancel");
      }

      if (booking.status !== "Canceled") {
        await this.updateCancellationStats(booking.userId, session);
      }

      const currentDate = new Date();
      booking.status = "Canceled";
      booking.isDeleted = true;
      booking.deletedAt = currentDate;
      await booking.save({ session });

      try {
        await notificationsController.createNotification(
          booking.userId, // recipient
          "booking.notify.deleted", // i18next key
          { room: room.name }, // interpolation params
          "bookingDeletion", // notification type
        );
      } catch (err) {
        console.error("Booking deletion notification error:", err.message);
      }

      const updatedBooking = await Booking.findById(booking._id)
        .populate("roomId", "name type capacity description")
        .populate("userId", "username email")
        .populate("additionalUsers", "username email");

      await session.commitTransaction();
      session.endSession();

      return R.send(
        req,
        res,
        200,
        "booking.success.deleted",
        {},
        { booking: updatedBooking },
      );
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error("deleteBooking - Error:", {
        error: error.message,
        stack: error.stack,
        bookingId: req.params.id,
        user: req.user,
      });
      return R.send(req, res, 500, "booking.errors.deleteFailed");
    }
  };

  // PATCH /booking/:id/status/by-username?username=john_doe (Admin update)
  updateBookingStatusByUsername = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { id } = req.params;
      const { status } = req.body;
      const { username } = req.query;
      const validStatuses = Object.values(BOOKING_CONSTANTS.STATUSES);

      if (!validStatuses.includes(status)) {
        await session.abortTransaction();
        session.endSession();
        return R.send(req, res, 400, "booking.errors.invalidStatus", {
          validStatuses,
        });
      }

      if (!username) {
        await session.abortTransaction();
        session.endSession();
        return R.send(req, res, 400, "booking.errors.missingUsernameParam");
      }

      const user = await User.findOne({ username }).session(session);
      if (!user) {
        await session.abortTransaction();
        session.endSession();
        return R.send(req, res, 404, "booking.errors.userNotFoundByUsername", {
          username,
        });
      }

      const booking = await Booking.findOne({
        _id: id,
        $or: [{ userId: user._id }, { additionalUsers: user._id }],
      }).session(session);

      if (!booking) {
        await session.abortTransaction();
        session.endSession();
        return R.send(
          req,
          res,
          404,
          "booking.errors.bookingNotFoundOrUnauthorized",
        );
      }

      const room = await Room.findById(booking.roomId).session(session);
      if (!room) {
        await session.abortTransaction();
        session.endSession();
        return R.send(req, res, 404, "booking.errors.roomNotFound");
      }

      // Admin override: Skip cancellation stats update
      if (req.user?.role !== "admin") {
        if (["Canceled", "Missed"].includes(status)) {
          await this.updateCancellationStats(user._id, session);
        }
      }

      if (["Canceled", "Missed", "Completed"].includes(status)) {
        booking.isDeleted = true;
        booking.deletedAt = new Date();
      }

      booking.status = status;
      await booking.save({ session });

      const bookingDetails = {
        roomName: room.name,
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.endTime,
        id: booking._id,
      };

      if (booking.status === "Confirmed") {
        await sendBookingConfirmation(
          user.email,
          user.username,
          bookingDetails,
        );
      }

      try {
        await notificationsController.createNotification(
          req.user._id, // admin
          "booking.notify.statusUpdatedAdmin", // 🔑 i18next key
          {
            user: user.username,
            status: status,
          },
          "bookingUpdateAdmin", // 📂 semantic type
        );
      } catch (err) {
        console.error("Admin notification error:", err.message);
      }

      try {
        await notificationsController.createNotification(
          user._id, // owner
          "booking.notify.statusUpdatedUser", // 🔑 i18next key
          {
            room: room.name,
            status: status,
            admin: req.user.username,
          },
          "bookingUpdateUser", // 📂 semantic type
        );
      } catch (err) {
        console.error("User notification error:", err.message);
      }

      await session.commitTransaction();
      session.endSession();

      return R.send(
        req,
        res,
        200,
        "booking.success.statusUpdated",
        { status, username },
        { booking },
      );
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error("updateBookingStatusByUsername - Error:", error);
      return R.send(req, res, 500, "booking.errors.statusUpdateFailed");
    }
  };

  // DELETE /booking/:id/by-username?username=john_doe (Admin deletion)
  deleteBookingByUsername = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { id } = req.params;
      const { username } = req.query;

      if (!username) {
        await session.abortTransaction();
        session.endSession();
        return R.send(req, res, 400, "booking.errors.missingUsernameParam");
      }

      const user = await User.findOne({ username }).session(session);
      if (!user) {
        await session.abortTransaction();
        session.endSession();
        return R.send(req, res, 404, "booking.errors.userNotFoundByUsername", {
          username,
        });
      }

      const booking = await Booking.findOne({
        _id: id,
        $or: [{ userId: user._id }, { additionalUsers: user._id }],
      }).session(session);

      if (!booking) {
        await session.abortTransaction();
        session.endSession();
        return R.send(req, res, 404, "booking.errors.bookingNotFoundForUser");
      }

      const room = await Room.findById(booking.roomId).session(session);
      if (!room) {
        await session.abortTransaction();
        session.endSession();
        return R.send(req, res, 404, "booking.errors.roomNotFound");
      }

      // Admin override: Skip active booking check and cancellation stats
      if (req.user?.role !== "admin") {
        if (booking.status.toLowerCase() === "active") {
          await session.abortTransaction();
          session.endSession();
          return R.send(req, res, 403, "booking.errors.activeCancel");
        }

        if (booking.status !== "Canceled") {
          await this.updateCancellationStats(user._id, session);
        }
      }

      const currentDate = new Date();
      booking.status = "Canceled";
      booking.isDeleted = true;
      booking.deletedAt = currentDate;
      await booking.save({ session });

      try {
        await notificationsController.createNotification(
          req.user._id, // admin
          "booking.notify.adminCanceled", // 🔑 i18next key
          {
            user: user.username,
            room: room.name,
          },
          "adminCancellation", // 📂 type
        );
      } catch (notificationError) {
        console.error("Admin notification error:", notificationError.message);
      }

      try {
        await notificationsController.createNotification(
          user._id, // affected user
          "booking.notify.userCanceledByAdmin", // 🔑 i18next key
          {
            room: room.name,
            admin: req.user.username,
          },
          "userCancellation", // 📂 type
        );
      } catch (notificationError) {
        console.error("User notification error:", notificationError.message);
      }

      const updatedBooking = await Booking.findById(booking._id)
        .populate("roomId", "name type capacity description")
        .populate("userId", "username email")
        .populate("additionalUsers", "username email");

      await session.commitTransaction();
      session.endSession();

      return R.send(
        req,
        res,
        200,
        "booking.success.adminCancellation",
        { username },
        { booking: updatedBooking },
      );
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error("deleteBookingByUsername - Error:", error);
      return R.send(req, res, 500, "booking.errors.adminCancelFailed");
    }
  };

  // GET /bookings/count
  getBookingCounts = async (req, res) => {
    try {
      const query = {};
      if (req.query.roomId) query.roomId = req.query.roomId;
      if (req.query.userId) query.userId = req.query.userId;
      const [total, pending, confirmed, canceled, missed] = await Promise.all([
        Booking.countDocuments(query),
        Booking.countDocuments({
          ...query,
          status: BOOKING_CONSTANTS.STATUSES.PENDING,
        }),
        Booking.countDocuments({
          ...query,
          status: BOOKING_CONSTANTS.STATUSES.CONFIRMED,
        }),
        Booking.countDocuments({
          ...query,
          status: BOOKING_CONSTANTS.STATUSES.CANCELED,
        }),
        Booking.countDocuments({
          ...query,
          status: BOOKING_CONSTANTS.STATUSES.MISSED,
        }),
      ]);
      return R.send(
        req,
        res,
        200,
        "booking.success.countsFetched",
        {},
        { counts: { total, pending, confirmed, canceled, missed } },
      );
    } catch (error) {
      console.error("getBookingCounts - Error:", error);
      return R.send(req, res, 500, "booking.errors.fetchCountsFailed");
    }
  };

  // GET /bookings/upcoming/:username
  getUserUpcomingBookings = async (req, res) => {
    try {
      const { username } = req.params;
      const user = await User.findOne({ username }).select("_id");
      if (!user) {
        return R.send(req, res, 404, "booking.errors.userNotFoundByUsername", {
          username,
        });
      }
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      const todayStr = `${yyyy}-${mm}-${dd}`;
      let allPotentiallyUpcoming = await Booking.find({
        $or: [{ userId: user._id }, { additionalUsers: user._id }],
        date: { $gte: todayStr },
        status: { $ne: BOOKING_CONSTANTS.STATUSES.CANCELED },
      })
        .populate("roomId", "name type capacity description")
        .populate("userId", "username email")
        .populate("additionalUsers", "username email")
        .sort({ date: 1, startTime: 1 });
      const nowReal = new Date();
      const finalUpcoming = allPotentiallyUpcoming.filter((booking) => {
        if (booking.date > todayStr) return true;
        if (booking.date === todayStr) {
          const [endH, endM] = booking.endTime.split(":").map(Number);
          const bookingEnd = new Date();
          bookingEnd.setHours(endH, endM, 0, 0);
          return bookingEnd > nowReal;
        }
        return false;
      });
      return R.send(
        req,
        res,
        200,
        "booking.success.upcomingFetched",
        {},
        { bookings: finalUpcoming },
      );
    } catch (error) {
      console.error("getUserUpcomingBookingsByUsername - Error:", error);
      return R.send(req, res, 500, "booking.errors.fetchUpcomingFailed");
    }
  };

  createBookingByNames = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const {
        username,
        roomName,
        date,
        startTime,
        endTime,
        additionalUsers = [],
      } = req.body;

      if (!username || !roomName || !date || !startTime || !endTime) {
        await session.abortTransaction();
        session.endSession();
        return R.send(req, res, 400, "booking.errors.missingFieldsNames");
      }

      const user = await User.findOne({ username }).session(session);
      if (!user) {
        await session.abortTransaction();
        session.endSession();
        return R.send(req, res, 404, "booking.errors.userNotFoundByUsername", {
          username,
        });
      }

      // Admin override: Skip blocked user check
      if (req.user?.role !== "admin") {
        if (
          user.cancellationStats?.blockedUntil &&
          user.cancellationStats.blockedUntil > new Date()
        ) {
          await session.abortTransaction();
          session.endSession();
          return R.send(req, res, 403, "booking.errors.blocked", {
            date: user.cancellationStats.blockedUntil.toLocaleDateString(),
          });
        }
      }

      const room = await Room.findOne({ name: roomName }).session(session);
      if (!room) {
        await session.abortTransaction();
        session.endSession();
        return R.send(req, res, 404, "booking.errors.roomNotFoundByName", {
          room: roomName,
        });
      }

      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        await session.abortTransaction();
        session.endSession();
        return R.send(req, res, 400, "booking.errors.invalidDateFormat");
      }

      // Validate time format
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
        await session.abortTransaction();
        session.endSession();
        return R.send(req, res, 400, "booking.errors.timeFormat");
      }

      const bookingDate = new Date(date);
      const [startHour, startMinute] = startTime.split(":").map(Number);
      const [endHour, endMinute] = endTime.split(":").map(Number);
      const bookingStart = new Date(bookingDate);
      bookingStart.setHours(startHour, startMinute, 0, 0);
      const bookingEnd = new Date(bookingDate);
      bookingEnd.setHours(endHour, endMinute, 0, 0);
      const now = new Date();

      if (bookingEnd < now) {
        await session.abortTransaction();
        session.endSession();
        return R.send(req, res, 400, "booking.errors.pastDate");
      }

      const earliestAllowed = new Date(now.getTime() + 30 * 60000);
      if (bookingStart < earliestAllowed) {
        await session.abortTransaction();
        session.endSession();
        return R.send(req, res, 400, "booking.errors.minAdvance");
      }

      const invalidEmails = additionalUsers.filter(
        (email) => !BookingController.validateEmail(email),
      );
      if (invalidEmails.length > 0) {
        await session.abortTransaction();
        session.endSession();
        return R.send(req, res, 400, "booking.errors.invalidAdditionalEmail");
      }

      let additionalUserIds = [];
      if (additionalUsers.length > 0) {
        const users = await User.find({
          email: { $in: additionalUsers },
        })
          .select("_id")
          .session(session);

        additionalUserIds = users.map((user) => user._id);

        if (additionalUserIds.length !== additionalUsers.length) {
          const missingEmails = additionalUsers.filter(
            (email) => !users.some((u) => u.email === email),
          );
          await session.abortTransaction();
          session.endSession();
          return R.send(
            req,
            res,
            400,
            "booking.errors.notFoundAdditionalEmail",
          );
        }
      }

      // Admin override: Skip weekly limit check
      if (req.user?.role !== "admin") {
        const startOfWeek = moment()
          .tz("Asia/Jerusalem")
          .startOf("week")
          .toDate();
        const weeklyBookingsCount = await Booking.countDocuments({
          userId: user._id,
          createdAt: { $gte: startOfWeek },
          status: { $ne: BOOKING_CONSTANTS.STATUSES.CANCELED },
        }).session(session);

        if (weeklyBookingsCount >= LIMITS.MAX_WEEKLY_BOOKINGS) {
          await session.abortTransaction();
          session.endSession();
          return R.send(req, res, 400, "booking.errors.weeklyLimitByName");
        }
      }

      const duration = BookingController.calculateDurationInHours(
        startTime,
        endTime,
      );
      if (
        duration <= BOOKING_CONSTANTS.MIN_DURATION ||
        duration > BOOKING_CONSTANTS.MAX_DURATION
      ) {
        await session.abortTransaction();
        session.endSession();

        return R.send(req, res, 400, "booking.errors.duration", {
          min: BOOKING_CONSTANTS.MIN_DURATION,
          max: BOOKING_CONSTANTS.MAX_DURATION,
        });
      }

      const conflictingBooking = await Booking.findOne({
        roomId: room._id,
        date,
        status: { $ne: BOOKING_CONSTANTS.STATUSES.CANCELED },
        $or: [{ startTime: { $lt: endTime }, endTime: { $gt: startTime } }],
      }).session(session);

      if (conflictingBooking) {
        await session.abortTransaction();
        session.endSession();
        return R.send(
          req,
          res,
          409,
          "booking.errors.slotConflict",
          {},
          {
            conflictingBooking: {
              id: conflictingBooking._id,
              startTime: conflictingBooking.startTime,
              endTime: conflictingBooking.endTime,
            },
          },
        );
      }

      const bookingStatus =
        room.type === ROOM_TYPES.LARGE_SEMINAR
          ? BOOKING_CONSTANTS.STATUSES.PENDING
          : BOOKING_CONSTANTS.STATUSES.CONFIRMED;

      const booking = new Booking({
        roomId: room._id,
        userId: user._id,
        roomType: room.type,
        date,
        startTime,
        endTime,
        additionalUsers: additionalUserIds,
        status: bookingStatus,
        createdByAdmin: req.user?._id,
      });

      await booking.save({ session });

      /* ---------- user receives a notification ---------- */
      // 📩 Notify the user about their booking created by the admin
      await notificationsController.createNotification(
        user._id, // recipient (the user)

        // 🔑 i18next key (dynamic based on status)
        bookingStatus === BOOKING_CONSTANTS.STATUSES.PENDING
          ? "booking.notify.createdByAdminPending"
          : "booking.notify.createdByAdminConfirmed",

        // 🧩 translation parameters
        {
          room: room.name,
          admin: req.user?.username || "System",
        },

        // 📂 category/type
        "bookingCreatedByAdmin",
      );

      // 📩 Notify the admin that they created a booking
      await notificationsController.createNotification(
        req.user._id, // recipient (admin)
        "booking.notify.adminCreatedBooking", // 🔑 i18next key
        {
          user: user.username,
          room: room.name,
        },
        "adminBookingCreated", // 📂 type
      );

      const populatedBooking = await Booking.findById(booking._id)
        .populate("roomId", "name type capacity description")
        .populate("userId", "username email")
        .populate("additionalUsers", "username email")
        .session(session);

      await session.commitTransaction();
      session.endSession();

      return R.send(
        req,
        res,
        201,
        bookingStatus === BOOKING_CONSTANTS.STATUSES.PENDING
          ? "booking.success.createdPendingByAdmin"
          : "booking.success.createdConfirmedByAdmin",
        {},
        { booking: populatedBooking },
      );
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error("createBookingByNames - Error:", {
        error: error.message,
        stack: error.stack,
        inputData: req.body,
      });
      return R.send(req, res, 500, "booking.errors.createFailed");
    }
  };

  // GET /bookings/all-by-username/:username
  getAllBookingsByUsername = async (req, res) => {
    try {
      const { username } = req.params;
      const user = await User.findOne({ username }).select("_id");
      if (!user) {
        return R.send(req, res, 404, "booking.errors.userNotFoundByUsername", {
          username,
        });
      }
      const allBookings = await Booking.find({
        $or: [{ userId: user._id }, { additionalUsers: user._id }],
      })
        .populate("roomId", "name type capacity description")
        .populate("userId", "username email")
        .populate("additionalUsers", "username email")
        .sort({ date: -1, startTime: -1 });
      return R.send(
        req,
        res,
        200,
        "booking.success.allUserBookings",
        {},
        { bookings: allBookings },
      );
    } catch (error) {
      console.error("getAllBookingsByUsername - Error:", error);
      return R.send(req, res, 500, "booking.errors.fetchAllUserFailed");
    }
  };

  // these functions are used for the next booking card in the homepage along with the delete booking function located above.

  updateBookingStatus = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { id } = req.params;
      const { status } = req.body;

      const booking = await Booking.findById(id).session(session);
      if (!booking) {
        await session.abortTransaction();
        session.endSession();
        return R.send(req, res, 404, "booking.errors.notFound");
      }

      const room = await Room.findById(booking.roomId).session(session);
      if (!room) {
        await session.abortTransaction();
        session.endSession();
        return R.send(req, res, 404, "booking.errors.roomNotFound");
      }

      if (["Canceled", "Missed"].includes(status)) {
        await this.updateCancellationStats(booking.userId, session);
      }

      if (["Canceled", "Missed", "Completed"].includes(status)) {
        booking.isDeleted = true;
        booking.deletedAt = new Date();
      }

      booking.status = status;
      await booking.save({ session });

      let notificationKey;
      const notifyParams = { room: room.name };

      switch (status) {
        case "Missed":
          notificationKey = "booking.notify.missed";
          break;
        case "Completed":
          notificationKey = "booking.notify.completed";
          break;
        case "Canceled":
          notificationKey = "booking.notify.canceled";
          break;
        default:
          notificationKey = "booking.notify.statusUpdate";
      }

      if (notificationKey) {
        try {
          await notificationsController.createNotification(
            booking.userId, // user to notify
            notificationKey, // i18next key
            notifyParams, // translation params
            `booking${status}`, // type, e.g. bookingMissed, bookingCompleted
          );
        } catch (notifError) {
          console.error(
            "Failed to create status update notification:",
            notifError,
          );
        }
      }

      await session.commitTransaction();
      session.endSession();

      return R.send(
        req,
        res,
        200,
        "booking.success.statusUpdated",
        { status },
        { booking },
      );
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error("updateBookingStatus - Error:", error);
      return R.send(req, res, 500, "booking.errors.statusUpdateFailed");
    }
  };

  getNextUpcomingBooking = async (req, res) => {
    try {
      const userId = req.user.id;
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);

      const nextBooking = await Booking.findOne({
        $or: [{ userId }, { additionalUsers: userId }],
        status: {
          $nin: [
            BOOKING_CONSTANTS.STATUSES.CANCELED,
            BOOKING_CONSTANTS.STATUSES.COMPLETED,
            BOOKING_CONSTANTS.STATUSES.MISSED,
          ],
        },
        date: { $gte: todayStr },
      })
        .sort({ date: 1, startTime: 1 })
        .populate("roomId", "name type capacity description")
        .populate("userId", "username email");

      return R.send(
        req,
        res,
        200,
        nextBooking
          ? "booking.success.nextUpcomingFound"
          : "booking.success.noUpcoming",
        {},
        { booking: nextBooking },
      );
    } catch (error) {
      console.error("getNextUpcomingBooking - Error:", error);
      return R.send(req, res, 500, "booking.errors.fetchNextUpcomingFailed");
    }
  };

  checkInToBooking = async (req, res) => {
    try {
      const bookingId = req.params.id;
      const userId = req.user.id;

      // Find the booking
      const booking = await Booking.findById(bookingId)
        .populate("roomId", "name")
        .populate("userId", "username email");

      if (!booking) {
        return R.send(req, res, 404, "booking.errors.notFound");
      }

      // Verify user is authorized
      const isAuthorized =
        booking.userId._id.toString() === userId ||
        booking.additionalUsers.includes(userId);

      if (!isAuthorized) {
        return R.send(req, res, 403, "booking.errors.unauthorizedCheckIn");
      }

      // Check if booking is active
      const now = new Date();
      const bookingStart = new Date(`${booking.date}T${booking.startTime}:00`);
      const bookingEnd = new Date(`${booking.date}T${booking.endTime}:00`);

      if (now > bookingEnd) {
        return R.send(req, res, 400, "booking.errors.bookingEnded");
      }

      // Update booking status
      booking.status = BOOKING_CONSTANTS.STATUSES.ACTIVE;
      booking.checkedIn = true;
      booking.checkedInAt = now;
      await booking.save();

      // Create check-in notification
      try {
        await notificationsController.createNotification(
          booking.userId._id,
          "booking.notify.checkedIn", // 🗝 i18next key
          { room: booking.roomId.name }, // 🧩 i18next params
          "bookingCheckIn", // 📦 type
        );
      } catch (notificationError) {
        console.error(
          "Check-in notification error:",
          notificationError.message,
        );
      }

      return R.send(
        req,
        res,
        200,
        "booking.success.checkedIn",
        {},
        { booking },
      );
    } catch (error) {
      console.error("checkInToBooking - Error:", error);
      return R.send(req, res, 500, "booking.errors.checkInFailed");
    }
  };

  updatePastBookings = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const now = new Date();
      const bookingsToUpdate = await Booking.find({
        status: {
          $nin: [
            BOOKING_CONSTANTS.STATUSES.CANCELED,
            BOOKING_CONSTANTS.STATUSES.COMPLETED,
            BOOKING_CONSTANTS.STATUSES.MISSED,
          ],
        },
        date: { $lte: now.toISOString().split("T")[0] },
      }).session(session);

      let updatedCount = 0;
      for (const booking of bookingsToUpdate) {
        try {
          const bookingEnd = new Date(`${booking.date}T${booking.endTime}:00`);

          if (bookingEnd < now) {
            if (booking.checkedIn) {
              booking.status = BOOKING_CONSTANTS.STATUSES.COMPLETED;
            } else {
              booking.status = BOOKING_CONSTANTS.STATUSES.MISSED;
              await this.updateCancellationStats(booking.userId, session);
            }

            booking.isDeleted = true;
            booking.deletedAt = new Date();
            await booking.save({ session });

            try {
              await notificationsController.createNotification(
                booking.userId,
                "booking.notify.statusAutoUpdate", // 🗝 key
                {
                  room: booking.roomId.name,
                  status: booking.status,
                },
                `booking${booking.status}`, // 📦 type
              );
            } catch (notifError) {
              console.error("Notification error:", notifError);
            }

            updatedCount++;
          }
        } catch (bookingError) {
          console.error(
            `Error processing booking ${booking._id}:`,
            bookingError,
          );
        }
      }

      await session.commitTransaction();
      session.endSession();

      return R.send(
        req,
        res,
        200,
        "booking.success.pastUpdated",
        { count: updatedCount },
        {},
      );
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error("updatePastBookings - Error:", error);
      return R.send(req, res, 500, "booking.errors.pastUpdateFailed");
    }
  };

  updatePastBookingsCron = async () => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const timezone = "Asia/Jerusalem";
      const now = moment().tz(timezone);

      const bookingsToUpdate = await Booking.find({
        status: { $nin: ["Canceled", "Completed", "Missed"] },
        $expr: {
          $lte: [
            {
              $dateFromString: {
                dateString: { $concat: ["$date", "T", "$endTime", ":00"] },
                timezone: timezone,
              },
            },
            now.toDate(),
          ],
        },
      })
        .populate("roomId", "name")
        .populate("userId", "email")
        .session(session);

      let updatedCount = 0;

      for (const booking of bookingsToUpdate) {
        try {
          const bookingEnd = moment.tz(
            `${booking.date}T${booking.endTime}:00`,
            timezone,
          );

          if (now.isAfter(bookingEnd)) {
            let newStatus = booking.checkedIn ? "Completed" : "Missed";

            if (newStatus === "Missed") {
              await this.updateCancellationStats(booking.userId._id, session);
            }

            booking.status = newStatus;
            booking.isDeleted = true;
            booking.deletedAt = new Date();
            await booking.save({ session });

            await notificationsController.createNotification(
              booking.userId._id,
              "booking.notify.statusAutoUpdate", // 🗝 key
              {
                room: booking.roomId.name,
                status: newStatus,
              },
              `booking${newStatus}`, // 📦 type (e.g. bookingMissed, bookingCompleted)
            );

            updatedCount++;
          }
        } catch (bookingError) {
          console.error(
            `Error processing booking ${booking._id}:`,
            bookingError,
          );
        }
      }

      await session.commitTransaction();
      session.endSession();

      return {
        success: true,
        message: `Successfully updated ${updatedCount} booking(s)`,
        updatedCount,
      };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error("updatePastBookingsCron - Error:", error);
      return {
        success: false,
        message: "Failed to update past bookings",
        error: error.message,
      };
    }
  };

  async updateCancellationStats(userId, session) {
    const user = await User.findById(userId).session(session);
    const now = new Date();

    if (
      user.cancellationStats?.lastCancellation &&
      moment(now).diff(user.cancellationStats.lastCancellation, "days") >
        LIMITS.BLOCK_DURATION_DAYS
    ) {
      user.cancellationStats.countLast7Days = 0;
      user.cancellationStats.warnings = 0;
    }

    user.cancellationStats.countLast7Days =
      (user.cancellationStats.countLast7Days || 0) + 1;
    user.cancellationStats.lastCancellation = now;

    if (
      user.cancellationStats.countLast7Days >=
      LIMITS.CANCELLATION_BLOCK_THRESHOLD
    ) {
      user.cancellationStats.blockedUntil = moment()
        .add(LIMITS.BLOCK_DURATION_DAYS, "days")
        .toDate();
      await notificationsController.createNotification(
        user._id, // recipient
        "booking.notify.blocked", // key
        {}, // no params
        "accountBlocked", // type
      );
    } else if (
      user.cancellationStats.countLast7Days >=
      LIMITS.CANCELLATION_WARN_THRESHOLD
    ) {
      user.cancellationStats.warnings += 1;
      const remaining =
        LIMITS.CANCELLATION_BLOCK_THRESHOLD -
        user.cancellationStats.countLast7Days;

      await notificationsController.createNotification(
        user._id,
        "booking.notify.cancellationWarning", // key
        { remaining }, // params
        "cancellationWarning", // type
      );
    }

    await user.save({ session });
  }

  // In bookingController.js
  getWeeklyBookings = async (req, res) => {
    try {
      const timezone = "Asia/Jerusalem";
      const now = moment().tz(timezone);
      const todayStr = now.format("YYYY-MM-DD");
      const currentTime = now.format("HH:mm");

      const query = {
        $and: [
          {
            $or: [
              { date: { $gt: todayStr } },
              {
                date: todayStr,
                endTime: { $gt: currentTime },
              },
            ],
          },
          {
            status: {
              $in: [
                BOOKING_CONSTANTS.STATUSES.PENDING,
                BOOKING_CONSTANTS.STATUSES.CONFIRMED,
                BOOKING_CONSTANTS.STATUSES.ACTIVE,
              ],
            },
          },
        ],
      };

      if (req.query.roomId) {
        query.$and.push({
          roomId: new mongoose.Types.ObjectId(req.query.roomId),
        });
      }

      const bookings = await Booking.find(query)
        .populate("userId", "username email")
        .populate("additionalUsers", "username email")
        .populate("roomId", "name type capacity")
        .populate({
          path: "transferRequests",
          match: { status: "pending" },
          populate: [
            { path: "fromUser", select: "username email" },
            { path: "toUser", select: "username email" },
          ],
        })
        .sort({ date: 1, startTime: 1 });

      const dateRange = {
        start: todayStr,
        note: "Showing upcoming bookings (Pending, Confirmed, Active statuses)",
      };

      return R.send(
        req,
        res,
        200,
        "booking.success.weeklyFetched",
        {},
        { bookings, dateRange },
      );
    } catch (error) {
      console.error("getWeeklyBookings - Error:", error);
      return R.send(req, res, 500, "booking.errors.fetchWeeklyFailed");
    }
  };

  // Get transfer requests for a booking
  getTransferRequests = async (req, res) => {
    try {
      const requests = await TransferRequest.find({
        booking: req.params.id,
        status: "pending",
      })
        .populate("fromUser", "username email") // First populate the requester
        .populate("toUser", "username email"); // Then the booking owner

      return R.send(
        req,
        res,
        200,
        "booking.success.transferRequestsFetched",
        {},
        { requests },
      );
    } catch (error) {
      return R.send(
        req,
        res,
        500,
        "booking.errors.fetchTransferRequestsFailed",
      );
    }
  };

  createTransferRequest = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const booking = await Booking.findById(req.params.id)
        .populate("roomId")
        .session(session);

      if (!booking) {
        await session.abortTransaction();
        return R.send(req, res, 404, "booking.errors.notFound");
      }

      // Add this check after retrieving the booking
      if (["Pending", "Active"].includes(booking.status)) {
        await session.abortTransaction();
        return R.send(req, res, 400, "booking.errors.transferInvalidStatus");
      }

      // Get requesting user details
      const user = await User.findById(req.user.id).session(session);
      if (!user) {
        await session.abortTransaction();
        return R.send(req, res, 404, "booking.errors.userNotFound");
      }

      // 1. Check if user is blocked
      if (
        user.cancellationStats?.blockedUntil &&
        user.cancellationStats.blockedUntil > new Date()
      ) {
        await session.abortTransaction();
        return R.send(req, res, 403, "booking.errors.blocked", {
          date: user.cancellationStats.blockedUntil.toLocaleDateString(),
        });
      }

      // 2. Check booking validity
      const timezone = "Asia/Jerusalem";
      const today = moment().tz(timezone).format("YYYY-MM-DD");
      const currentTime = moment().tz(timezone).format("HH:mm");

      if (
        booking.date < today ||
        (booking.date === today && booking.endTime <= currentTime)
      ) {
        await session.abortTransaction();
        return R.send(req, res, 400, "booking.errors.transferExpired");
      }

      // 3. Check weekly limits
      const startOfWeek = moment().tz(timezone).startOf("week").toDate();

      // Existing weekly bookings count
      const weeklyCount = await Booking.countDocuments({
        userId: req.user.id,
        createdAt: { $gte: startOfWeek },
        status: { $ne: "Canceled" },
      }).session(session);

      if (weeklyCount >= LIMITS.MAX_WEEKLY_BOOKINGS) {
        await session.abortTransaction();
        return R.send(req, res, 400, "booking.errors.weeklyLimit");
      }

      const existingUpcoming = await Booking.findOne({
        userId: req.user.id,
        status: {
          $nin: [
            BOOKING_CONSTANTS.STATUSES.CANCELED,
            BOOKING_CONSTANTS.STATUSES.COMPLETED,
            BOOKING_CONSTANTS.STATUSES.MISSED,
          ],
        },
        $or: [
          { date: { $gt: today } },
          {
            date: today,
            endTime: { $gt: currentTime },
          },
        ],
      }).session(session);

      if (existingUpcoming) {
        await session.abortTransaction();
        session.endSession();
        return R.send(req, res, 400, "booking.errors.noTransferOwnBooking");
      }

      // 4. Check room-type limits
      const roomTypeLimits = {
        [ROOM_TYPES.OPEN]: 3,
        [ROOM_TYPES.SMALL_SEMINAR]: 2,
        [ROOM_TYPES.LARGE_SEMINAR]: 1,
      };

      const roomTypeLimit = roomTypeLimits[booking.roomId.type];
      if (roomTypeLimit) {
        const typeCount = await Booking.countDocuments({
          userId: req.user.id,
          roomType: booking.roomId.type,
          createdAt: { $gte: startOfWeek },
          status: { $ne: "Canceled" },
        }).session(session);

        if (typeCount >= roomTypeLimit) {
          await session.abortTransaction();
          return R.send(req, res, 400, "booking.errors.roomTypeLimit", {
            type: req.t(`roomTypes.${booking.roomId.type}`),
          });
        }
      }

      // Existing request checks
      if (booking.userId.toString() === req.user.id) {
        await session.abortTransaction();
        return R.send(req, res, 400, "booking.errors.transferOwnBooking");
      }

      const existingRequest = await TransferRequest.findOne({
        booking: req.params.id,
        fromUser: req.user.id,
        status: { $in: ["pending", "declined"] },
      }).session(session);

      if (existingRequest) {
        const messageKey =
          existingRequest.status === "pending"
            ? "booking.errors.transferPendingExists"
            : "booking.errors.transferAlreadyDeclined";
        await session.abortTransaction();
        return R.send(req, res, 400, messageKey);
      }

      // Create the request
      const request = new TransferRequest({
        booking: req.params.id,
        fromUser: req.user.id,
        toUser: booking.userId,
        message: req.body.message,
        expiresAt: booking.deletedAt || new Date(Date.now() + 604800000),
      });

      await request.save({ session });

      // Update booking's transfer requests
      await Booking.findByIdAndUpdate(
        req.params.id,
        { $push: { transferRequests: request._id } },
        { session },
      );

      // Notification
      await notificationsController.createNotification(
        booking.userId, // recipient
        "booking.notify.transferRequestReceived", // i18next key
        { room: booking.roomId.name }, // parameters for interpolation
        "transferRequest", // notification type
      );

      await session.commitTransaction();
      return R.send(
        req,
        res,
        201,
        "booking.success.transferCreated",
        {},
        { request },
      );
    } catch (error) {
      await session.abortTransaction();
      return R.send(req, res, 500, "booking.errors.transferCreateFailed");
    } finally {
      session.endSession();
    }
  };

  // Accept transfer request
  acceptTransferRequest = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const request = await TransferRequest.findById(req.params.id)
        .populate("fromUser", "username")
        .populate("toUser", "username")
        .populate({
          path: "booking",
          populate: { path: "roomId", select: "name" },
        })
        .session(session);

      if (!request) {
        await session.abortTransaction();
        return R.send(req, res, 404, "booking.errors.transferNotFound");
      }

      // In createTransferRequest controller
      const existingRequest = await TransferRequest.findOne({
        booking: req.params.id,
        fromUser: req.user.id,
        status: { $in: ["pending", "declined"] },
      });

      if (existingRequest) {
        const messageKey =
          existingRequest.status === "pending"
            ? "booking.errors.transferPendingExists"
            : "booking.errors.transferAlreadyDeclined";
        await session.abortTransaction();
        return R.send(req, res, 400, messageKey);
      }

      // Transfer booking to requester (fromUser)
      const booking = await Booking.findByIdAndUpdate(
        request.booking._id,
        { userId: request.fromUser._id },
        { new: true, session },
      );

      request.status = "accepted";
      await request.save({ session });

      await notificationsController.createNotification(
        request.fromUser._id,
        "booking.notify.transferAccepted", // key
        { room: request.booking.roomId.name }, // params
        "transferAccepted", // type
      );

      // ↓ Notification for the user who received the booking
      await notificationsController.createNotification(
        request.toUser._id,
        "booking.notify.transferCompleted", // key
        {
          room: request.booking.roomId.name,
          user: request.fromUser.username,
        },
        "bookingTransferred", // type
      );

      await session.commitTransaction();
      return R.send(
        req,
        res,
        200,
        "booking.success.transferAccepted",
        {},
        { booking },
      );
    } catch (error) {
      await session.abortTransaction();
      return R.send(req, res, 500, "booking.errors.transferAcceptFailed");
    } finally {
      session.endSession();
    }
  };

  // Decline transfer request
  declineTransferRequest = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const request = await TransferRequest.findByIdAndUpdate(
        req.params.id,
        { status: "declined" },
        { new: true, session },
      ).populate("fromUser toUser", "username");

      if (!request) {
        await session.abortTransaction();
        return R.send(req, res, 404, "booking.errors.transferNotFound");
      }

      await notificationsController.createNotification(
        request.fromUser._id,
        "booking.notify.transferDeclined", // i18next key
        { user: request.toUser.username }, // interpolation parameters
        "transferDeclined", // semantic type
        session, // optional session if supported
      );

      await session.commitTransaction();
      return R.send(
        req,
        res,
        200,
        "booking.success.transferDeclined",
        {},
        { request },
      );
    } catch (error) {
      await session.abortTransaction();
      return R.send(req, res, 500, "booking.errors.transferDeclineFailed");
    } finally {
      session.endSession();
    }
  };

  checkDeclinedRequest = async (req, res) => {
    try {
      const request = await TransferRequest.findOne({
        booking: req.params.id,
        fromUser: req.query.userId,
        status: "declined",
      });
      return R.send(req, res, 200, "", {}, { exists: !!request });
    } catch (error) {
      return R.send(req, res, 500, "booking.errors.transferCheckFailed");
    }
  };
}

module.exports = new BookingController();
