import express from 'express';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import mocktestRoutes from './routes/mocktestRoutes.js';
import timetableRoutes from './routes/timetableRoutes.js';
import eventsRoutes from './routes/eventsRoutes.js';
import userRoutes from './routes/userRoutes.js';
import auth from './routes/auth.js';
import './database.js'; 
import session from 'express-session';
import crypto from 'crypto';
import cors from 'cors';
import { sessionClearance, loginClearance } from './utils/Session.js';
import { allowAccess, allowAction } from './utils/roleLevel.js';
import { google } from 'googleapis';
import RefreshToken from './models/RefreshToken.js';
import themeRoutes from './routes/themeRoutes.js';

const secret = crypto.randomBytes(64).toString('hex');
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const port = process.env.PORT || 3001;

const app = express();

app.use(cors({
  origin: process.env.SETUP === 'dev' ? process.env.ACCESSLINK2 : process.env.ACCESSLINK1, 
  methods: 'GET,POST,PUT,DELETE', 
  allowedHeaders: 'Content-Type,Authorization' 
}));

app.use(session({
  secret: secret, 
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');



dotenv.config();

const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.SETUP === 'dev' ? process.env.REDIRECT_URL : process.env.REDIRECT_URL_PROD
); 

const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];


const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent'
});


app.get('/oauth2callback', async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).send('Authorization code is missing');
  }
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    if (tokens.refresh_token) {
      console.log('Received new refresh token:', tokens.refresh_token);
      saveRefreshToken(tokens.refresh_token);
    } else {
      console.log('No new refresh token was received, possibly existing one is still valid');
    }

    res.send('Authorization successful, you can close this window.');
  } catch (error) {
    console.error('Error during token exchange:', error);
    res.status(500).send('Authorization failed due to server error.');
  }
});


async function saveRefreshToken(refreshToken) {
    try {
        const existingToken = await RefreshToken.findOne({ active: true }).limit(1);
        if (!existingToken) {
            const updatedToken = await RefreshToken.findOneAndUpdate(
                {}, // Update the first and only document that are available
                { refreshToken: refreshToken, createDate: Date.now(), active: true },
                { new: true, upsert: true } 
            );
            console.log('Refresh token updated successfully:', updatedToken);
        } else {
            console.log('Existing token is still valid.');
        }
    } catch (error) {
        console.error('Failed to save or update refresh token:', error);
    }
}


