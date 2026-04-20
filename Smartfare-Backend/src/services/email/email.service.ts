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
            <title>Reset Password</title>
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    background-color: #f4f4f4;
                    font-family: Arial, Helvetica, sans-serif;
                    color: #333333;
                }
                .wrapper {
                    padding: 30px 15px;
                }
                .container {
                    background-color: #ffffff;
                    max-width: 600px;
                    margin: 0 auto;
                    border: 1px solid #e0e0e0;
                }
                .header {
                    padding: 20px 30px 15px;
                }
                .logo-text {
                    font-size: 28px;
                    font-weight: 900;
                    color: #000000;
                    margin: 0;
                    letter-spacing: -1px;
                    display: flex;
                    align-items: center;
                }
                .divider {
                    height: 5px;
                    background-color: #666666;
                    width: 100%;
                }
                .content {
                    padding: 40px 30px;
                    font-size: 15px;
                    line-height: 1.5;
                }
                .content p {
                    margin-bottom: 20px;
                    color: #333333;
                }
                .bold {
                    font-weight: bold;
                }
                a {
                    color: #0077cc;
                    text-decoration: underline;
                }
                .highlight {
                    background-color: #fff2cc;
                }
            </style>
        </head>
        <body>
            <div class="wrapper">
                <div class="container">
                    <div class="header">
                        <div class="logo-text">
                            <img src="cid:smartfarelogo" alt="Logo" style="height: 36px; vertical-align: middle; margin-right: 12px; border: 0;" />
                            <span style="vertical-align: middle;">SMARTFARE</span>
                        </div>
                    </div>
                    <div class="divider"></div>
                    
                    <div class="content">
                        <p>Ciao,</p>
                        
                        <p>Per azzerare la password del tuo account SmartFare, clicca <a href="${resetLink}" target="_blank">qui</a>.</p>
                        
                        <p>Se avevi già effettuato una richiesta di modifica della password, solo il link contenuto in questa email è valido.</p>
                        
                        <br>
                        <p class="bold">Se invece non eri tu:</p>
                        <p>Il tuo account SmartFare potrebbe essere stato compromesso e dovresti seguire alcuni passaggi per renderlo sicuro. Prima di tutto, <a href="${resetLink}" target="_blank">ripristina subito la <span class="highlight">password</span></a>. Se non hai ancora aggiunto la verifica in due passaggi al tuo account, ti consigliamo di attivarla subito per migliorare la sicurezza del tuo account e prevenire accessi non autorizzati.</p>
                        
                        <br><br>
                        <p>Cordialmente,</p>
                        <p>Il team SmartFare</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        `;

        try {
            const fromEmail = process.env.SMTP_USER 
                ? `"SmartFare Support" <${process.env.SMTP_USER}>` 
                : '"SmartFare Support" <support@smartfare.com>';

            const path = require('path');
            const logoPath = path.resolve(process.cwd(), 'assets', 'logo.png');

            const info = await this.transporter.sendMail({
                from: fromEmail,
                to: to,
                subject: "Recupero Password Account - SmartFare Tickets",
                html: htmlTemplate,
                attachments: [
                    {
                        filename: 'logo.png',
                        path: logoPath,
                        cid: 'smartfarelogo' // Mappato all'img tag src="cid:smartfarelogo"
                    }
                ]
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
