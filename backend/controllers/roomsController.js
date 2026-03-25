const fs = require('fs');
const { body, param } = require('express-validator');
const Room = require('../models/Room');
const Booking = require('../models/Booking');
const cloudinary = require('../utils/cloudinary');
const asyncHandler = require('../middleware/asyncHandler');

// Validators
const validateCreateRoom = [
	body('name').trim().notEmpty().withMessage('Room name is required'),
	body('type').trim().notEmpty().withMessage('Room type is required'),
	body('capacity').isInt({ min: 1 }).withMessage('Valid capacity is required'),
	// Note: Amenities and file validation happen in logic due to FormData structure
];

const validateUpdateRoom = [
	body('originalName').trim().notEmpty().withMessage('Original name is required for update'),
];

const validateRoomNameParam = [
	param('name').trim().notEmpty().withMessage('Room name parameter is required'),
];

const validateRoomIdParam = [param('roomId').isMongoId().withMessage('Invalid room ID')];

// Helper: Parse Amenities from FormData (string or object)
const parseAmenities = (amenitiesInput) => {
	if (!amenitiesInput) return [];
	let parsed = [];
	try {
		if (Array.isArray(amenitiesInput)) {
			parsed = amenitiesInput;
		} else {
			parsed = JSON.parse(amenitiesInput);
		}

		// Validate structure
		return parsed.map((item) => {
			if (item.name && item.icon) {
				return { name: item.name, icon: item.icon };
			}
			throw new Error('Invalid amenity structure');
		});
	} catch (error) {
		throw new Error('room.errors.invalidAmenities');
	}
};

// Helper: Generate next 7 days (excluding Fri/Sat)
const generateNext7Days = () => {
	const dates = [];
	const currentDate = new Date();
	currentDate.setHours(0, 0, 0, 0);

	while (dates.length < 7) {
		const dayOfWeek = currentDate.getDay();
		// 0 = Sunday, 5 = Friday, 6 = Saturday
		if (dayOfWeek !== 5 && dayOfWeek !== 6) {
			const year = currentDate.getFullYear();
			const month = String(currentDate.getMonth() + 1).padStart(2, '0');
			const day = String(currentDate.getDate()).padStart(2, '0');
			dates.push(`${year}-${month}-${day}`);
		}
		currentDate.setDate(currentDate.getDate() + 1);
	}
	return dates;
};

// Helper: Generate 2-hour slots
function generateTwoHourSlots() {
	const slots = [];
	for (let hour = 8; hour <= 20; hour += 2) {
		const startTime = `${String(hour).padStart(2, '0')}:00`;
		const endHour = hour + 2;
		const endTime = `${String(endHour - 1).padStart(2, '0')}:59`;
		slots.push({ startTime, endTime });
	}
	return slots;
}

// Controller Methods

const getAllRooms = asyncHandler(async (req, res) => {
	const rooms = await Room.find();
	res.status(200).json(rooms);
});

const getRoomByName = asyncHandler(async (req, res) => {
	const { name } = req.params;
	const room = await Room.findOne({ name });

	if (!room) {
		const error = new Error('room.errors.notFound');
		error.statusCode = 404;
		throw error;
	}

	res.status(200).json(room);
});

const createRoom = asyncHandler(async (req, res) => {
	const { name, type, capacity, description, amenities } = req.body;
	let imageUrl = '';

	// 1. Handle File Upload (Multer middleware handled the file placement)
	if (req.file) {
		try {
			const result = await cloudinary.uploader.upload(req.file.path);
			imageUrl = result.secure_url;
		} finally {
			// Always clean up local file
			if (fs.existsSync(req.file.path)) {
				fs.unlinkSync(req.file.path);
			}
		}
	}

	// 2. Parse Amenities
	let parsedAmenities = [];
	try {
		parsedAmenities = parseAmenities(amenities);
	} catch (err) {
		const error = new Error('room.errors.invalidAmenities');
		error.statusCode = 400;
		throw error;
	}

	// 3. Create and Save
	const newRoom = new Room({
		name,
		type,
		capacity,
		description,
		imageUrl,
		amenities: parsedAmenities,
	});

	await newRoom.save();

	res.status(201).json({
		message: 'room.success.created',
		room: newRoom,
	});
});

