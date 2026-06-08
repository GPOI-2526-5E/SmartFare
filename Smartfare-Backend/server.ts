import { createApp } from './src/app';

const PORT = process.env.PORT || 3000;
const app = createApp();

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    try {
        app.listen(PORT, () => {
            console.log(`🗺️ Server avviato su http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Errore avvio server:', error);
        process.exit(1);
    }
}

export default app;