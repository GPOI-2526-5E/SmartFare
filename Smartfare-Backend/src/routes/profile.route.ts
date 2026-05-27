import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { authenticateJWT, AuthRequest, optionalAuthenticateJWT } from '../middleware/auth.middleware';
import { upload, cloudinary } from '../config/cloudinary';
import prisma from '../config/prisma';
import { parseTravelStyles, serializeTravelStyles } from '../utils/user-preference.util';
import { AuthService } from '../services/auth/auth.service';
import { AppError } from '../middleware/error.middleware';

const authService = new AuthService();

const router = Router();

const writeLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Troppe richieste. Riprova tra un minuto.' }
});

const passwordCodeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Troppi tentativi. Riprova tra 15 minuti.' },
});

const changePasswordWithCodeSchema = z.object({
    code: z.string().regex(/^\d{6}$/, 'Il codice deve essere di 6 cifre'),
    newPassword: z.string().min(8, 'La password deve avere almeno 8 caratteri'),
});

const updateProfileSchema = z.object({
    name: z.string().trim().max(80).optional(),
    surname: z.string().trim().max(80).optional(),
    city: z.string().trim().max(100).optional(),
    street: z.string().trim().max(200).optional(),
    birthDate: z.string().datetime({ offset: true }).optional().nullable(),
    avatarUrl: z.string().url().max(500).optional().nullable(),
    backgroundImageUrl: z.string().url().max(500).optional().nullable(),
    bio: z.string().trim().max(500).optional().nullable(),
    instagramUrl: z.string().trim().max(100).optional().nullable(),
    twitterUrl: z.string().trim().max(100).optional().nullable(),
});

const updatePreferencesSchema = z.object({
    travelStyle: z.string().trim().max(200).optional().nullable(),
    travelStyles: z.array(z.string().trim().min(1).max(40)).max(8).optional(),
    pace: z.string().trim().max(50).optional().nullable(),
    travelCompanion: z.enum(['SOLO', 'COUPLE', 'FAMILY', 'GROUP']).optional().nullable(),
    notes: z.string().trim().max(1000).optional().nullable(),
    interestCategoryIds: z.array(z.coerce.number().int().positive()).max(24).optional(),
});

async function formatPreferenceResponse(preference: {
    id: number;
    userId: number;
    travelCompanion: string | null;
    travelStyle: string | null;
    pace: string | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
}) {
    const interests = await prisma.userPreferenceInterest.findMany({
        where: { preferenceId: preference.id },
        select: {
            activityCategoryId: true,
            category: { select: { id: true, name: true } },
        },
    });

    const interestCategories = interests
        .map((row) => row.category)
        .filter((category): category is { id: number; name: string } => Boolean(category));

    return {
        ...preference,
        travelStyles: parseTravelStyles(preference.travelStyle),
        interestCategoryIds: interestCategories.map((category) => category.id),
        interestCategories,
        travelCompanion: preference.travelCompanion,
    };
}

// ─── GET /api/profile/me ──────────────────────────────────────────────────────
router.get('/me', authenticateJWT, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = Number(req.user!.userId);

        const [user, followersCount, followingCount, publicItinerariesCount] = await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                select: {
                    email: true,
                    authProvider: true,
                    passwordHash: true,
                    profile: true,
                    preference: true,
                }
            }),
            prisma.follow.count({ where: { followingId: userId } }),
            prisma.follow.count({ where: { followerId: userId } }),
            prisma.itinerary.count({ 
                where: { 
                    userId, 
                    OR: [
                        { isPublished: true },
                        { visibilityCode: 'PUBLIC' }
                    ]
                } 
            })
        ]);

        if (!user) {
            return res.status(404).json({ error: 'Utente non trovato' });
        }

        return res.json({
            email: user.email,
            authProvider: user.authProvider,
            hasLocalPassword: !!user.passwordHash,
            profile: user.profile ?? null,
            preference: user.preference
                ? await formatPreferenceResponse(user.preference)
                : null,
            followersCount,
            followingCount,
            publicItinerariesCount
        });
    } catch (error) {
        next(error);
    }
});

