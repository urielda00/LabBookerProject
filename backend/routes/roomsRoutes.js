const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomsController');
const uploadMulter = require('../middleware/multer'); // Import Multer here
const validateRequest = require('../middleware/validateRequest');

// GET all rooms
router.get('/rooms', roomController.getAllRooms);

// GET single room by name
router.get(
	'/rooms/:name',
	roomController.validateRoomNameParam,
	validateRequest,
	roomController.getRoomByName
);

// Create Room
// Multer runs first to process the file and populate req.body
router.post(
	'/rooms',
	uploadMulter,
	roomController.validateCreateRoom,
	validateRequest,
	roomController.createRoom
);

// Update Room Details
router.put(
	'/rooms/:name',
	uploadMulter,
	roomController.validateUpdateRoom,
	validateRequest,
	roomController.updateRoom
);

// Delete Room
router.delete(
	'/rooms/:name',
	roomController.validateRoomNameParam,
	validateRequest,
	roomController.deleteRoom
);

// Availability by ID
router.get(
	'/rooms/:roomId/monthly-availability',
	roomController.validateRoomIdParam,
	validateRequest,
	roomController.getRoomAvailabilityForWeek
);

// Availability by Name
router.get(
	'/rooms-by-name/:name/monthly-availability',
	roomController.validateRoomNameParam,
	validateRequest,
	roomController.getRoomAvailabilityForWeekByName
);

module.exports = router;
