import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const sendEmail = async (toEmail, subject, content, isHtml = false) => {
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;
    
    const transporter = nodemailer.createTransport({
        host: 'smtp-relay.brevo.com',
        port: 587,
        secure: false,
        auth: {
            user: user, 
            pass: pass, 
        },
        debug: true 
    });

    const mailOptions = {
        from: user, 
        to: toEmail, 
        subject: subject,
        // Use either html or text based on the isHtml parameter
        ...(isHtml ? { html: content } : { text: content })
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, error: error.message };
    }
};

export { sendEmail };