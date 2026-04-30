import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'smartfare_itineraries',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'avif'],
    // Automatically limit large images to a good size for headers, preventing massive downloads
    transformation: [{ width: 1920, height: 1080, crop: 'limit' }]
  } as any,
});

export const upload = multer({ storage: storage });
export { cloudinary };