const updateRoom = asyncHandler(async (req, res) => {
	const { name, type, capacity, description, amenities, originalName } = req.body;

	// Find by originalName (maintaining existing logic)
	const room = await Room.findOne({ name: originalName });
	if (!room) {
		const error = new Error('room.errors.notFound');
		error.statusCode = 404;
		throw error;
	}

	// Handle Image Update
	if (req.file) {
		try {
			const result = await cloudinary.uploader.upload(req.file.path);
			room.imageUrl = result.secure_url;
		} finally {
			if (fs.existsSync(req.file.path)) {
				fs.unlinkSync(req.file.path);
			}
		}
	}

	// Handle Amenities Update
	if (amenities) {
		try {
			room.amenities = parseAmenities(amenities);
		} catch (err) {
			const error = new Error('room.errors.invalidAmenities');
			error.statusCode = 400;
			throw error;
		}
	}

	// Update Fields
	if (name) room.name = name;
	if (type) room.type = type;
	if (capacity) room.capacity = capacity;
	if (description) room.description = description;

	await room.save();

	res.status(200).json({
		message: 'room.success.updated',
		room,
	});
});

const deleteRoom = asyncHandler(async (req, res) => {
	const { name } = req.params;

	const room = await Room.findOne({ name });
	if (!room) {
		const error = new Error('room.errors.notFound');
		error.statusCode = 404;
		throw error;
	}

	// Delete image from Cloudinary
	if (room.imageUrl) {
		const publicId = room.imageUrl.split('/').slice(-1)[0].split('.')[0];
		await cloudinary.uploader.destroy(publicId).catch((err) => {
			if(process.env.NODE_ENV !== 'production') {
				console.error('Cloudinary delete error:', err);
			} else {
				console.error('Cloudinary delete error:', err.message);
			}
		});
	}

	// Delete associated bookings
	const deletedBookings = await Booking.deleteMany({ roomId: room._id });

	// Delete room
	await Room.findByIdAndDelete(room._id);

	res.status(200).json({
		message: 'room.success.deleted',
		data: {
			roomName: room.name,
			deletedBookingsCount: deletedBookings.deletedCount,
		},
	});
});

const getRoomAvailabilityForWeek = asyncHandler(async (req, res) => {
	const { roomId } = req.params;

	const room = await Room.findById(roomId);
	if (!room) {
		const error = new Error('room.errors.notFound');
		error.statusCode = 404;
		throw error;
	}

	const dates = generateNext7Days();
	const bookings = await Booking.find({
		roomId,
		date: { $in: dates },
		status: { $in: ['Pending', 'Confirmed', 'Active'] },
	});

	const availability = processAvailability(dates, bookings);

	res.status(200).json({ room: room.name, availability });
});

const getRoomAvailabilityForWeekByName = asyncHandler(async (req, res) => {
	const { name } = req.params;

	const room = await Room.findOne({ name });
	if (!room) {
		const error = new Error('room.errors.notFound');
		error.statusCode = 404;
		throw error;
	}

	const dates = generateNext7Days();
	const bookings = await Booking.find({
		roomId: room._id,
		date: { $in: dates },
		status: { $in: ['Pending', 'Confirmed', 'Active'] },
	});

	const availability = processAvailability(dates, bookings);

	res.status(200).json({ room: room.name, availability });
});

// Helper Logic for processing availability (Shared by both functions)
const processAvailability = (dates, bookings) => {
	return dates.map((date) => {
		const timeSlots = generateTwoHourSlots();
		const slots = timeSlots.map((slot) => {
			const isOccupied = bookings.some((b) => {
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

			return { ...slot, status: isOccupied ? 'Occupied' : 'Available' };
		});
		return { date, slots };
	});
};

module.exports = {
	getAllRooms,
	getRoomByName,
	createRoom,
	updateRoom,
	deleteRoom,
	getRoomAvailabilityForWeek,
	getRoomAvailabilityForWeekByName,
	// Validators
	validateCreateRoom,
	validateUpdateRoom,
	validateRoomNameParam,
	validateRoomIdParam,
};
