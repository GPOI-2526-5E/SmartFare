import nodemailer from 'nodemailer';

export class EmailService {
    private transporter: nodemailer.Transporter | null = null;
    
    constructor() {
        this.init();
    }
    
    private async init() {
        // Usa le variabili d'ambiente in produzione, altrimenti crea un test account con Ethereal
        if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
            this.transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT),
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });
        } else {
            console.warn("⚠️ Nessun SMTP_HOST/PORT trovato, generazione Ethereal test account in corso...");
            try {
                const testAccount = await nodemailer.createTestAccount();
                this.transporter = nodemailer.createTransport({
                    host: "smtp.ethereal.email",
                    port: 587,
                    secure: false, // true for 465, false for other ports
                    auth: {
                        user: testAccount.user, // generated ethereal user
                        pass: testAccount.pass, // generated ethereal password
                    },
                });
                console.log(`✅ Ethereal test account pronto: ${testAccount.user}`);
            } catch (err) {
                console.error("❌ Errore durante la creazione dell'account Ethereal", err);
            }
        }
    }
    
    public async sendPasswordResetEmail(to: string, resetLink: string) {
        if (!this.transporter) {
            // Attendi inizializzazione o gestisci l'errore
            await new Promise(resolve => setTimeout(resolve, 2000));
            if (!this.transporter) {
                console.error("Nessun transporter configurato per inviare l'email");
                return;
            }
        }

        const htmlTemplate = `
        <!DOCTYPE html>
        <html lang="it">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Password - SmartFare</title>
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    background-color: #05080e;
                    background-image: radial-gradient(circle at 50% 50%, rgba(8, 12, 20, 0.6) 0%, rgba(5, 8, 14, 0.95) 100%);
                    font-family: 'Inter', system-ui, -apple-system, sans-serif;
                    color: #f8fafc;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                }
                .container {
                    background: rgba(18, 24, 38, 0.55);
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    border-radius: 28px;
                    padding: 40px;
                    max-width: 500px;
                    width: 100%;
                    box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.03) inset;
                    text-align: center;
                    margin: 40px auto;
                }
                .logo-text {
                    font-size: 2.4rem;
                    font-weight: 800;
                    margin: 0 0 0.75rem;
                    letter-spacing: -0.04em;
                    color: #fff;
                    text-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                }
                .text-accent {
                    color: #7ea8ff;
                }
                h2 {
                    margin-top: 20px;
                    font-size: 24px;
                    font-weight: 600;
                    color: #fff;
                    margin-bottom: 16px;
                }
                p {
                    color: #94a3b8;
                    line-height: 1.6;
                    font-size: 16px;
                    margin-bottom: 30px;
                }
                .button {
                    display: inline-block;
                    background: linear-gradient(135deg, #4f8cff 0%, #2563eb 100%);
                    color: #ffffff;
                    text-decoration: none;
                    padding: 16px 32px;
                    border-radius: 14px;
                    font-weight: 600;
                    font-size: 18px;
                    box-shadow: 0 10px 25px -5px rgba(37, 99, 235, 0.4);
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                .footer {
                    margin-top: 40px;
                    font-size: 12px;
                    color: #64748b;
                    border-top: 1px solid rgba(255, 255, 255, 0.05);
                    padding-top: 20px;
                }
                .warn {
                    color: #cbd5e1;
                    font-size: 14px;
                    margin-top: 20px;
                    opacity: 0.8;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="logo-text">Smart<span class="text-accent">Fare</span></div>
                <h2>Richiesta Recupero Password</h2>
                <p>Abbiamo ricevuto la tua richiesta per accedere di nuovo al tuo account SmartFare. Clicca sul pulsante qui sotto per ripristinare il tuo accesso con una nuova password sicura.</p>
                <a href="${resetLink}" class="button" target="_blank" style="color: white; text-decoration: none;">Reimposta la Password</a>
                <p class="warn">Il link di sicurezza scadrà automaticamente tra 10 minuti dal momento della richiesta per proteggere il tuo account.</p>
                <div class="footer">
                    &copy; 2026 SmartFare. Innovating your smart travels.<br>
                    Se il pulsante non funziona, puoi incollare il seguente link nel browser:<br>
                    <span style="color: #7ea8ff">${resetLink}</span>
                </div>
            </div>
        </body>
        </html>
        `;

        try {
            const fromEmail = process.env.SMTP_USER 
                ? `"SmartFare Support" <${process.env.SMTP_USER}>` 
                : '"SmartFare Support" <support@smartfare.com>';

            const info = await this.transporter.sendMail({
                from: fromEmail,
                to: to,
                subject: "Recupero Password Account - SmartFare Tickets",
                html: htmlTemplate,
            });

            console.log("Message sent: %s", info.messageId);
            const testUrl = nodemailer.getTestMessageUrl(info);
            if (testUrl) {
                console.log("Preview URL: %s", testUrl);
            }
        } catch (error) {
            console.error("Errore durante l'invio dell'email:", error);
            throw new Error("Errore durante l'invio dell'email");
        }
    }
}