// ─── GET /api/profile/me/followers (solo proprietario) ─────────────────────────
router.get('/me/followers', authenticateJWT, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = Number(req.user!.userId);
        const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
        const offset = Math.max(Number(req.query.offset) || 0, 0);

        const publicItineraryWhere = {
            OR: [
                { isPublished: true },
                { visibilityCode: 'PUBLIC' as const }
            ]
        };

        const [follows, total] = await Promise.all([
            prisma.follow.findMany({
                where: { followingId: userId },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
                include: {
                    follower: {
                        select: {
                            id: true,
                            email: true,
                            authProvider: true,
                            profile: true,
                            _count: {
                                select: {
                                    followers: true,
                                    following: true,
                                    itineraries: { where: publicItineraryWhere }
                                }
                            }
                        }
                    }
                }
            }),
            prisma.follow.count({ where: { followingId: userId } })
        ]);

        const followers = await Promise.all(
            follows.map(async (row) => {
                const u = row.follower;
                const follow = await prisma.follow.findUnique({
                    where: {
                        followerId_followingId: {
                            followerId: userId,
                            followingId: u.id
                        }
                    }
                });

                return {
                    id: u.id,
                    email: u.email,
                    authProvider: u.authProvider,
                    profile: u.profile,
                    followersCount: u._count.followers,
                    followingCount: u._count.following,
                    publicItinerariesCount: u._count.itineraries,
                    isFollowing: !!follow,
                    followedAt: row.createdAt
                };
            })
        );

        return res.json({ followers, total });
    } catch (error) {
        next(error);
    }
});

// ─── GET /api/profile/top-creators ──────────────────────────────────────────────
router.get('/top-creators', optionalAuthenticateJWT, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const limit = Number(req.query.limit) || 10;
        const currentUserId = req.user?.userId ? Number(req.user.userId) : undefined;

        const users = await prisma.user.findMany({
            where: {
                profile: { isNot: null }
            },
            select: {
                id: true,
                email: true,
                authProvider: true,
                profile: true,
                _count: {
                    select: {
                        followers: true,
                        following: true,
                        itineraries: {
                            where: {
                                OR: [
                                    { isPublished: true },
                                    { visibilityCode: 'PUBLIC' }
                                ]
                            }
                        }
                    }
                }
            },
            orderBy: {
                followers: {
                    _count: 'desc'
                }
            },
            take: limit
        });

        const result = await Promise.all(users.map(async (u) => {
            let isFollowing = false;
            if (currentUserId) {
                const follow = await prisma.follow.findUnique({
                    where: {
                        followerId_followingId: {
                            followerId: currentUserId,
                            followingId: u.id
                        }
                    }
                });
                isFollowing = !!follow;
            }

            return {
                id: u.id,
                email: u.email,
                authProvider: u.authProvider,
                profile: u.profile,
                followersCount: u._count.followers,
                followingCount: u._count.following,
                publicItinerariesCount: u._count.itineraries,
                isFollowing
            };
        }));

        return res.json(result);
    } catch (error) {
        next(error);
    }
});

