import { Router } from 'express';
import { upload } from '../config/cloudinary';
import { authenticateJWT, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// POST /api/upload/image
router.post('/image', authenticateJWT, upload.single('image'), (req: AuthRequest, res: any) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nessuna immagine fornita' });
        }
        
        // multer-storage-cloudinary populates req.file.path with the secure Cloudinary URL
        const imageUrl = req.file.path;
        
        return res.status(200).json({ url: imageUrl });
    } catch (error) {
        console.error('Errore upload immagine:', error);
        return res.status(500).json({ error: 'Errore durante l\'upload dell\'immagine' });
    }
});

export default router;
