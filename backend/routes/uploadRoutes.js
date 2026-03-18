const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const uploadMulter = require('../middleware/multer');

// POST /api/upload/upload
// Flow: Multer processes file -> Controller uploads to Cloudinary -> Response
router.post(
	'/upload',
	uploadMulter, // Middleware runs first
	uploadController.upload
);

module.exports = router;
