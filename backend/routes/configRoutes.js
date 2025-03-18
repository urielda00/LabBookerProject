// const express = require('express');
// const router = express.Router();
// const Config = require('../models/Config');
// const Joi = require('joi');

// // Fetch the current configuration
// router.get('/', async (req, res) => {
//   try {
//     let config = await Config.findOne();
//     if (!config) {
//       // Create a default configuration if none exists
//       config = new Config();
//       await config.save();
//     }
//     res.json(config);
//   } catch (error) {
//     console.error('Error fetching config:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// // Update the configuration (no ID needed)
// router.put('/', async (req, res) => {
//   try {
//     const updatedConfig = req.body;

//     // Validate the incoming data
//     const { error } = validateConfig(updatedConfig);
//     if (error) return res.status(400).json({ message: error.details[0].message });

//     // Find and update the single configuration document
//     let config = await Config.findOne();
//     if (!config) {
//       // Create a new configuration if none exists
//       config = new Config(updatedConfig);
//     } else {
//       // Update the existing configuration
//       Object.assign(config, updatedConfig);
//     }
//     await config.save();

//     res.json(config);
//   } catch (error) {
//     console.error('Error updating config:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// // Validation function using Joi
// function validateConfig(config) {
//   const schema = Joi.object({
//     booking: Joi.object({
//       openDaysBefore: Joi.number().min(0).default(3),
//       slotDurationHours: Joi.number().integer().min(1).max(24).required(),
//       maxBookingsPerWeek: Joi.number().integer().min(1).required(),
//       minBookingTimeBeforeHours: Joi.number().min(0).default(2),
//     }).required(),
//     cancellation: Joi.object({
//       minCancellationTimeBeforeMinutes: Joi.number().min(0).default(30),
//     }).required(),
//     penalty: Joi.object({
//       maxMissedBookingsPerMonth: Joi.number().min(0).default(2),
//       blockDurationWeeks: Joi.number().min(0).default(2),
//     }).required(),
//   });
//   return schema.validate(config);
// }

// module.exports = router;