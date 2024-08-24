import { google } from 'googleapis';
import dotenv from 'dotenv';
import base64 from 'base-64';
import RefreshToken from '../models/RefreshToken.js';

dotenv.config();

const { OAuth2 } = google.auth;

async function getAuthenticatedClient() {
    const oauth2Client = new OAuth2(
        process.env.CLIENT_ID,
        process.env.CLIENT_SECRET,
        process.env.SETUP === 'dev' ? process.env.REDIRECT_URL : process.env.REDIRECT_URL_PROD
    );

    const refreshTokenEntry = await RefreshToken.findOne({ active: true }).exec();
    if (!refreshTokenEntry) {
        throw new Error("No active refresh token found.");
    }
    oauth2Client.setCredentials({
        refresh_token: refreshTokenEntry.refreshToken
    });

    return oauth2Client;
}

async function sendEmailUsingGmailAPI(to, subject, messageText) {
    const oauth2Client = await getAuthenticatedClient();
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const emailLines = [
        `From: "Flamingo" <${process.env.MAIL_USER}>`,
        `To: ${to}`,
        "Content-type: text/html;charset=iso-8859-1",
        "MIME-Version: 1.0",
        `Subject: ${subject}`,
        "",
        messageText
    ];

    const email = emailLines.join('\r\n').trim();
    const base64EncodedEmail = base64.encode(email).replace(/\+/g, '-').replace(/\//g, '_');
    
    try {
        const response = await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: base64EncodedEmail
            }
        });
        console.log('Email sent:', response.data);
        return response.data;
    } catch (error) {
        console.error('Failed to send email via Gmail API:', error);
        throw error;
    }
}

export default sendEmailUsingGmailAPI;
