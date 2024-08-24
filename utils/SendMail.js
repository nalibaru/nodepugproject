import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Email transporter configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.USER,
        pass: process.env.PASSWORD
    }
});

/**
 * Sends an email using predefined transporter
 * @param {string} to Recipient's email address
 * @param {string} subject Email subject
 * @param {string} text Plain text content of the email
 * @param {string} html HTML content of the email
 */
async function sendEmail(to, subject, text, html) {
    const mailOptions = {
        from: `"Your App Name" <${process.env.USER}>`, // Sender address
        to: to, // List of receivers
        subject: subject, // Subject line
        text: text, // Plain text body
        html: html // HTML body content
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Message sent: %s', info.messageId);
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
}

export default sendEmail;
