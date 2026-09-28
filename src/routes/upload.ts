import { Router, Request, Response } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';

const router = Router();

// Configure multer memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Configure Cloudinary from environment variables
const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'dgpdap1fy';
const apiKey = process.env.CLOUDINARY_API_KEY || '852347714338531';
const apiSecret = process.env.CLOUDINARY_API_SECRET || '';

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret
});

/**
 * POST /api/v1/upload
 * Accepts FormData with single file 'image' OR JSON { imageBase64: 'data:image/...' }
 */
router.post('/', upload.single('image'), async (req: Request, res: Response) => {
  try {
    let fileToUpload: string | undefined;
    const folder = req.body?.folder || 'apexcare/uploads';

    if (req.file) {
      // Memory buffer from multer converted to Base64 data URI
      const b64 = Buffer.from(req.file.buffer).toString('base64');
      fileToUpload = `data:${req.file.mimetype};base64,${b64}`;
    } else if (req.body?.imageBase64) {
      fileToUpload = req.body.imageBase64;
    }

    if (!fileToUpload) {
      return res.status(400).json({
        success: false,
        message: 'No image file or base64 data provided.'
      });
    }

    // Check if API Secret is configured
    if (!apiSecret || apiSecret.trim() === '') {
      console.warn('CLOUDINARY_API_SECRET is missing in environment variables. Falling back to data URI/placeholder.');
      return res.status(200).json({
        success: true,
        url: fileToUpload.startsWith('data:') ? fileToUpload : 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800',
        publicId: `fallback-${Date.now()}`,
        warning: 'Cloudinary API secret not set yet. Saved as temporary inline preview.'
      });
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(fileToUpload, {
      folder,
      resource_type: 'auto'
    });

    return res.status(200).json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height
    });
  } catch (error) {
    console.error('Error uploading image to Cloudinary:', error);
    return res.status(500).json({
      success: false,
      message: (error as Error).message || 'Failed to upload image to Cloudinary'
    });
  }
});

/**
 * POST /api/v1/upload/multiple
 * Accepts multiple files under 'images' field
 */
router.post('/multiple', upload.array('images', 5), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, message: 'No images provided.' });
    }

    const folder = req.body?.folder || 'apexcare/uploads';
    const uploadPromises = files.map(file => {
      const b64 = Buffer.from(file.buffer).toString('base64');
      const dataUri = `data:${file.mimetype};base64,${b64}`;

      if (!apiSecret || apiSecret.trim() === '') {
        return Promise.resolve({
          url: dataUri,
          publicId: `fallback-${Date.now()}-${Math.random()}`
        });
      }

      return cloudinary.uploader.upload(dataUri, { folder, resource_type: 'auto' })
        .then(res => ({ url: res.secure_url, publicId: res.public_id }));
    });

    const results = await Promise.all(uploadPromises);
    const urls = results.map(r => r.url);

    return res.status(200).json({
      success: true,
      urls,
      data: results
    });
  } catch (error) {
    console.error('Error uploading multiple images:', error);
    return res.status(500).json({
      success: false,
      message: (error as Error).message
    });
  }
});

export default router;
