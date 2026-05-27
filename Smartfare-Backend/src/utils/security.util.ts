import xss from 'xss';
import axios from 'axios';

// ─── XSS Sanitization ─────────────────────────────────────────────────────────
// Rimuove completamente tutti i tag HTML/JavaScript da una stringa
const xssOptions = {
    whiteList: {},          // nessun tag HTML permesso
    stripIgnoreTag: true,   // rimuove i tag non in whitelist invece di escaparli
    stripIgnoreTagBody: ['script', 'style', 'iframe', 'object', 'embed'],
};

/**
 * Sanitizza un campo di testo rimuovendo qualsiasi HTML, script o contenuto malevolo.
 */
export function sanitizeText(input: string): string {
    if (!input || typeof input !== 'string') return input;
    return xss(input.trim(), xssOptions);
}

// ─── Local Blocklist — Keyword / Domain ───────────────────────────────────────
/**
 * Parole chiave/domini bloccati a livello locale (nessuna API richiesta).
 * Coprono: siti per adulti, pornografia, cam-site, escort, gambling illecito,
 * warez, pharma-spam e pattern generici di phishing.
 */
const BLOCKED_KEYWORDS: string[] = [
    // ── Adulti / pornografia ──────────────────────────────────────────────────
    'pornhub', 'xvideos', 'xhamster', 'xnxx', 'redtube', 'youporn',
    'tube8', 'spankbang', 'beeg', 'thumbzilla', 'xtube', 'xbabe',
    'drtuber', 'hardsextube', 'alphaporno', 'empflix', 'sunporno',
    'tnaflix', 'eporner', 'hclips', 'eroprofile', 'nuvid', 'pornmd',
    'txxx', 'porntube', 'proporn', 'fuq.com', 'hdzog', 'jetporn',
    'anysex', 'bravoteens', 'sexvid', 'fullporner', 'vidlox', 'porndoe',
    'boyfriendtv', 'ok.xxx', 'slutload', 'redporntube', 'tubegalore',
    'onlyfans', 'fansly', 'manyvids', 'admireme', 'unfiltrd', 'fancentro',
    'brazzers', 'bangbros', 'realitykings', 'mofos', 'fakehub',
    'nubiles', 'digitalplayground', 'wankz', 'babes.com', 'kink.com',
    'badoinkvr', 'naughtyamerica', 'sexart', 'metart', 'hegre',
    'atkgalleria', 'abbywinters', 'suicidegirls',
    // Pattern generici
    'porn', 'xxx', 'hentai', 'nsfw', 'lolicon', 'shotacon',
    // ── Cam / live streaming adulti ──────────────────────────────────────────
    'chaturbate', 'cam4', 'bongacams', 'stripchat', 'livejasmin',
    'myfreecams', 'camsoda', 'flirt4free', 'streamate', 'imlive',
    'jerkmate', 'cherry.tv', 'stripper', 'escort',
    // ── Gambling illegale / scommesse ─────────────────────────────────────────
    'bestcasino', 'casino777', 'slotsmoney', 'pokerstars.eu',
    'bwin.party', 'betsson', '1xbet', 'mostbet', 'linebet',
    'megapari', 'betchan', 'parimatch', 'vbet', 'inbet',
    // ── Pharma spam ──────────────────────────────────────────────────────────
    'buydrugs', 'cheapmeds', 'onlinepharmacy', 'rxpills',
    'rxstore', 'generics24', 'med-store', 'cheapviagra',
    'cialisonline', 'canadianpharmacy', 'bestpills',
    // ── Warez / pirateria ────────────────────────────────────────────────────
    'warez', 'nulled.to', 'nulled.io', 'crackstations',
    'piratebay', 'kickasstorrents', 'torrentz', 'rarbg',
    'keygen', 'serial-key', 'serialcrack', 'crackwatch',
    'appnee', 'getintopc', 'filecr.com', 'crackingpatching',
    // ── Phishing / spam patterns ──────────────────────────────────────────────
    'free-iphone', 'free-money', 'win-prize', 'click-here-to-win',
    'congratulations-you-won', 'giveaway-claim', 'verify-account-now',
    'account-suspended-login', 'paypal-verify', 'amazon-prize',
    'netflix-billing', 'apple-id-locked', 'microsoft-warning',
    // ── Malware / exploit noti ────────────────────────────────────────────────
    'exploit.in', 'malware.com', 'hackforums.net', 'nulled.ch',
    'darkweb', 'deepweb.onion',
];

/**
 * TLD (estensioni dominio) frequentemente abusati per spam/phishing.
 * Non bloccati al 100% — usati come segnale di rischio prima della chiamata API.
 */