// ─── GET /api/profile/featured-explorers ─────────────────────────────────────
// Esploratori con almeno un itinerario pubblico, ordinati per ultima pubblicazione.
router.get('/featured-explorers', optionalAuthenticateJWT, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const limit = Math.min(Math.max(Number(req.query.limit) || 4, 1), 12);
        const currentUserId = req.user?.userId ? Number(req.user.userId) : undefined;

        const publicItineraryWhere = {
            userId: { not: null },
            OR: [
                { isPublished: true },
                { visibilityCode: 'PUBLIC' }
            ]
        };

        const ranked = await prisma.itinerary.groupBy({
            by: ['userId'],
            where: publicItineraryWhere,
            _max: { updatedAt: true },
            orderBy: { _max: { updatedAt: 'desc' } },
            take: limit
        });

        const userIds = ranked
            .map((row) => row.userId)
            .filter((id): id is number => id != null);

        if (userIds.length === 0) {
            return res.json([]);
        }

        const lastPublishedByUser = new Map(
            ranked.map((row) => [row.userId!, row._max.updatedAt])
        );

        const users = await prisma.user.findMany({
            where: {
                id: { in: userIds },
                profile: { isNot: null }
            },
            select: {
                id: true,
                email: true,
                authProvider: true,
                profile: true,
                _count: {
                    select: {
                        followers: true,
                        following: true,
                        itineraries: {
                            where: {
                                OR: [
                                    { isPublished: true },
                                    { visibilityCode: 'PUBLIC' }
                                ]
                            }
                        }
                    }
                }
            }
        });

        const usersById = new Map(users.map((u) => [u.id, u]));

        const result = await Promise.all(
            userIds.map(async (userId) => {
                const u = usersById.get(userId);
                if (!u) return null;

                let isFollowing = false;
                if (currentUserId) {
                    const follow = await prisma.follow.findUnique({
                        where: {
                            followerId_followingId: {
                                followerId: currentUserId,
                                followingId: userId
                            }
                        }
                    });
                    isFollowing = !!follow;
                }

                const lastPublishedAt = lastPublishedByUser.get(userId);

                return {
                    id: u.id,
                    email: u.email,
                    authProvider: u.authProvider,
                    profile: u.profile,
                    followersCount: u._count.followers,
                    followingCount: u._count.following,
                    publicItinerariesCount: u._count.itineraries,
                    isFollowing,
                    lastPublishedAt: lastPublishedAt ? lastPublishedAt.toISOString() : null
                };
            })
        );

        return res.json(result.filter(Boolean));
    } catch (error) {
        next(error);
    }
});

// ─── GET /api/profile/search ──────────────────────────────────────────────────
router.get('/search', optionalAuthenticateJWT, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const query = (req.query.q as string) || '';
        const limit = Number(req.query.limit) || 10;
        const currentUserId = req.user?.userId ? Number(req.user.userId) : undefined;

        if (!query || query.length < 2) {
            return res.json([]);
        }

        const terms = query.toLowerCase().split(' ').filter(Boolean);
        
        let whereClause: any = { profile: { isNot: null } };
        
        if (terms.length === 1) {
            whereClause.OR = [
                { profile: { name: { contains: terms[0], mode: 'insensitive' } } },
                { profile: { surname: { contains: terms[0], mode: 'insensitive' } } }
            ];
        } else if (terms.length >= 2) {
            whereClause.AND = [
                {
                    OR: [
                        { profile: { name: { contains: terms[0], mode: 'insensitive' } } },
                        { profile: { surname: { contains: terms[0], mode: 'insensitive' } } }
                    ]
                },
                {
                    OR: [
                        { profile: { name: { contains: terms[1], mode: 'insensitive' } } },
                        { profile: { surname: { contains: terms[1], mode: 'insensitive' } } }
                    ]
                }
            ];
        }

        const users = await prisma.user.findMany({
            where: whereClause,
            select: {
                id: true,
                email: true,
                authProvider: true,
                profile: true,
                _count: {
                    select: {
                        followers: true,
                        following: true,
                        itineraries: {
                            where: {
                                OR: [
                                    { isPublished: true },
                                    { visibilityCode: 'PUBLIC' }
                                ]
                            }
                        }
                    }
                }
            },
            take: limit
        });

        const result = await Promise.all(users.map(async (u) => {
            let isFollowing = false;
            if (currentUserId) {
                const follow = await prisma.follow.findUnique({
                    where: {
                        followerId_followingId: {
                            followerId: currentUserId,
                            followingId: u.id
                        }
                    }
                });
                isFollowing = !!follow;
            }

            return {
                id: u.id,
                email: u.email,
                authProvider: u.authProvider,
                profile: u.profile,
                followersCount: u._count.followers,
                followingCount: u._count.following,
                publicItinerariesCount: u._count.itineraries,
                isFollowing
            };
        }));

        return res.json(result);
    } catch (error) {
        next(error);
    }
});

