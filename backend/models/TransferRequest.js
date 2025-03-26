// models/TransferRequest.js
const mongoose = require("mongoose");

const transferRequestSchema = new mongoose.Schema({
  booking: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Booking", 
    required: true,
    index: true // Add an index for faster lookups
  },
  fromUser: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  toUser: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  message: { type: String, required: true },
  status: { 
    type: String, 
    enum: ["pending", "accepted", "declined"],
    default: "pending"
  },
  createdAt: { type: Date, default: Date.now, expires: '7d' },
},
{
  timestamps: true,
});

// Add a pre-remove hook to clean up references in Booking
transferRequestSchema.pre('remove', async function(next) {
  try {
    // Remove reference from the associated booking
    await mongoose.model('Booking').updateOne(
      { _id: this.booking },
      { $pull: { transferRequests: this._id } }
    );
    next();
  } catch (error) {
    next(error);
  }
});

transferRequestSchema.statics.cleanupOrphanedRequests = async function() {
  try {
    const Booking = mongoose.model('Booking');

    // Find orphaned requests
    const orphanedRequests = await this.aggregate([
      {
        $lookup: {
          from: 'bookings', // Ensure this matches your bookings collection name
          localField: 'booking',
          foreignField: '_id',
          as: 'bookingExists'
        }
      },
      {
        $match: {
          bookingExists: { $size: 0 } // Bookings that don't exist
        }
      }
    ]);

    if (orphanedRequests.length > 0) {
      const orphanedRequestIds = orphanedRequests.map(req => req._id);
      
      const deleteResult = await this.deleteMany({
        _id: { $in: orphanedRequestIds }
      });

      console.log(`Deleted ${deleteResult.deletedCount} orphaned transfer requests`);
    }

    // Remove old transfer requests (older than 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const oldRequestsResult = await this.deleteMany({
      createdAt: { $lt: sevenDaysAgo }
    });

    console.log(`Deleted ${oldRequestsResult.deletedCount} old transfer requests`);

    return {
      orphanedRequestsDeleted: orphanedRequests.length,
      oldRequestsDeleted: oldRequestsResult.deletedCount
    };
  } catch (error) {
    console.error('Transfer request cleanup failed:', error);
    throw error;
  }
};

// Add a TTL index to automatically remove old transfer requests
transferRequestSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 }); // 7 days

module.exports = mongoose.model("TransferRequest", transferRequestSchema);