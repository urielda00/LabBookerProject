// controllers/bookingController.js
const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Room = require("../models/Room");
const User = require("../models/User");
const Config = require("../models/Config");
const nodemailer = require("nodemailer");
const notificationsController = require("../controllers/notificationsController");
const moment = require("moment-timezone");
const { sendAdminApprovalRequest, sendBookingConfirmation, sendPendingConfirmation } = require("../utils/emailService");


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
        return res
          .status(404)
          .json({ success: false, message: "Booking not found" });
      }
      res.status(200).json({ success: true, booking });
    } catch (error) {
      console.error("getBookingById - Error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch booking",
        error: error.message,
      });
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

      res.status(200).json({
        success: true,
        bookings,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalBookings: total,
        },
      });
    } catch (error) {
      console.error("getBookings - Error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch bookings",
        error: error.message,
      });
    }
  };

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
        return res.status(400).json({
          success: false,
          message: "Missing required booking fields",
        });
      }

      const user = await User.findById(userId).session(session);
      if (!user) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Check if user is blocked
      if (
        user.cancellationStats?.blockedUntil &&
        user.cancellationStats.blockedUntil > new Date()
      ) {
        await session.abortTransaction();
        session.endSession();
        return res.status(403).json({
          success: false,
          message: `Account temporarily blocked from new bookings until ${user.cancellationStats.blockedUntil.toLocaleDateString()}`,
        });
      }

      // Check for existing upcoming bookings
const timezone = 'Asia/Jerusalem';
const today = moment().tz(timezone).format('YYYY-MM-DD');
const currentTime = moment().tz(timezone).format('HH:mm');

const existingUpcoming = await Booking.findOne({
  userId: userId,
  status: { 
    $nin: [
      BOOKING_CONSTANTS.STATUSES.CANCELED,
      BOOKING_CONSTANTS.STATUSES.COMPLETED,
      BOOKING_CONSTANTS.STATUSES.MISSED
    ]
  },
  $or: [
    { date: { $gt: today } },
    { 
      date: today,
      endTime: { $gt: currentTime }
    }
  ]
}).session(session);

