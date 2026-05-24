import prisma from '../config/prisma';



export const AI_PREFERENCE_PRIORITY_RULE = [
  'REGOLE PRIORITÀ PREFERENZE (obbligatorio):',
  '1. Se il messaggio corrente dell\'utente contiene una richiesta esplicita e specifica (es. "voglio andare in discoteca stasera", "aggiungi un museo"), quella richiesta HA PRIORITÀ sulle preferenze salvate e sulle note personali.',
  '2. Le preferenze salvate e le note sono il DEFAULT quando crei o completi un itinerario con libertà creativa, quando l\'utente non specifica diversamente.',
  '3. In caso di contrasto tra note (es. "no discoteche") e richiesta esplicita nel messaggio corrente, esegui la richiesta esplicita; puoi menzionare brevemente il contrasto se utile.',
].join('\n');

export type UserPreferenceForAi = {
  age: number | null;
  travelCompanion: string | null;
  travelStyles: string[];
  pace: string | null;
  interestCategories: string[];
  notes: string | null;
};

export function parseTravelStyles(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  return [...new Set(raw.split(',').map((part) => part.trim()).filter(Boolean))];
}

export function serializeTravelStyles(styles: string[] | undefined | null): string | null {
  if (!styles?.length) return null;
  const unique = [...new Set(styles.map((style) => style.trim()).filter(Boolean))];
  return unique.length ? unique.join(',') : null;
}

export function buildUserPreferencePromptBlock(ctx: UserPreferenceForAi | null): string | null {
  if (!ctx) return null;

  const parts: string[] = [];
  if (ctx.age) parts.push(`- Età approssimativa: ${ctx.age} anni`);
  if (ctx.travelCompanion) {
    const map: Record<string, string> = {
      'SOLO': 'Da solo',
      'COUPLE': 'In coppia',
      'FAMILY': 'In famiglia (con bambini)',
      'GROUP': 'In gruppo',
    };
    parts.push(`- Compagnia di viaggio: ${map[ctx.travelCompanion] || ctx.travelCompanion}`);
  }
  if (ctx.travelStyles.length) parts.push(`- Stili di viaggio: ${ctx.travelStyles.join(', ')}`);
  if (ctx.pace) parts.push(`- Ritmo preferito: ${ctx.pace}`);
  if (ctx.interestCategories.length) {
    parts.push(`- Interessi principali: ${ctx.interestCategories.join(', ')}`);
  }
  if (ctx.notes?.trim()) parts.push(`- Note personali: "${ctx.notes.trim()}"`);

  if (parts.length === 0) return null;

  return [
    'Profilo preferenze salvate (default per pianificazione libera):',
    parts.join('\n'),
    '',
    AI_PREFERENCE_PRIORITY_RULE,
  ].join('\n');
}

function computeAge(birthDate: Date | null | undefined): number | null {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const hasBirthdayPassed =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  if (!hasBirthdayPassed) age -= 1;
  return age > 0 ? age : null;
}

export async function loadUserPreferenceForAi(userId: number): Promise<UserPreferenceForAi | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        profile: { select: { birthDate: true } },
        preference: {
          select: {
            travelCompanion: true,
            travelStyle: true,
            pace: true,
            notes: true,
            userPreferenceInterests: {
              select: { activityCategoryId: true },
            },
          },
        },
      },
    });

    if (!user?.preference) {
      const ageOnly = computeAge(user?.profile?.birthDate);
      if (!ageOnly) return null;
      return {
        age: ageOnly,
        travelCompanion: null,
        travelStyles: [],
        pace: null,
        interestCategories: [],
        notes: null,
      };
    }

    const categoryIds = user.preference.userPreferenceInterests.map((row) => row.activityCategoryId);
    const categories = categoryIds.length
      ? await prisma.activityCategory.findMany({
          where: { id: { in: categoryIds } },
          select: { name: true },
        })
      : [];

    return {
      age: computeAge(user.profile?.birthDate),
      travelCompanion: user.preference.travelCompanion ?? null,
      travelStyles: parseTravelStyles(user.preference.travelStyle),
      pace: user.preference.pace ?? null,
      interestCategories: categories.map((category) => category.name).filter(Boolean) as string[],
      notes: user.preference.notes ?? null,
    };
  } catch {
    return null;
  }
}
