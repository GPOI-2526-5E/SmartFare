import { Router } from 'express';
import { upload } from '../config/cloudinary';
import { optionalAuthenticateJWT, AuthRequest } from '../middleware/auth.middleware';
import prisma from '../config/prisma';

const router = Router();

// Cambiato in optionalAuthenticateJWT per permettere l'upload anche ai guest (che salvano solo in locale)
router.post('/image', optionalAuthenticateJWT, upload.single('image'), async (req: AuthRequest, res: any) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nessuna immagine fornita' });
        }

        const imageUrl = req.file.path;
        const itineraryId = req.body.itineraryId;
        let savedToDb = false;

        // Aggiorna il database solo se l'utente è autenticato e viene fornito un ID itinerario
        if (itineraryId && req.user) {
            try {
                await prisma.itinerary.update({
                    where: {
                        id: Number(itineraryId),
                        userId: req.user.userId
                    },
                    data: { imageUrl: imageUrl }
                });
                savedToDb = true;
                console.log(`Database aggiornato: Itinerario ${itineraryId} -> ${imageUrl}`);
            } catch (dbError) {
                console.error(`Errore aggiornamento DB per itinerario ${itineraryId}:`, dbError);
                // Non blocchiamo la risposta se l'update fallisce (es. itinerario non trovato)
            }
        }

        return res.status(200).json({
            url: imageUrl,
            saved: savedToDb
        });
    } catch (error) {
        console.error('Errore upload immagine:', error);
        return res.status(500).json({ error: 'Errore durante l\'upload o il salvataggio su Cloudinary' });
    }
});

export default router;
