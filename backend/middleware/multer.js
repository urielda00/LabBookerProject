const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Define the upload path once to avoid repeated path resolutions
const uploadPath = path.join(__dirname, '../uploads');

// Ensure the upload directory exists on startup to avoid synchronous I/O during requests
if (!fs.existsSync(uploadPath)) {
	fs.mkdirSync(uploadPath, { recursive: true });
}

// Configure storage for uploaded files
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		// Pass the pre-verified upload path
		cb(null, uploadPath);
	},
	filename: (req, file, cb) => {
		const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
		cb(null, uniqueSuffix + path.extname(file.originalname)); // Unique file name
	},
});

// File filter to allow only specific image types
const fileFilter = (req, file, cb) => {
	const allowedFileTypes = /jpeg|jpg|png|gif/;
	const extname = allowedFileTypes.test(path.extname(file.originalname).toLowerCase());
	const mimetype = allowedFileTypes.test(file.mimetype);

	if (extname && mimetype) {
		cb(null, true);
	} else {
		cb(new Error('Only images are allowed'));
	}
};

// Configure Multer instance
const uploadMulter = multer({
	storage,
	limits: { fileSize: 2 * 1024 * 1024 }, // Max file size: 2MB
	fileFilter,
}).single('image'); // Expect a single file upload with the field name 'image'

module.exports = uploadMulter;