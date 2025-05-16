import multer from 'multer';
import path from 'path';

// File filter to only accept image files
const fileFilter = (req, file, cb) => {
  console.log('File filter checking:', file.originalname, file.mimetype);
  
  // Accept images only
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
    console.log('File rejected: not an accepted image type');
    return cb(new Error('Only image files are allowed!'), false);
  }
  
  console.log('File accepted');
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

// Export a logging middleware wrapper
const loggingUpload = {
  single: (fieldName) => {
    // Return a middleware function that wraps the multer middleware
    return (req, res, next) => {
      console.log(`Processing upload for field: ${fieldName}`);
      
      // Apply the multer middleware
      upload.single(fieldName)(req, res, (err) => {
        if (err) {
          console.error('Multer upload error:', err);
          return res.status(400).json({ error: err.message });
        }
        
        // Log the file info after successful upload
        if (req.file) {
          console.log('File uploaded successfully:', {
            fieldname: req.file.fieldname,
            originalname: req.file.originalname,
            size: req.file.size,
            buffer: req.file.buffer ? `${req.file.buffer.length} bytes` : 'No buffer'
          });
        } else {
          console.log('No file was uploaded');
        }
        
        next();
      });
    };
  }
};

export default loggingUpload; 