// Use route middleware
app.use('/api/mocktest', mocktestRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/theme', themeRoutes);
app.use('/', auth);
// Static files
app.use('/public', express.static('public'));
//app.use(express.static('public'));

app.get('/login', loginClearance, (req, res) => {
  const username = req.session.username || '';
  const message = req.session.message || '';
  res.render('login/login',{message,username});
});

app.get('/', loginClearance, (req, res) => {
  const username = req.session.username || '';
  const message = req.session.message || '';
  res.render('login/login',{message,username});
});

app.get('/dashboard', (req, res) => {
  const allowAccessValue = allowAccess(req.session.role,req.session.rolelevel,"Dashboard");
  if (allowAccessValue)
  {
    const rolelevel = req.session.rolelevel;
    const username = req.session.username || '';
    const userdata = req.session.userdata;
    const role = req.session.role;
    const allowActionValue = allowAction(req.session.role, req.session.rolelevel, req.session.component, req.session.action);
    delete req.session.message;
    const tabs = [
      { id: 'Create', name: 'Dashboard', block: 'create', component : 'Dashboard'},
      { id: 'View', name: 'Profile', block: 'view', component : 'Dashboard' },
    ];
    res.render('dashboard/index',{ tabs  , username , userdata,role,rolelevel, allowAction : allowActionValue }); 
  }
  else {
    res.redirect('/unauthorize');
  }
});

app.get('/events', (req, res) => {
  const allowAccessValue = allowAccess(req.session.role,req.session.rolelevel,"Event");
  if (allowAccessValue) {
    const rolelevel = req.session.rolelevel;
    const message = req.session.message;
    req.session.component = "Event";
    req.session.action = "Create";
    const role = req.session.role;
    const data = [];
    const type = req.session.type || "add";
    delete req.session.message;
    delete req.session.type;
    const allowActionValue = allowAction(req.session.role, req.session.rolelevel, req.session.component, req.session.action);
    const tabs = [
      { id: 'Create', name: 'Create Event', block: 'create', component: 'Event' },
      { id: 'View', name: 'View Event', block: 'view', component: 'Event' },
      { id: 'Assign', name: 'Assigned Event', block: 'assign', component: 'Event' }
    ];
    res.render('event/events', { data, tabs, message: message, type: type, role, rolelevel, allowAction : allowActionValue});
  }
  else {
    res.redirect('/unauthorize'); 
  }
});

app.get('/timetable', (req, res) => {
  const allowAccessValue = allowAccess(req.session.role,req.session.rolelevel,"TimeTable");
  if (allowAccessValue) {
    const rolelevel = req.session.rolelevel;
    const message = req.session.message;
    const role = req.session.role;
    const data = [];
    delete req.session.message;
    req.session.component = "TimeTable";
    req.session.action = "Create";
    const allowActionValue = allowAction(req.session.role, req.session.rolelevel, req.session.component, req.session.action);
    const tabs = [
      { id: 'Create', name: 'Create Timetable', block: 'create', component: 'TimeTable' },
      { id: 'View', name: 'View Timetable', block: 'view', component: 'TimeTable' }
    ];
    res.render('timetable/timetable', { data, tabs, message: message, role, rolelevel,allowAction:allowActionValue });
  }
  else {
    res.redirect('/unauthorize'); 
  }
});

app.get('/mocktest', (req, res) => {
  const allowAccessValue = allowAccess(req.session.role,req.session.rolelevel,"MockTest");
  if (allowAccessValue) {
    const rolelevel = req.session.rolelevel;
    const tabs = [
      { id: 'Create', name: 'Create Mock Test', block: 'create', component: 'MockTest' },
      { id: 'View', name: 'View Mock Tests', block: 'view', component: 'MockTest' },
      { id: 'Assign', name: 'Assigned MockTest', block: 'assign', component: 'MockTest' },
      { id: 'Search', name: 'Search MockTest', block: 'search', component: 'MockTest' },
      { id: 'QSearch', name: 'Search Question', block: 'questsearch', component: 'MockTest' },
      { id: 'Submit', name: 'Submitted Mocktest', block: 'submit', component: 'MockTest'  }
    ];
    req.session.component = "MockTest";
    req.session.action = "Create";
    const allowActionValue = allowAction(req.session.role, req.session.rolelevel, req.session.component, req.session.action);
    const role = req.session.role;
    res.render('mt/mocktest', { tabs, role, rolelevel,allowAction :allowActionValue });
  }
  else {
    res.redirect('/unauthorize');
  }
});

app.get('/mocktest1', (req, res) => {
  const allowAccessValue = allowAccess(req.session.role,req.session.rolelevel,"MockTest");
  if (allowAccessValue) {
    const rolelevel = req.session.rolelevel;
    const tabs = [
      { id: 'Create', name: 'Create Mock Test', block: 'create', component: 'MockTest' }
    ];
    req.session.component = "MockTest";
    req.session.action = "Create";
    const allowActionValue = allowAction(req.session.role, req.session.rolelevel, req.session.component, req.session.action);
    const role = req.session.role;
    res.render('mt/mtform', { tabs, role, rolelevel,allowAction :allowActionValue });
  }
  else {
    res.redirect('/unauthorize');
  }
});

app.get('/user', (req, res) => {
  const allowAccessValue = allowAccess(req.session.role,req.session.rolelevel,"User");
  if (allowAccessValue) {
    req.session.component = "User";
    const role = req.session.role;
    const rolelevel = req.session.rolelevel;
    const message = req.session.message;
    const title = req.session.title || "Add User";
    const type = req.session.type || "add";
    delete req.session.message;
    delete req.session.title;
    delete req.session.type;
    const allowActionValue = allowAction(req.session.role, req.session.rolelevel, req.session.component, req.session.action);
    res.render('layout/userlayout', { message: message, title: title, type: type, data: {}, role, rolelevel,allowAction : allowActionValue,authUrl : authUrl });
  }
  else {
    res.redirect('/unauthorize');
  }
});

app.get('/logout',sessionClearance, (req, res) => {
  const username = req.session.username || '';
  const message = `logged out successfully.`;
  res.render('login/login',{message,username});
});

app.get('/changepassword', (req, res) => {
  const username = req.session.username;
  const message = req.session.message;
  if (!username) {
    return res.status(401).json({ message: "Unauthorized access" });
  }
  res.render('login/changepassword', { username,message });
});

app.get('/unauthorize', sessionClearance, (req, res) => {
  res.render('unauthorised');
});

app.get('/unauthorizeapi', (req, res) => {
  res.status(401).json({
    error_message: "Unauthorized to perform the operation",
    status : "REQUEST_DENIED"
  });
});


app.get('/api/session-message', (req, res) => {
  const message = req.session.message;
  delete req.session.message; // Clear the message after sending it
  res.json({ message });
});

if (process.env.SETUP === 'dev')
{
app.listen(port, () => {
  console.log(`Server is listening at http://localhost:${port}`);
});
}
else {
  app.listen(port, () => {
    const link = process.env.SERVER_URL;
    console.log(`Server is listening at ${link}`);
  });
}
