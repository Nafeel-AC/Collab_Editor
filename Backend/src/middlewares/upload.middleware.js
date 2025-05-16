import multer from 'multer';
import path from 'path';

// File filter to only accept image files
const fileFilter = (req, file, cb) => {
  // Accept images only
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
    return cb(new Error('Only image files are allowed!'), false);
  }
  cb(null, true);
};

// Create the multer upload instance with memory storage for Cloudinary
const upload = multer({
  storage: multer.memoryStorage(), // Use memory storage instead of disk storage
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  },
  fileFilter: fileFilter
});

export default upload; 