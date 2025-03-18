// const mongoose = require('mongoose');

// const configSchema = new mongoose.Schema(
//   {
//     booking: {
//       openDaysBefore: { type: Number, default: 3, min: 0 },
//       slotDurationHours: { type: Number, required: true, min: 1, max: 24 },
//       maxBookingsPerWeek: { type: Number, default: 2, min: 1 },
//       minBookingTimeBeforeHours: { type: Number, default: 2, min: 0 },
//     },
//     cancellation: {
//       minCancellationTimeBeforeMinutes: { type: Number, default: 30, min: 0 },
//     },
//     penalty: {
//       maxMissedBookingsPerMonth: { type: Number, default: 2, min: 0 },
//       blockDurationWeeks: { type: Number, default: 2, min: 0 },
//     },
//   },
//   {
//     timestamps: true,
//     strict: true, // Prevents extra fields
//   }
// );

// // Ensure there's only one document
// configSchema.pre('save', async function (next) {
//   const existingConfig = await this.constructor.findOne();
//   if (existingConfig && existingConfig._id.toString() !== this._id.toString()) {
//     throw new Error('Only one configuration document is allowed.');
//   }
//   next();
// });

// module.exports = mongoose.model('Config', configSchema);
