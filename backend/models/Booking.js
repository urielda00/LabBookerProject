const mongoose = require("mongoose");
const ONE_WEEK_IN_SECONDS = 7 * 24 * 60 * 60;

const ROOM_TYPES = {
  LARGE_SEMINAR: "Large Seminar",
  SMALL_SEMINAR: "Small Seminar",
  OPEN: "Open",
  COMPUTER_LAB: "Computer Lab",
  STUDY_ROOM: "Study Room",
};

const bookingSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    roomType: {
    type: String,
    required: true,
    enum: Object.values(ROOM_TYPES),
  },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: String,
      required: true,
      validate: {
        validator: function (v) {
          return /^\d{4}-\d{2}-\d{2}$/.test(v);
        },
        message: (props) => `${props.value} is not a valid date format!`,
      },
    },
    startTime: {
      type: String,
      required: true,
      validate: {
        validator: function (v) {
          return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
        },
        message: (props) => `${props.value} is not a valid time format!`,
      },
    },
    endTime: {
      type: String,
      required: true,
      validate: {
        validator: function (v) {
          return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
        },
        message: (props) => `${props.value} is not a valid time format!`,
      },
    },
    status: {
      type: String,
      enum: [
        "Pending",
        "Confirmed",
        "Canceled",
        "Completed",
        "Active",
        "Missed",
      ],
      default: "Pending",
    },
    checkedIn: {
      type: Boolean,
      default: false,
    },
    checkedInAt: {
      type: Date,
    },
    additionalUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
      expires: ONE_WEEK_IN_SECONDS,
    },
    adminOverride: {
      type: Boolean,
      default: false,
    },
    overriddenBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    validateBeforeSave: true,
  },
);

// Existing pre-save validation hook
bookingSchema.pre("save", function (next) {
  // Validate start and end times
  const startTime = new Date(`1970-01-01T${this.startTime}:00`);
  const endTime = new Date(`1970-01-01T${this.endTime}:00`);

  if (endTime <= startTime) {
    return next(new Error("End time must be after start time"));
  }

  // Only validate that the booking date is in the future on creation.
  if (this.isNew) {
    const bookingDate = new Date(`${this.date}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (bookingDate < today) {
      return next(new Error("Booking date must be in the future"));
    }
  }

  next();
});

// Add static method to handle soft deletion
bookingSchema.statics.softDelete = async function (bookingId) {
  const booking = await this.findById(bookingId);
  if (!booking) {
    throw new Error("Booking not found");
  }

  const currentDate = new Date(); // Get current date/time
  booking.status = "Canceled";
  booking.isDeleted = true;
  booking.deletedAt = currentDate; // Use current date instead of booking date

  return booking.save();
};

// Make sure your TTL index is correctly set
bookingSchema.index(
  { deletedAt: 1 },
  { expireAfterSeconds: ONE_WEEK_IN_SECONDS },
);

module.exports = mongoose.model("Booking", bookingSchema);
