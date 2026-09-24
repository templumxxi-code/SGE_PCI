const nodemailer = require('nodemailer');

const getTransporter = () => {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) return null;

    return nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT || 587),
        secure: String(SMTP_PORT || '587') === '465',
        auth: { user: SMTP_USER, pass: SMTP_PASSWORD }
    });
};

const sendPasswordResetEmail = async (email, resetUrl) => {
    const transporter = getTransporter();
    if (!transporter) throw new Error('Serviço de email não configurado');

    await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: 'Redefinição de senha - SGE PCI/RN',
        text: `Use este link para redefinir sua senha: ${resetUrl}\n\nO link expira em ${process.env.PASSWORD_RESET_TTL_MINUTES || 30} minutos e pode ser usado uma única vez.`,
        html: `<p>Recebemos uma solicitação para redefinir sua senha.</p><p><a href="${resetUrl}">Redefinir minha senha</a></p><p>O link expira em ${process.env.PASSWORD_RESET_TTL_MINUTES || 30} minutos e pode ser usado uma única vez.</p>`
    });
};

module.exports = { sendPasswordResetEmail };