// ─── GET /api/profile/:id ─────────────────────────────────────────────────────
router.get('/:id', authenticateJWT, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = Number(req.params.id);

        const [user, followersCount, followingCount, publicItinerariesCount] = await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                select: {
                    email: true,
                    authProvider: true,
                    profile: true,
                }
            }),
            prisma.follow.count({ where: { followingId: userId } }),
            prisma.follow.count({ where: { followerId: userId } }),
            prisma.itinerary.count({ 
                where: { 
                    userId, 
                    OR: [
                        { isPublished: true },
                        { visibilityCode: 'PUBLIC' }
                    ]
                } 
            })
        ]);

        if (!user) {
            return res.status(404).json({ error: 'Utente non trovato' });
        }

        return res.json({
            email: user.email,
            authProvider: user.authProvider,
            profile: user.profile ?? null,
            followersCount,
            followingCount,
            publicItinerariesCount
        });
    } catch (error) {
        next(error);
    }
});

// ─── PATCH /api/profile/me ────────────────────────────────────────────────────
router.patch('/me', writeLimiter, authenticateJWT, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = Number(req.user!.userId);
        const data = updateProfileSchema.parse(req.body);

        const profile = await prisma.userProfile.upsert({
            where: { userId },
            create: {
                userId,
                ...data,
                birthDate: data.birthDate ? new Date(data.birthDate) : null,
            },
            update: {
                ...data,
                birthDate: data.birthDate ? new Date(data.birthDate) : data.birthDate === null ? null : undefined,
            },
        });

        return res.json({ success: true, profile });
    } catch (error) {
        next(error);
    }
});

// ─── PATCH /api/profile/preferences ──────────────────────────────────────────
router.patch('/preferences', writeLimiter, authenticateJWT, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = Number(req.user!.userId);
        const data = updatePreferencesSchema.parse(req.body);
        const {
            travelStyles,
            interestCategoryIds,
            travelCompanion,
            travelStyle,
            pace,
            notes,
        } = data;

        const prismaData: {
            travelStyle?: string | null;
            pace?: string | null;
            travelCompanion?: string | null;
            notes?: string | null;
        } = {};

        if (travelCompanion !== undefined) prismaData.travelCompanion = travelCompanion;
        if (pace !== undefined) prismaData.pace = pace;
        if (notes !== undefined) prismaData.notes = notes;
        if (travelStyles !== undefined) {
            prismaData.travelStyle = serializeTravelStyles(travelStyles);
        } else if (travelStyle !== undefined) {
            prismaData.travelStyle = travelStyle;
        }

        const preference = await prisma.$transaction(async (tx) => {
            const pref = await tx.userPreference.upsert({
                where: { userId },
                create: {
                    userId,
                    ...prismaData,
                },
                update: prismaData,
            });

            if (interestCategoryIds !== undefined) {
                await tx.userPreferenceInterest.deleteMany({ where: { preferenceId: pref.id } });
                if (interestCategoryIds.length > 0) {
                    await tx.userPreferenceInterest.createMany({
                        data: interestCategoryIds.map((activityCategoryId) => ({
                            preferenceId: pref.id,
                            activityCategoryId,
                        })),
                    });
                }
            }

            return pref;
        });

        return res.json({
            success: true,
            preference: await formatPreferenceResponse(preference),
        });
    } catch (error) {
        next(error);
    }
});

// ─── POST /api/profile/password/send-code ─────────────────────────────────────
router.post('/password/send-code', passwordCodeLimiter, authenticateJWT, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = Number(req.user!.userId);
        const result = await authService.RequestPasswordChangeCode(userId);

        if (!result.success) {
            throw new AppError(result.message || 'Impossibile inviare il codice', 400);
        }

        return res.json({ success: true, message: result.message });
    } catch (error) {
        next(error);
    }
});

