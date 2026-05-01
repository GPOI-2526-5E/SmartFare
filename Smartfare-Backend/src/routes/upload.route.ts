import { Router } from 'express';
import { upload } from '../config/cloudinary';
import { authenticateJWT, AuthRequest } from '../middleware/auth.middleware';
import prisma from '../config/prisma'; // Importa prisma

const router = Router();

router.post('/image', authenticateJWT, upload.single('image'), async (req: AuthRequest, res: any) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nessuna immagine fornita' });
        }

        const imageUrl = req.file.path;
        const itineraryId = req.body.itineraryId;

        if (itineraryId && req.user) {
            await prisma.itinerary.update({
                where: {
                    id: Number(itineraryId),
                    userId: req.user.userId
                },
                data: { imageUrl: imageUrl }
            });
            console.log(`Database aggiornato: Itinerario ${itineraryId} -> ${imageUrl}`);
        }

        return res.status(200).json({
            url: imageUrl,
            saved: !!itineraryId
        });
    } catch (error) {
        console.error('Errore upload immagine:', error);
        return res.status(500).json({ error: 'Errore durante l\'upload o il salvataggio' });
    }
});

export default router;