const HIGH_RISK_TLDS = new Set([
    '.tk', '.ml', '.ga', '.cf', '.gq',     // Freenom gratuiti, massiccio abuso
    '.xyz', '.top', '.click', '.download',  // Spam
    '.stream', '.racing', '.accountant',
    '.science', '.faith', '.date',
    '.bid', '.review', '.trade',
    '.cricket', '.party', '.win',
    '.loan', '.gdn', '.men',
    '.work', '.porn', '.adult', '.sex',     // Espliciti
]);

// ─── In-Memory URL Safety Cache ────────────────────────────────────────────────
interface CacheEntry { safe: boolean; expiresAt: number; }
const urlCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 ora

function getCached(url: string): boolean | null {
    const entry = urlCache.get(url);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) { urlCache.delete(url); return null; }
    return entry.safe;
}

function setCache(url: string, safe: boolean): void {
    // Tieni la cache sotto i 2000 URL per evitare memory leak
    if (urlCache.size >= 2000) {
        const firstKey = urlCache.keys().next().value;
        if (firstKey !== undefined) urlCache.delete(firstKey);
    }
    urlCache.set(url, { safe, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ─── Heuristic Checks (senza API) ─────────────────────────────────────────────
function passesHeuristicChecks(url: string): { ok: boolean; reason?: string } {
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        return { ok: false, reason: 'URL non valido' };
    }

    // Solo http/https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
        return { ok: false, reason: `Protocollo non consentito: ${parsed.protocol}` };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Blocca indirizzi IP diretti (IPv4 e IPv6)
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
        return { ok: false, reason: 'IP diretto non consentito' };
    }
    if (hostname.startsWith('[') && hostname.endsWith(']')) {
        return { ok: false, reason: 'IPv6 non consentito' };
    }

    // Blocca reti private/localhost
    const privatePatterns = ['localhost', '127.', '0.0.0.0', '192.168.', '10.', '172.16.'];
    if (privatePatterns.some(p => hostname.startsWith(p) || hostname === p.replace('.', ''))) {
        return { ok: false, reason: 'Rete privata/localhost non consentita' };
    }

    // Troppi sottodomini (> 4 punti) = sospetto
    const dotCount = (hostname.match(/\./g) || []).length;
    if (dotCount > 4) {
        return { ok: false, reason: 'Troppi sottodomini' };
    }

    // Controlla TLD ad alto rischio
    for (const tld of HIGH_RISK_TLDS) {
        if (hostname.endsWith(tld)) {
            return { ok: false, reason: `TLD sospetto: ${tld}` };
        }
    }

    // Lunghezza hostname eccessiva (dominio randomico di phishing)
    if (hostname.length > 100) {
        return { ok: false, reason: 'Dominio troppo lungo' };
    }

    // Presenza di @ nell'URL (trucco phishing: user@evil.com/paypal.com)
    if (parsed.username || parsed.password) {
        return { ok: false, reason: 'URL con credenziali incorporate non consentito' };
    }

    return { ok: true };
}

// ─── Google Safe Browsing API v4 ──────────────────────────────────────────────
const SAFE_BROWSING_KEY = process.env.GOOGLE_SAFE_BROWSING_API_KEY;
const SAFE_BROWSING_ENDPOINT = 'https://safebrowsing.googleapis.com/v4/threatMatches:find';

/**
 * Controlla l'URL contro il database Google Safe Browsing.
 * Copre: malware, phishing, social engineering, software indesiderato.
 * Restituisce true se l'URL è sicuro (o se l'API non è configurata/non risponde).
 */
async function checkSafeBrowsing(url: string): Promise<boolean> {
    if (!SAFE_BROWSING_KEY || SAFE_BROWSING_KEY === 'your_safe_browsing_api_key_here') {
        // Chiave non configurata: salta la verifica remota
        return true;
    }

    try {
        const response = await axios.post(
            `${SAFE_BROWSING_ENDPOINT}?key=${SAFE_BROWSING_KEY}`,
            {
                client: { clientId: 'smartfare-backend', clientVersion: '1.0.0' },
                threatInfo: {
                    threatTypes: [
                        'MALWARE',
                        'SOCIAL_ENGINEERING',       // phishing
                        'UNWANTED_SOFTWARE',
                        'POTENTIALLY_HARMFUL_APPLICATION',
                    ],
                    platformTypes: ['ANY_PLATFORM'],
                    threatEntryTypes: ['URL'],
                    threatEntries: [{ url }],
                },
            },
            { timeout: 4000 }  // 4 secondi max
        );

        // Se `matches` è presente e non vuoto → URL pericoloso
        const isUnsafe = response.data?.matches && response.data.matches.length > 0;
        if (isUnsafe) {
            console.warn(`[Security] URL bloccato da Google Safe Browsing: ${url}`);
        }
        return !isUnsafe;
    } catch (err) {
        // In caso di errore API → fail open (non bloccare l'utente)
        console.warn('[Security] Google Safe Browsing API non disponibile:', err instanceof Error ? err.message : err);
        return true;
    }
}

// ─── Main: isSafeUrl (async) ───────────────────────────────────────────────────
/**
 * Verifica che un URL sia sicuro e consentito.
 * Pipeline:
 *   1. Cache in memoria
 *   2. Blocklist locale (parole chiave dominio)
 *   3. Controlli euristici (IP, TLD, localhost, @-trick)
 *   4. Google Safe Browsing API (malware/phishing/social engineering)
 *
 * @returns Promise<true> se l'URL è consentito, Promise<false> se va bloccato.
 */
export async function isSafeUrl(url: string | null | undefined): Promise<boolean> {
    if (!url) return true; // campo opzionale nullable → OK se assente

    // 1. Cache
    const cached = getCached(url);
    if (cached !== null) return cached;

    const lowerUrl = url.toLowerCase();

    // 2. Blocklist locale
    for (const keyword of BLOCKED_KEYWORDS) {
        if (lowerUrl.includes(keyword)) {
            setCache(url, false);
            return false;
        }
    }

    // 3. Euristiche
    const heuristic = passesHeuristicChecks(url);
    if (!heuristic.ok) {
        setCache(url, false);
        return false;
    }

    // 4. Google Safe Browsing
    const safe = await checkSafeBrowsing(url);
    setCache(url, safe);
    return safe;
}

// ─── Date Validation ───────────────────────────────────────────────────────────
const MIN_BIRTH_YEAR = 1900;
const MIN_AGE_YEARS  = 13;

/**
 * Verifica che una data di nascita sia valida:
 * - Non nel futuro
 * - Non precedente al 1900
 * - L'utente deve avere almeno 13 anni
 */
export function isValidBirthDate(date: string | null | undefined): boolean {
    if (!date) return true;
    try {
        const birth = new Date(date);
        if (isNaN(birth.getTime())) return false;

        const now = new Date();

        if (birth > now) return false;                    // futuro
        if (birth.getFullYear() < MIN_BIRTH_YEAR) return false;  // troppo vecchia

        const minAgeDate = new Date(now);
        minAgeDate.setFullYear(now.getFullYear() - MIN_AGE_YEARS);
        if (birth > minAgeDate) return false;             // under-13

        return true;
    } catch {
        return false;
    }
}

// ─── Malicious String Detection ────────────────────────────────────────────────
// Nota: Prisma usa query parametrizzate → nativamente immune a SQL Injection.
// Questa funzione aggiunge un layer difensivo aggiuntivo sui campi di testo.
const SUSPICIOUS_PATTERNS: RegExp[] = [
    /(<script[\s\S]*?>[\s\S]*?<\/script>)/gi,
    /(javascript\s*:)/gi,
    /(on\w+\s*=\s*["']?[^"'>]*["']?)/gi,     // onload=, onclick=, onerror=…
    /(\bUNION\b.{0,30}\bSELECT\b)/gi,
    /(\bDROP\b.{0,20}\bTABLE\b)/gi,
    /(\bINSERT\b.{0,20}\bINTO\b)/gi,
    /(\bDELETE\b.{0,20}\bFROM\b)/gi,
    /(\bUPDATE\b.{0,20}\bSET\b)/gi,
    /(\bEXEC\b\s*\()/gi,
    /(\bxp_cmdshell\b)/gi,
    /(--\s*$)/gm,       // commento SQL di fine riga
    /(\/\*[\s\S]*?\*\/)/g,                    // blocco commento SQL
    /(%27|%22|%3C|%3E|%0A|%0D)/gi,           // URL-encoded caratteri pericolosi
    /(\\x[0-9a-f]{2})/gi,                    // hex escape
];

/**
 * Controlla se una stringa contiene pattern SQL Injection o XSS.
 * Restituisce true se la stringa è sicura.
 */
export function isSafeString(input: string | null | undefined): boolean {
    if (!input) return true;
    for (const pattern of SUSPICIOUS_PATTERNS) {
        pattern.lastIndex = 0;
        if (pattern.test(input)) {
            pattern.lastIndex = 0;
            return false;
        }
    }
    return true;
}
