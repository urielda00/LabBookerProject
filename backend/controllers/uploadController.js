const fs = require('fs');
const cloudinary = require('../utils/cloudinary');
const asyncHandler = require('../middleware/asyncHandler');

const uploadFile = asyncHandler(async (req, res) => {
	if (!req.file) {
		const error = new Error('No file provided');
		error.statusCode = 400;
		throw error;
	}

	let result;
	// Check if Cloudinary is configured
	const isCloudinaryConfigured = process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;

	try {
		if (isCloudinaryConfigured) {
			// Real Upload
			result = await cloudinary.uploader.upload(req.file.path, {
				folder: 'uploads',
			});
		} else {
			// Mock Upload for Development/Testing
			console.log('[UPLOAD] Cloudinary not configured, using mock response');
			result = { secure_url: `http://localhost:5000/uploads/${req.file.filename}` };
		}
	} catch (error) {
		console.error('Cloudinary upload error:', error);
		const uploadError = new Error('Failed to upload file to cloud storage');
		uploadError.statusCode = 500;
		throw uploadError;
	} finally {
		// Cleanup local file
		if (req.file && fs.existsSync(req.file.path)) {
			try {
				fs.unlinkSync(req.file.path);
			} catch (unlinkError) {
				console.error('Error deleting local file:', unlinkError);
			}
		}
	}

	res.status(200).json({
		message: isCloudinaryConfigured ? 'File uploaded successfully' : 'File processed (Mock Mode)',
		url: result.secure_url,
	});
});

module.exports = {
	upload: uploadFile,
};