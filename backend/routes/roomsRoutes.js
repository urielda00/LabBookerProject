const express = require("express");
const router = express.Router();
const roomController = require("../controllers/roomsController");

// GET all rooms
router.get("/rooms", async (req, res) => {
  try {
    const response = await roomController.getRooms();
    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching rooms:", error.message);
    res.status(500).json({ 
      message: req.t(error.message) 
    });
  }
});

// GET single room by name
router.get("/rooms/:name", async (req, res) => {
  try {
    const response = await roomController.getRooms(req.params.name);
    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching room:", error.message);
    const status = error.message === 'room.errors.notFound' ? 404 : 500;
    res.status(status).json({ 
      message: req.t(error.message) 
    });
  }
});

// Create Room Route
router.post("/rooms", async (req, res) => {
  try {
    const response = await roomController.createRoom(req, res);
    res.status(response.status).json({
      message: req.t(response.message),
      room: response.room
    });
  } catch (error) {
    res.status(error.status || 500).json({
      message: req.t(error.message || "room.errors.createFailed")
    });
  }
});

// Update Room Details
router.put("/rooms/:name", async (req, res) => {
  try {
    const response = await roomController.updateRoom(req, res);
    res.status(response.status).json({
      message: req.t(response.message),
      room: response.room
    });
  } catch (error) {
    res.status(error.status || 500).json({
      message: req.t(error.message || "room.errors.updateFailed")
    });
  }
});

router.delete("/rooms/:name", async (req, res) => {
  const response = await roomController.deleteRoom(req.params.name);
  return res.status(response.status).json({
    message: req.t(response.message),
    ...(response.data && { data: response.data }),
    ...(response.error && { error: response.error })
  });
});

router.get("/rooms/:roomId/monthly-availability", async (req, res) => {
  const { roomId } = req.params;
  try {
    const response = await roomController.getRoomAvailabilityForWeek(roomId);
    return res.status(200).json(response);
  } catch (error) {
    const status = error.message === "room.errors.notFound" ? 404 : 500;
    return res.status(status).json({
      message: req.t(error.message)
    });
  }
});

router.get("/rooms-by-name/:name/monthly-availability", async (req, res) => {
  try {
    const { name } = req.params;
    const response = await roomController.getRoomAvailabilityForWeekByName(name);
    return res.status(200).json(response);
  } catch (error) {
    const status = error.message === "room.errors.notFound" ? 404 : 500;
    return res.status(status).json({
      message: req.t(error.message)
    });
  }
});

module.exports = router;
