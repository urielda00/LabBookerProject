const Room = require("../models/Room"); // Import the Room model
const Booking = require("../models/Booking"); // Import the Booking model

const uploadMulter = require("../middleware/multer");
const cloudinary = require("../utils/cloudinary");
const fs = require("fs");

async function getRooms(name = null) {
  try {
    if (name) {
      const room = await Room.findOne({ name });
      if (!room) {
        throw new Error("Room not found");
      }
      return room;
    } else {
      const rooms = await Room.find();
      return rooms;
    }
  } catch (error) {
    console.error("Error in getRooms:", error.message);
    throw new Error("Unable to fetch rooms");
  }
}

async function createRoom(req, res) {
  return new Promise((resolve, reject) => {
    uploadMulter(req, res, async (err) => {
      if (err) {
        console.error("Error uploading file:", err.message);
        reject({ status: 500, message: "Failed to upload file" });
      } else {
        try {
          // Extract fields from the request body
          const { name, type, capacity, description, amenities } = req.body;
          let imageUrl = "";

          // Ensure amenities is an array if provided
          let parsedAmenities = [];
          if (amenities) {
            try {
              // Check if amenities is an array, and ensure each object has the correct properties
              if (Array.isArray(amenities)) {
                // Ensure that each amenity object only contains 'name' and 'icon'
                parsedAmenities = amenities.map((item) => {
                  if (item.name && item.icon) {
                    return { name: item.name, icon: item.icon };
                  }
                  throw new Error(
                    "Each amenity must have a 'name' and 'icon' property.",
                  );
                });
              } else {
                // If amenities is a stringified array, try to parse it
                parsedAmenities = JSON.parse(amenities);
              }
            } catch (parseError) {
              reject({
                status: 400,
                message:
                  "Invalid format for amenities. It should be an array of objects with 'name' and 'icon' properties.",
              });
              return;
            }
          }

          // Handle file upload if present
          if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path); // Upload file to Cloudinary
            fs.unlinkSync(req.file.path); // Remove file from server after upload
            imageUrl = result.secure_url; // Save the Cloudinary URL
          }

          // Check for required fields
          if (!name || !type || !capacity) {
            reject({
              status: 400,
              message: "Missing required fields: name, type, capacity",
            });
            return;
          }

          // Create a new Room object with amenities included
          const newRoom = new Room({
            name,
            type,
            capacity,
            description, // Add description if provided
            imageUrl, // Save the Cloudinary URL
            amenities: parsedAmenities, // Add amenities as an array of objects
          });

          // Save the new room
          await newRoom.save();

          // Return response with the created room
          resolve({
            status: 201,
            message: "Room created successfully",
            room: newRoom,
          });
        } catch (error) {
          console.error("Error creating room:", error.message);
          reject({
            status: 500,
            message:
              "Failed to create room. Please check the input and try again.",
          });
        }
      }
    });
  });
}

async function updateRoom(req, res) {
  return new Promise((resolve, reject) => {
    uploadMulter(req, res, async (err) => {
      if (err) {
        reject({ status: 500, message: "Failed to upload file" });
      } else {
        try {
          const { name, type, capacity, description, amenities } = req.body; // Original name passed in request body
          const originalName = req.body.originalName; // Ensure the original name is passed for identification

          if (!originalName) {
            reject({ status: 400, message: "Original room name is missing" });
            return;
          }

          // Find the room by the original name
          const room = await Room.findOne({ name: originalName });
          if (!room) {
            reject({ status: 404, message: "Room not found" });
            return;
          }

          // Handle file upload if present
          if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path);
            fs.unlinkSync(req.file.path);
            room.imageUrl = result.secure_url; // Update image URL directly
          }

          // Validate and parse amenities if provided
          if (amenities) {
            try {
              room.amenities = JSON.parse(amenities).map((amenity) => {
                if (!amenity.name || !amenity.icon) {
                  throw new Error(
                    "Each amenity must have 'name' and 'icon' properties.",
                  );
                }
                return { name: amenity.name, icon: amenity.icon };
              });
            } catch (parseError) {
              reject({
                status: 400,
                message:
                  "Invalid format for amenities. It should be an array of objects with 'name' and 'icon' properties.",
              });
              return;
            }
          }

          // Update fields with the provided data
          if (name) room.name = name;
          if (type) room.type = type;
          if (capacity) room.capacity = capacity;
          if (description) room.description = description;

          // Save updated room (using the original name for identification)
          await room.save();

          resolve({
            status: 200,
            message: "Room updated successfully",
            room,
          });
        } catch (error) {
          console.error("Error updating room:", error.message);
          reject({
            status: 500,
            message:
              "Failed to update room. Please check the input and try again.",
          });
        }
      }
    });
  });
}

