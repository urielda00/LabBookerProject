const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Configure storage for uploaded files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const destinationPath = path.join(__dirname, '../uploads');
        cb(null, destinationPath);    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
        cb(null, uniqueSuffix + path.extname(file.originalname)); // Unique file name
    },
});

// File filter to allow only certain file types
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

// Configure Multer
const uploadMulter = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // Max file size: 2MB
    fileFilter,
}).single('image'); // Expect a single file upload with the field name 'image'

module.exports = uploadMulter;
