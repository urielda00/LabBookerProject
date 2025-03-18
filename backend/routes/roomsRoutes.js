const express = require("express");
const router = express.Router();
const roomController = require("../controllers/roomsController");

// Rooms Route
router.get("/rooms", async (req, res) => {
  try {
    // Call the controller function to get rooms
    const response = await roomController.getRooms();
    return res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching rooms:", error.message);
    return res.status(500).json({ message: "Failed to fetch rooms" });
  }
});

router.get("/rooms/:name", async (req, res) => {
  try {
    // Call the controller function to get the room by id
    const response = await roomController.getRooms(req.params.name);
    return res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching room:", error.message);
    return res.status(500).json({ message: "Failed to fetch room" });
  }
});

// Create Room Route
router.post("/rooms", async (req, res) => {
  try {
    const response = await roomController.createRoom(req, res);
    res
      .status(response.status)
      .json({ message: response.message, room: response.room });
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Failed to create room" });
  }
});

// Update Room Details
router.put("/rooms/:name", async (req, res) => {
  try {
    const response = await roomController.updateRoom(req, res);
    res
      .status(response.status)
      .json({ message: response.message, room: response.room });
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Failed to update room" });
  }
});

router.delete("/rooms/:name", async (req, res) => {
  try {
    const response = await roomController.deleteRoom(req.params.name);
    return res.status(200).json(response);
  } catch (error) {
    console.error("Error deleting room:", error.message);
    return res.status(500).json({ message: "Failed to delete room" });
  }
});

router.get("/rooms/:roomId/monthly-availability", async (req, res) => {
  const { roomId } = req.params;

  try {
    const response = await roomController.getRoomAvailabilityForWeek(roomId);
    return res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching room availability:", error.message);
    return res
      .status(500)
      .json({ message: "Failed to fetch room availability" });
  }
});

// GET /rooms-by-name/:name/monthly-availability
router.get("/rooms-by-name/:name/monthly-availability", async (req, res) => {
  try {
    const { name } = req.params;
    const response =
      await roomController.getRoomAvailabilityForWeekByName(name);
    return res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching room availability by name:", error.message);
    return res
      .status(500)
      .json({ message: "Failed to fetch room availability" });
  }
});

module.exports = router;
