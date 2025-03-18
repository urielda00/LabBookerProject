const Config = require("../models/Config");

async function getConfig(req, res, next) {
  try {
    const config = await Config.findOne(); // Fetch the single config document
    if (!config) {
      return res.status(404).json({ message: "Configuration not found" });
    }
    res.json(config);
  } catch (error) {
    console.error("Error getting configuration:", error);
    next(error);
  }
}

async function updateConfig(req, res, next) {
  try {
    const configData = req.body;

    // Validate the incoming data (important for security and data integrity)
    const { error } = validateConfig(configData); // See validation function below
    if (error) return res.status(400).json({ error: error.details[0].message });

    const config = await Config.findByIdAndUpdate(
      req.params.id, // Assuming you're passing the config ID in the URL
      configData,
      { new: true, runValidators: true } // Return updated doc and run Mongoose validators
    );

    if (!config) {
      return res.status(404).json({ message: "Configuration not found" });
    }

    res.json(config);
  } catch (error) {
    console.error("Error updating configuration:", error);
    next(error);
  }
}

// Validation function using Joi 
const Joi = require('joi');
function validateConfig(config) {
  const schema = Joi.object({
    booking: Joi.object({
      openDaysBefore: Joi.number().min(0).default(3),
      slotDurationHours: Joi.number().integer().min(1).max(24).required(),
      maxBookingsPerWeek: Joi.number().integer().min(1).required(),
      minBookingTimeBeforeHours: Joi.number().min(0).default(2),
    }).required(),
    cancellation: Joi.object({
      minCancellationTimeBeforeMinutes: Joi.number().min(0).default(30),
    }).required(),
    penalty: Joi.object({
      maxMissedBookingsPerMonth: Joi.number().min(0).default(2),
      blockDurationWeeks: Joi.number().min(0).default(2),
    }).required(),
  });
  return schema.validate(config);
}


module.exports = {
  getConfig,
  updateConfig,
};