if (existingUpcoming) {
  await session.abortTransaction();
  session.endSession();
  return res.status(400).json({
    success: false,
    message: "You already have an upcoming booking. Please complete it before creating a new one.",
  });
}

      // Calculate weekly bookings across all rooms
      const startOfWeek = moment().tz('Asia/Jerusalem').startOf('week').toDate();
      const weeklyBookingsCount = await Booking.countDocuments({
        userId,
        createdAt: { $gte: startOfWeek },
        status: { $ne: BOOKING_CONSTANTS.STATUSES.CANCELED },
      }).session(session);

      if (weeklyBookingsCount >= LIMITS.MAX_WEEKLY_BOOKINGS) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message:
            "Weekly booking limit reached. Maximum 4 bookings per week allowed.",
        });
      }

      const room = await Room.findById(roomId).session(session);
      if (!room) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({
          success: false,
          message: "Room not found",
        });
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
    return res.status(400).json({
      success: false,
      message: `Weekly limit for ${room.type} rooms reached. Maximum ${roomTypeLimit} bookings allowed per week.`,
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
        return res.status(400).json({
          success: false,
          message: "Invalid time format. Please use HH:mm format",
        });
      }

      const [startHour, startMinute] = startTime.split(":").map(Number);
      const [endHour, endMinute] = endTime.split(":").map(Number);
      const bookingDateTime = new Date(formattedDate);
      bookingDateTime.setHours(startHour, startMinute, 0);
      const currentDateTime = new Date();

      if (bookingDateTime < currentDateTime) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: "Cannot book for past date and time",
        });
      }

      if (startHour < 8 || endHour > 22) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: "Bookings are only available between 9 AM and 6 PM",
        });
      }

      const thirtyMinutesFromNow = new Date(
        currentDateTime.getTime() + 30 * 60000,
      );
      if (bookingDateTime < thirtyMinutesFromNow) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: "Bookings must be made at least 30 minutes in advance",
        });
      }

      const invalidEmails = additionalUsers.filter(
        (email) => !BookingController.validateEmail(email),
      );
      if (invalidEmails.length > 0) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: "Invalid email format",
          invalidEmails,
        });
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
          return res.status(400).json({
            success: false,
            message: "One or more additional users were not found",
          });
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
        return res.status(400).json({
          success: false,
          message: `Invalid booking duration. Must be between ${BOOKING_CONSTANTS.MIN_DURATION} and ${BOOKING_CONSTANTS.MAX_DURATION} hours`,
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
        return res.status(400).json({
          success: false,
          message: "Time slot is already booked",
        });
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
        id: booking._id
      };
      
      const userDetails = {
        name: user.username,
        email: user.email
      };
      
      if (room.type === ROOM_TYPES.LARGE_SEMINAR) {
        await sendPendingConfirmation(user.email, user.username, bookingDetails);
        await sendAdminApprovalRequest(bookingDetails, userDetails);
      } else {
        await sendBookingConfirmation(user.email, user.username, bookingDetails);
      }

      try {
        let message;
        if (room.type === "Open" || room.type === "Small Seminar") {
          message = `Your booking for room ${room.name} has been created and confirmed successfully.`;
        } else if (room.type === "Large Seminar") {
          message = `Your booking for room ${room.name} has been created and is pending admin approval.`;
        } else {
          message = `Your booking for room ${room.name} has been created successfully.`;
        }
        await notificationsController.createNotification(
          user._id,
          message,
          "bookingCreation",
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

      res.status(201).json({
        success: true,
        message:
          bookingStatus === BOOKING_CONSTANTS.STATUSES.PENDING
            ? "Booking created and pending admin approval"
            : "Booking created successfully",
        booking: populatedBooking,
        weeklyBookingsRemaining:
          LIMITS.MAX_WEEKLY_BOOKINGS - (weeklyBookingsCount + 1),
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error("createBooking - Error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create booking",
        error: error.message,
      });
    }
  };

  // GET /bookings/by-room/:roomName
  getAllBookingsByRoomName = async (req, res) => {
    try {
      const { roomName } = req.params;
      const room = await Room.findOne({ name: roomName }).select("_id");
      if (!room) {
        return res.status(404).json({
          success: false,
          message: `No room found with name: ${roomName}`,
        });
      }
      const allBookings = await Booking.find({ roomId: room._id })
        .populate("roomId", "name type capacity description")
        .populate("userId", "username email")
        .populate("additionalUsers", "username email")
        .sort({ date: -1, startTime: -1 });
      res.status(200).json({
        success: true,
        bookings: allBookings,
        count: allBookings.length,
      });
    } catch (error) {
      console.error("getAllBookingsByRoomName - Error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch bookings for this room",
        error: error.message,
      });
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
      res.status(200).json({
        success: true,
        bookings,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalBookings: total,
        },
      });
    } catch (error) {
      console.error("getMyBooking - Error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch your bookings",
        error: error.message,
      });
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
        return res.status(404).json({
          success: false,
          message: "Booking not found",
        });
      }

      const room = await Room.findById(booking.roomId).session(session);
      if (!room) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({
          success: false,
          message: "Room not found",
        });
      }

      const user = await User.findById(booking.userId).session(session);
      if (!user) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      if (req.user) {
        if (
          booking.userId.toString() !== req.user.id &&
          req.user.role !== "admin"
        ) {
          await session.abortTransaction();
          session.endSession();
          return res.status(403).json({
            success: false,
            message: "Not authorized to delete this booking",
          });
        }
      }

      if (booking.status.toLowerCase() === "active") {
        await session.abortTransaction();
        session.endSession();
        return res.status(403).json({
          success: false,
          message: "Active bookings cannot be canceled",
        });
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
          booking.userId,
          `Your booking for room ${room.name} has been cancelled successfully.`,
          "bookingDeletion",
        );
      } catch (notificationError) {
        console.error(
          "Booking deletion notification error:",
          notificationError.message,
        );
      }

      const updatedBooking = await Booking.findById(booking._id)
        .populate("roomId", "name type capacity description")
        .populate("userId", "username email")
        .populate("additionalUsers", "username email");

      await session.commitTransaction();
      session.endSession();

      res.status(200).json({
        success: true,
        message:
          "Booking cancelled successfully and will be permanently deleted in 3 days",
        booking: updatedBooking,
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error("deleteBooking - Error:", {
        error: error.message,
        stack: error.stack,
        bookingId: req.params.id,
        user: req.user,
      });
      res.status(500).json({
        success: false,
        message: "Failed to delete booking",
        error: error.message,
      });
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
        return res.status(400).json({
          success: false,
          message: "Invalid status",
          validStatuses,
        });
      }

      if (!username) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: "Missing query param ?username=",
        });
      }

      const user = await User.findOne({ username }).session(session);
      if (!user) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({
          success: false,
          message: `No user found with username: ${username}`,
        });
      }

      const booking = await Booking.findOne({
        _id: id,
        $or: [{ userId: user._id }, { additionalUsers: user._id }],
      }).session(session);

      if (!booking) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({
          success: false,
          message: "Booking not found or unauthorized for this username",
        });
      }

      const room = await Room.findById(booking.roomId).session(session);
      if (!room) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({
          success: false,
          message: "Room not found",
        });
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
        id: booking._id
      };
      
      if (booking.status === "Confirmed") {
      
        await sendBookingConfirmation(user.email, user.username, bookingDetails);
      }

      try {
        await notificationsController.createNotification(
          req.user._id,
          `You updated booking status for ${user.username} to ${status}.`,
          "bookingUpdateAdmin",
        );
      } catch (notificationError) {
        console.error("Admin notification error:", notificationError.message);
      }

      try {
        let userMsg = `Your booking for ${room.name} was updated to ${status} by admin.`;
        await notificationsController.createNotification(
          user._id,
          userMsg,
          "bookingUpdateUser",
        );
      } catch (notificationError) {
        console.error("User notification error:", notificationError.message);
      }

      await session.commitTransaction();
      session.endSession();

      res.status(200).json({
        success: true,
        message: "Booking status updated successfully",
        booking,
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error("updateBookingStatusByUsername - Error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update booking status",
        error: error.message,
      });
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
        return res.status(400).json({
          success: false,
          message: "Missing query param ?username=",
        });
      }

      const user = await User.findOne({ username }).session(session);
      if (!user) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({
          success: false,
          message: `No user found with username: ${username}`,
        });
      }

      const booking = await Booking.findOne({
        _id: id,
        $or: [{ userId: user._id }, { additionalUsers: user._id }],
      }).session(session);

      if (!booking) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({
          success: false,
          message: "Booking not found for this user",
        });
      }

      const room = await Room.findById(booking.roomId).session(session);
      if (!room) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({
          success: false,
          message: "Room not found",
        });
      }

      // Admin override: Skip active booking check and cancellation stats
      if (req.user?.role !== "admin") {
        if (booking.status.toLowerCase() === "active") {
          await session.abortTransaction();
          session.endSession();
          return res.status(403).json({
            success: false,
            message: "Active bookings cannot be canceled",
          });
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
          req.user._id,
          `Canceled booking for ${user.username} in ${room.name}`,
          "adminCancellation",
        );
      } catch (notificationError) {
        console.error("Admin notification error:", notificationError.message);
      }

      try {
        await notificationsController.createNotification(
          user._id,
          `Your booking for ${room.name} was canceled by admin`,
          "userCancellation",
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

      res.status(200).json({
        success: true,
        message: "Admin cancellation successful",
        booking: updatedBooking,
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error("deleteBookingByUsername - Error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to cancel booking",
        error: error.message,
      });
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
      res.status(200).json({
        success: true,
        counts: { total, pending, confirmed, canceled, missed },
      });
    } catch (error) {
      console.error("getBookingCounts - Error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch booking counts",
        error: error.message,
      });
    }
  };

  // GET /bookings/upcoming/:username
  getUserUpcomingBookings = async (req, res) => {
    try {
      const { username } = req.params;
      const user = await User.findOne({ username }).select("_id");
      if (!user) {
        return res.status(404).json({
          success: false,
          message: `No user found with username: ${username}`,
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
      res.status(200).json({ success: true, bookings: finalUpcoming });
    } catch (error) {
      console.error("getUserUpcomingBookingsByUsername - Error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch upcoming bookings by username",
        error: error.message,
      });
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
        return res.status(400).json({
          success: false,
          message:
            "Missing required fields (username, roomName, date, startTime, endTime).",
        });
      }

      const user = await User.findOne({ username }).session(session);
      if (!user) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({
          success: false,
          message: `No user found with username: ${username}`,
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
          return res.status(403).json({
            success: false,
            message: `User account blocked until ${user.cancellationStats.blockedUntil.toLocaleDateString()}`,
          });
        }
      }

      const room = await Room.findOne({ name: roomName }).session(session);
      if (!room) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({
          success: false,
          message: `No room found with name: ${roomName}`,
        });
      }

      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: "Invalid date format. Please use YYYY-MM-DD format",
        });
      }

      // Validate time format
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: "Invalid time format. Please use HH:mm format",
        });
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
        return res.status(400).json({
          success: false,
          message: "Cannot create booking for past time slots",
        });
      }

      const earliestAllowed = new Date(now.getTime() + 30 * 60000);
      if (bookingStart < earliestAllowed) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: "Bookings must be made at least 30 minutes in advance",
        });
      }

      const invalidEmails = additionalUsers.filter(
        (email) => !BookingController.validateEmail(email),
      );
      if (invalidEmails.length > 0) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: "Invalid email format in additional users",
          invalidEmails,
        });
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
          return res.status(400).json({
            success: false,
            message: "Some additional users not found",
            missingEmails,
          });
        }
      }

      // Admin override: Skip weekly limit check
      if (req.user?.role !== "admin") {
        const startOfWeek = moment().tz('Asia/Jerusalem').startOf('week').toDate();
        const weeklyBookingsCount = await Booking.countDocuments({
          userId: user._id,
          createdAt: { $gte: startOfWeek },
          status: { $ne: BOOKING_CONSTANTS.STATUSES.CANCELED },
        }).session(session);

        if (weeklyBookingsCount >= LIMITS.MAX_WEEKLY_BOOKINGS) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({
            success: false,
            message: "User has reached the weekly booking limit (4 bookings)",
          });
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
        return res.status(400).json({
          success: false,
          message: `Invalid booking duration (${duration}h). Must be between ${BOOKING_CONSTANTS.MIN_DURATION} and ${BOOKING_CONSTANTS.MAX_DURATION} hours`,
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
        return res.status(409).json({
          success: false,
          message: "Time slot conflicts with existing booking",
          conflictingBooking: {
            id: conflictingBooking._id,
            startTime: conflictingBooking.startTime,
            endTime: conflictingBooking.endTime,
          },
        });
      }

      const bookingStatus =
        room.type === ROOM_TYPES.LARGE_SEMINAR
          ? BOOKING_CONSTANTS.STATUSES.PENDING
          : BOOKING_CONSTANTS.STATUSES.CONFIRMED;

      const booking = new Booking({
        roomId: room._id,
        userId: user._id,
        date,
        startTime,
        endTime,
        additionalUsers: additionalUserIds,
        status: bookingStatus,
        createdByAdmin: req.user?._id,
      });

      await booking.save({ session });

      try {
        const userMessage =
          bookingStatus === BOOKING_CONSTANTS.STATUSES.PENDING
            ? `Admin ${req.user?.username} created a pending booking for you in ${room.name}`
            : `Admin ${req.user?.username} created a confirmed booking for you in ${room.name}`;

        await notificationsController.createNotification(
          user._id,
          userMessage,
          "bookingCreatedByAdmin",
        );
      } catch (notificationError) {
        console.error("User notification failed:", notificationError.message);
      }

      try {
        await notificationsController.createNotification(
          req.user._id,
          `Successfully created booking for ${user.username} in ${room.name}`,
          "adminBookingCreated",
        );
      } catch (notificationError) {
        console.error("Admin notification failed:", notificationError.message);
      }

      const populatedBooking = await Booking.findById(booking._id)
        .populate("roomId", "name type capacity description")
        .populate("userId", "username email")
        .populate("additionalUsers", "username email")
        .session(session);

      await session.commitTransaction();
      session.endSession();

      res.status(201).json({
        success: true,
        message: `Admin booking created successfully (${bookingStatus.toLowerCase()})`,
        booking: populatedBooking,
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error("createBookingByNames - Error:", {
        error: error.message,
        stack: error.stack,
        inputData: req.body,
      });
      res.status(500).json({
        success: false,
        message: "Failed to create booking",
        error: error.message,
      });
    }
  };

  // GET /bookings/all-by-username/:username
  getAllBookingsByUsername = async (req, res) => {
    try {
      const { username } = req.params;
      const user = await User.findOne({ username }).select("_id");
      if (!user) {
        return res.status(404).json({
          success: false,
          message: `No user found with username: ${username}`,
        });
      }
      const allBookings = await Booking.find({
        $or: [{ userId: user._id }, { additionalUsers: user._id }],
      })
        .populate("roomId", "name type capacity description")
        .populate("userId", "username email")
        .populate("additionalUsers", "username email")
        .sort({ date: -1, startTime: -1 });
      res.status(200).json({ success: true, bookings: allBookings });
    } catch (error) {
      console.error("getAllBookingsByUsername - Error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch all bookings by username",
        error: error.message,
      });
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
        return res.status(404).json({
          success: false,
          message: "Booking not found",
        });
      }

      const room = await Room.findById(booking.roomId).session(session);
      if (!room) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({
          success: false,
          message: "Room not found",
        });
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

      let notificationMessage;
      if (status === "Missed") {
        notificationMessage = `Your booking for room ${room.name} has been marked as missed.`;
      } else if (status === "Completed") {
        notificationMessage = `Your booking for room ${room.name} has been completed.`;
      } else if (status === "Canceled") {
        notificationMessage = `Your booking for room ${room.name} has been canceled.`;
      }

      if (notificationMessage) {
        try {
          await notificationsController.createNotification(
            booking.userId,
            notificationMessage,
            `booking${status}`,
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

      return res.status(200).json({
        success: true,
        message: `Booking status updated to ${status}`,
        booking,
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error("updateBookingStatus - Error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to update booking status",
        error: error.message,
      });
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

      return res.status(200).json({
        success: true,
        booking: nextBooking, // Will be null if no upcoming bookings
      });
    } catch (error) {
      console.error("getNextUpcomingBooking - Error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch next upcoming booking",
        error: error.message,
      });
    }
  };

  // lateCheckIn = async (req, res) => {
  //   try {
  //     const bookingId = req.params.id;
  //     const { wasPresent } = req.body;

  //     const booking = await Booking.findById(bookingId)
  //       .populate('roomId', 'name')
  //       .populate('userId', 'username email');

  //     if (!booking) {
  //       return res.status(404).json({
  //         success: false,
  //         message: "Booking not found"
  //       });
  //     }

  //     // Update booking status based on presence
  //     booking.status = wasPresent ? 'Completed' : 'Missed';
  //     if (wasPresent) {
  //       booking.checkedIn = true;
  //       booking.checkedInAt = new Date(`${booking.date}T${booking.startTime}`);
  //     }

  //     await booking.save();

  //     // Create notification with appropriate message
  //     const notificationMessage = wasPresent
  //       ? `Booking for room ${booking.roomId.name} has been marked as completed.`
  //       : `Booking for room ${booking.roomId.name} has been marked as missed.`;

  //     try {
  //       await notificationsController.createNotification(
  //         booking.userId._id,
  //         notificationMessage,
  //         wasPresent ? "bookingCompleted" : "bookingMissed"
  //       );
  //     } catch (notificationError) {
  //       console.error("Notification error:", notificationError.message);
  //     }

  //     return res.status(200).json({
  //       success: true,
  //       message: wasPresent ? "Booking marked as completed" : "Booking marked as missed",
  //       booking
  //     });

  //   } catch (error) {
  //     console.error("lateCheckIn - Error:", error);
  //     return res.status(500).json({
  //       success: false,
  //       message: "Failed to process late check-in",
  //       error: error.message
  //     });
  //   }
  // };

  checkInToBooking = async (req, res) => {
    try {
      const bookingId = req.params.id;
      const userId = req.user.id;

      // Find the booking
      const booking = await Booking.findById(bookingId)
        .populate("roomId", "name")
        .populate("userId", "username email");

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Booking not found",
        });
      }

      // Verify user is authorized
      const isAuthorized =
        booking.userId._id.toString() === userId ||
        booking.additionalUsers.includes(userId);

      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to check in to this booking",
        });
      }

      // Check if booking is active
      const now = new Date();
      const bookingStart = new Date(`${booking.date}T${booking.startTime}:00`);
      const bookingEnd = new Date(`${booking.date}T${booking.endTime}:00`);

      // If trying to check in more than 15 minutes after start time
      // if (now > new Date(bookingStart.getTime() + 15 * 60000)) {
      //   booking.status = BOOKING_CONSTANTS.STATUSES.MISSED;
      //   await booking.save();

      //   // Create missed booking notification
      //   try {
      //     await notificationsController.createNotification(
      //       booking.userId._id,
      //       `You missed your booking for room ${booking.roomId.name}. The booking has been marked as missed.`,
      //       "bookingMissed"
      //     );
      //   } catch (notificationError) {
      //     console.error("Missed booking notification error:", notificationError.message);
      //   }

      //   return res.status(400).json({
      //     success: false,
      //     message: "Booking has been marked as missed due to late check-in"
      //   });
      // }

      if (now > bookingEnd) {
        return res.status(400).json({
          success: false,
          message: "Booking has already ended",
        });
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
          `Successfully checked in to room ${booking.roomId.name}.`,
          "bookingCheckIn",
        );
      } catch (notificationError) {
        console.error(
          "Check-in notification error:",
          notificationError.message,
        );
      }

      res.status(200).json({
        success: true,
        message: "Successfully checked in to booking",
        booking,
      });
    } catch (error) {
      console.error("checkInToBooking - Error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to check in to booking",
        error: error.message,
      });
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
                `Your booking for ${booking.roomId.name} has been automatically marked as ${booking.status}.`,
                `booking${booking.status}`,
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

      return res.status(200).json({
        success: true,
        message: `${updatedCount} booking(s) updated`,
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error("updatePastBookings - Error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to update past bookings",
        error: error.message,
      });
    }
  };

  // getMissedBooking = async (req, res) => {
  //   try {
  //     const userId = req.user.id;
  //     const now = new Date();

  //     // Find the most recent booking that should be marked as missed
  //     const missedBooking = await Booking.findOne({
  //       $or: [
  //         { userId },
  //       ],
  //       userId: userId,
  //       date: { $lte: now.toISOString().split('T')[0] },
  //       status: { $nin: ['Completed', 'Canceled', 'Missed'] },
  //       checkedIn: false,
  //       endTime: { $lt: now.toLocaleTimeString('en-US', { hour12: false }) }
  //     })
  //     .populate('roomId', 'name')
  //     .sort({ date: -1, endTime: -1 })
  //     .limit(1);

  //     return res.status(200).json({
  //       success: true,
  //       booking: missedBooking
  //     });
  //   } catch (error) {
  //     console.error("getMissedBooking - Error:", error);
  //     return res.status(500).json({
  //       success: false,
  //       message: "Failed to fetch missed booking",
  //       error: error.message
  //     });
  //   }
  // };

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
              `Your booking for ${booking.roomId.name} has been automatically marked as ${newStatus}.`,
              `booking${newStatus}`,
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
        user._id,
        `Your account has been temporarily blocked from bookings due to excessive cancellations/misses.`,
        "accountBlocked",
      );
    } else if (
      user.cancellationStats.countLast7Days >=
      LIMITS.CANCELLATION_WARN_THRESHOLD
    ) {
      user.cancellationStats.warnings += 1;
      await notificationsController.createNotification(
        user._id,
        `Warning: ${LIMITS.CANCELLATION_BLOCK_THRESHOLD - user.cancellationStats.countLast7Days} more cancellations/misses will result in a block.`,
        "cancellationWarning",
      );
    }

    await user.save({ session });
  }
}

module.exports = new BookingController();
