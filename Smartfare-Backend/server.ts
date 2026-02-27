import { createApp } from './src/app';
import { connectDatabase, disconnectDatabase } from './src/config/database';

const PORT = process.env.PORT || 3007; 
const app = createApp();

async function startServer() {
    try {
        await connectDatabase();

        app.listen(PORT, () => {
            console.log(`🚂 Server listening on port ${PORT}`);
        });
    } catch (error) {
        console.error('Errore avvio server:', error);
        await disconnectDatabase();
        process.exit(1);
    }
}

startServer();