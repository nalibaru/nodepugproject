import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import RefreshToken from '../models/RefreshToken.js';

dotenv.config();

const { OAuth2 } = google.auth;

async function getOAuth2Client() {
    const refreshTokenEntry = await RefreshToken.findOne({ active: true }).exec();
    if (!refreshTokenEntry) {
        throw new Error("No active refresh token found.");
    }

    const oauth2Client = new OAuth2(
        process.env.CLIENT_ID,
        process.env.CLIENT_SECRET,
        process.env.SETUP === 'dev' ? process.env.REDIRECT_URL : process.env.REDIRECT_URL_PROD
    );

    oauth2Client.setCredentials({ refresh_token: refreshTokenEntry.refreshToken });
    return oauth2Client;
}

async function sendEmail(mailId, subject, text, html) {
    try {
        const oauth2Client = await getOAuth2Client();
        const savedToken = await RefreshToken.findOne({ active: true });

        if (!savedToken.accessToken || new Date() > new Date(savedToken.accessTokenExpiry)) {
            const accessTokenResponse = await oauth2Client.getAccessToken();
            if (!accessTokenResponse.token) {
                throw new Error("Failed to retrieve access token.");
            }

            const expiryDate = new Date(Date.now() + 3600 * 1000); // Corrected expiry to 1 hour
            await RefreshToken.updateOne({ active: true }, {
                accessToken: accessTokenResponse.token,
                accessTokenExpiry: expiryDate
            });

            savedToken.accessToken = accessTokenResponse.token;
            savedToken.accessTokenExpiry = expiryDate;
        }

       /* console.log("Refresh token"+savedToken.refreshToken);
        console.log("Access token"+savedToken.accessToken || '');
        console.log("user"+process.env.MAIL_USER);
        console.log("client_id"+process.env.CLIENT_ID);
        console.log("client_secret"+process.env.CLIENT_SECRET); */
       

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: process.env.MAIL_USER,
                clientId: process.env.CLIENT_ID,
                clientSecret: process.env.CLIENT_SECRET,
                refreshToken: savedToken.refreshToken,
                accessToken: savedToken.accessToken
            }
        });

        const mailOptions = {
            from: `Flamingo <${process.env.MAIL_USER}>`,
            to: mailId,
            subject: subject,
            text: text,
            html: html
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('Email sent:', result);
        return result;
    } catch (error) {
        console.error('Failed to send email:', error);
        throw error; 
    }
}

export default sendEmail;
