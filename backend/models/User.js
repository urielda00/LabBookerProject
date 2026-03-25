const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    name: { type: String, default: "" },
    profilePicture: { type: String, default: null },
    role: {
      type: String,
      enum: ["user", "admin", "manager", "root"],
      default: "user",
    },
    // removed verificationCode and verificationExpires as they moved to Redis
    emailChangeRequest: {
      newEmail: { type: String, default: null },
    },
    cancellationStats: {
      countLast7Days: { type: Number, default: 0 },
      lastCancellation: Date,
      warnings: { type: Number, default: 0 },
      blockedUntil: Date,
    },
  },
  { timestamps: true },
);

userSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("User", userSchema);