async function deleteRoom(name) {
  try {
    // Search for room by name
    const room = await Room.findOne({ name });

    if (!room) {
      return {
        status: 404,
        message: "Room not found",
      };
    }

    // Delete associated image from Cloudinary if exists
    const imageUrl = room.imageUrl;
    if (imageUrl) {
      const publicId = imageUrl.split("/").slice(-1)[0].split(".")[0];
      await cloudinary.uploader.destroy(publicId);
    }

    // Delete all bookings associated with this room
    const deletedBookings = await Booking.deleteMany({ roomId: room._id });

    // Delete the room
    await Room.findByIdAndDelete(room._id);

    return {
      status: 200,
      message: "Room and associated bookings deleted successfully",
      data: {
        roomName: room.name,
        deletedBookingsCount: deletedBookings.deletedCount,
      },
    };
  } catch (error) {
    console.error("Error deleting room:", error.message);
    return {
      status: 500,
      message:
        "Failed to delete room and associated bookings. Please try again.",
      error: error.message,
    };
  }
}

const generateNext7Days = () => {
  const dates = [];
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0); // Normalize time to midnight

  // Loop until we collect 7 valid dates (excluding Friday/Saturday)
  while (dates.length < 7) {
    const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday
    
    // Only add if not Friday (5) or Saturday (6)
    if (dayOfWeek !== 5 && dayOfWeek !== 6) {
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, "0");
      const day = String(currentDate.getDate()).padStart(2, "0");
      dates.push(`${year}-${month}-${day}`);
    }
    
    // Move to next day regardless of weekend status
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
};

function generateTwoHourSlots() {
  const slots = [];
  for (let hour = 8; hour <= 20; hour += 2) { // 8 AM to 8 PM (20:00)
    const startTime = `${String(hour).padStart(2, "0")}:00`;
    const endHour = hour + 2; // Next even hour
    const endTime = `${String(endHour - 1).padStart(2, "0")}:59`; // Ends at HH-1:59
    slots.push({ startTime, endTime });
  }
  return slots;
}

const getRoomAvailabilityForWeek = async (roomId) => {
  const room = await Room.findById(roomId);
  if (!room) throw new Error("Room not found.");

  const dates = generateNext7Days();
  const bookings = await Booking.find({
    roomId,
    date: { $in: dates },
    status: { $in: ["Pending", "Confirmed", "Active"] },
  });

  const availability = dates.map((date) => {
    const timeSlots = generateTwoHourSlots();
    const slots = timeSlots.map((slot) => {
      const isOccupied = bookings.some(b => {
        if (b.date !== date) return false;
        
        // Convert all times to minutes since midnight for comparison
        const toMinutes = (time) => {
          const [hours, minutes] = time.split(':').map(Number);
          return hours * 60 + minutes;
        };

        const slotStart = toMinutes(slot.startTime);
        const slotEnd = toMinutes(slot.endTime);
        const bookingStart = toMinutes(b.startTime);
        const bookingEnd = toMinutes(b.endTime);

        return (
          (slotStart < bookingEnd && slotEnd > bookingStart) ||
          (slotStart >= bookingStart && slotStart < bookingEnd) ||
          (slotEnd > bookingStart && slotEnd <= bookingEnd)
        );
      });
      
      return { ...slot, status: isOccupied ? "Occupied" : "Available" };
    });
    return { date, slots };
  });

  return { room: room.name, availability };
};

// Make the same time comparison changes to getRoomAvailabilityForWeekByName
async function getRoomAvailabilityForWeekByName(roomName) {
  const room = await Room.findOne({ name: roomName });
  if (!room) throw new Error("Room not found by that name.");

  const dates = generateNext7Days();
  const bookings = await Booking.find({
    roomId: room._id,
    date: { $in: dates },
    status: { $in: ["Pending", "Confirmed"] },
  });

  const availability = dates.map((date) => {
    const timeSlots = generateTwoHourSlots();
    const slots = timeSlots.map((slot) => {
      const isOccupied = bookings.some(b => {
        if (b.date !== date) return false;

        const toMinutes = (time) => {
          const [hours, minutes] = time.split(':').map(Number);
          return hours * 60 + minutes;
        };

        const slotStart = toMinutes(slot.startTime);
        const slotEnd = toMinutes(slot.endTime);
        const bookingStart = toMinutes(b.startTime);
        const bookingEnd = toMinutes(b.endTime);

        return (
          (slotStart < bookingEnd && slotEnd > bookingStart) ||
          (slotStart >= bookingStart && slotStart < bookingEnd) ||
          (slotEnd > bookingStart && slotEnd <= bookingEnd)
        );
      });
      
      return { ...slot, status: isOccupied ? "Occupied" : "Available" };
    });
    return { date, slots };
  });

  return { room: room.name, availability };
}

module.exports = {
  getRooms,
  createRoom,
  updateRoom,
  deleteRoom,
  getRoomAvailabilityForWeek, // Updated function name
  getRoomAvailabilityForWeekByName, // Updated function name
};