// ─── POST /api/profile/password/reset ─────────────────────────────────────────
router.post('/password/reset', writeLimiter, authenticateJWT, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = Number(req.user!.userId);
        const { code, newPassword } = changePasswordWithCodeSchema.parse(req.body);
        const result = await authService.ResetPasswordWithCode(userId, code, newPassword);

        if (!result.success) {
            throw new AppError(result.message || 'Codice non valido', 400);
        }

        return res.json({ success: true, message: result.message });
    } catch (error) {
        next(error);
    }
});

// ─── POST /api/profile/upload/avatar ──────────────────────────────────────────
router.post('/upload/avatar', writeLimiter, authenticateJWT, upload.single('image'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nessuna immagine fornita' });
        }

        const userId = Number(req.user!.userId);
        const imageUrl = req.file.path;

        await prisma.userProfile.upsert({
            where: { userId },
            create: { userId, avatarUrl: imageUrl },
            update: { avatarUrl: imageUrl },
        });

        return res.json({ success: true, url: imageUrl });
    } catch (error) {
        next(error);
    }
});

// ─── POST /api/profile/upload/background ──────────────────────────────────────
router.post('/upload/background', writeLimiter, authenticateJWT, upload.single('image'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nessuna immagine fornita' });
        }

        const userId = Number(req.user!.userId);
        const imageUrl = req.file.path;

        await prisma.userProfile.upsert({
            where: { userId },
            create: { userId, backgroundImageUrl: imageUrl },
            update: { backgroundImageUrl: imageUrl },
        });

        return res.json({ success: true, url: imageUrl });
    } catch (error) {
        next(error);
    }
});


async function deleteCloudinaryImage(url: string | null) {
    if (!url || !url.includes('cloudinary.com')) return;
    try {
        const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)\.[^.]+$/);
        if (match && match[1]) {
            await cloudinary.uploader.destroy(match[1]);
        }
    } catch (e) {
        console.error('Error deleting image from cloudinary:', e);
    }
}

// ─── DELETE /api/profile/account ──────────────────────────────────────────────
router.delete('/account', writeLimiter, authenticateJWT, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = Number(req.user!.userId);

        const profile = await prisma.userProfile.findUnique({ where: { userId } });
        if (profile?.avatarUrl) await deleteCloudinaryImage(profile.avatarUrl);
        if (profile?.backgroundImageUrl) await deleteCloudinaryImage(profile.backgroundImageUrl);

        const itineraries = await prisma.itinerary.findMany({ where: { userId } });
        for (const it of itineraries) {
            if (it.imageUrl) await deleteCloudinaryImage(it.imageUrl);
        }

        await prisma.$transaction(async (tx) => {
            const pref = await tx.userPreference.findUnique({ where: { userId } });
            if (pref) {
                await tx.userPreferenceInterest.deleteMany({ where: { preferenceId: pref.id } });
                await tx.userPreference.delete({ where: { userId } });
            }
            
            await tx.userProfile.deleteMany({ where: { userId } });
            
            await tx.follow.deleteMany({ where: { OR: [{ followerId: userId }, { followingId: userId }] } });
            
            await tx.itineraryFavorite.deleteMany({ where: { userId } });
            
            const userItins = await tx.itinerary.findMany({ where: { userId }, select: { id: true, chatSessionId: true } });
            const itinIds = userItins.map(i => i.id);
            if (itinIds.length > 0) {
                await tx.itineraryItem.deleteMany({ where: { itineraryId: { in: itinIds } } });
                await tx.itineraryFavorite.deleteMany({ where: { itineraryId: { in: itinIds } } });
                await tx.itinerary.deleteMany({ where: { userId } });
            }

            const sessions = await tx.chatSession.findMany({ where: { userId }, select: { id: true } });
            const sessionIds = sessions.map(s => s.id);
            if (sessionIds.length > 0) {
                await tx.chatMessage.deleteMany({ where: { chatId: { in: sessionIds } } });
                await tx.chatSession.deleteMany({ where: { userId } });
            }

            await tx.authSession.deleteMany({ where: { userId } });

            await tx.user.delete({ where: { id: userId } });
        });

        return res.json({ success: true, message: 'Account eliminato con successo' });
    } catch (error) {
        next(error);
    }
});

export default router;