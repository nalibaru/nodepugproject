import express from 'express';
import bcrypt from 'bcrypt'; 
import jwt from 'jsonwebtoken'; 
import User from '../models/User.js';
import UserInfo from '../models/UserInfo.js';
import cors from 'cors';
const router = express.Router();
const jwtSecret = process.env.JWT_SECRET || '1234567890';
import dotenv from 'dotenv';
import { formattedDate } from '../utils/DateConversion.js'
import { roleLevel } from '../utils/roleLevel.js';
import multer from 'multer';
import sendEmail from '../utils/SendMailOAuth.js';
import sendEmailUsingGmailAPI from '../utils/GmailAPISend.js';


dotenv.config();
const serve = process.env.SETUP === 'dev' ? process.env.CLIENTLINK : process.env.CLIENTLINK_PROD;

router.use(cors({
  origin: process.env.SETUP === 'prod' ? process.env.ACCESSLINK1 : process.env.ACCESSLINK2,
  methods: 'GET,POST,PUT,DELETE',
  allowedHeaders: 'Content-Type,Authorization'
}));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/profileimages'); 
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + '.' + file.originalname.split('.').pop());
  }
});
const upload = multer({ storage: storage });

const verifyToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) {
    res.redirect('/unauthorizeapi');
    return;
  }
  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;
  } catch (err) {
    return res.status(401).send('Invalid Token');
  }
  return next();
};

router.post('/authenticate', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username: { $regex: `^${username}$`, $options: 'i' }, deletedAccount : false});
    const userInfo = await UserInfo.findOne({ username: { $regex: `^${username}$`, $options: 'i' }, active: true });
    const userDeletedAccount = await User.findOne({ username: { $regex: `^${username}$`, $options: 'i' } , deletedAccount : true});
    const userInvalidInfo = await UserInfo.findOne({ username: { $regex: `^${username}$`, $options: 'i' },active : false});
    if (user && userInfo) {
      if (user.username !== username) {
        req.session.message = "Username must match case exactly.";
        return res.redirect('/login');
      }
      const match = await bcrypt.compare(password, user.password);
      if (match) {
        const rolelevel = roleLevel(user.role);
        req.session.rolelevel = rolelevel;
        if (rolelevel !== 3) {
          const token = jwt.sign(
            { userId: user._id, username: user.username },
            jwtSecret,
            { expiresIn: '1h' }
          );
          const { password, ...userWithoutPassword } = user.toObject();
          const userExtData = userInfo.toObject();
          const userdata = {
            username: userWithoutPassword.username,
            firstName: userWithoutPassword.firstName,
            lastName: userWithoutPassword.lastName,
            designation: userWithoutPassword.designation,
            address: userExtData.address,
            phoneNumber: userExtData.phoneNumber,
            mailId: userExtData.mailId,
            joinedDate:  formattedDate(userExtData.joinedDate),
            lastLoggedIn: formattedDate(userWithoutPassword.lastLoggedIn),
            profilepic : userExtData.profilepic
          };

          await User.findOneAndUpdate(
            { username },
            { lastLoggedIn: new Date() }
          );

          req.session.role = userWithoutPassword.role; 
          req.session.username = userWithoutPassword.username;
          req.session.token = token;
          req.session.userdata = userdata;
          req.session.component = "Dashboard";
          req.session.action = "Create";
          req.session.view = "server";
          res.redirect('/dashboard'); 
        } else {
          req.session.message = "You don't have access."; 
          res.redirect('/login'); 
        }
      } else {
        req.session.message = "Incorrect password."; 
        req.session.username = username;
        res.redirect('/login'); 
      }
    }
    else if (userInvalidInfo)
    {
      req.session.message = "User Account Deactivated"; 
      res.redirect('/login'); 
    }
    else if (userDeletedAccount)
    {
      req.session.message = "User Account Removed temporarily"; 
      res.redirect('/login'); 
    }
    else
    {
      req.session.message = "User not found."; 
      res.redirect('/login'); 
    }
  } catch (err) {
    console.error(err.message);
    req.session.message = "Server error."; 
    res.redirect('/login'); 
  }
});

router.post('/generateToken', async (req, res) => {
  try {
    const { username, mailId } = req.body;
    const userInfo = await UserInfo.findOne({ username, mailId });
    if (userInfo) {
      const token = await handleTokenRequest(mailId);
      const updatedUser = await UserInfo.findOneAndUpdate(
        { username },
        { resetToken: token },
        { new: true }
      );
      if (updatedUser) {
        req.session.message = "Token Generation successful";
        res.json({ message: "Token is generated and check your registered mail" });
      } else {
        req.session.message = "Token Generation failed";
        res.status(404).json({ message: "Token Generation failed" });
      }
    } else {
      const userDetails = await User.findOne({ username });
      const userInfoDetails = await UserInfo.findOne({ mailId });
      if (userDetails)
      {
        req.session.message = "Email mismatch";
        res.status(200).json({ message: "Email mismatch" });
      }
      else if(userInfoDetails && !userDetails)
      {
        req.session.message = "Username mismatch";
        res.status(200).json({ message: "Username mismatch" });
      }
      else {
        req.session.message = "User not found";
        res.status(200).json({ message: "User not found" });
      }
    }
  } catch (err) {
    res.status(500).send('Server error');
  }
});

router.post('/forgotpassword', async (req, res) => {
  try {
    const { username, mailId, resetToken } = req.body;
    const userInfo = await UserInfo.findOne({ username, mailId, resetToken });
    if (userInfo) {
      req.session.username = username;
      req.session.message = "Token Verified"
      res.json({ allowAccess: true, username : username, message: "Token Verified" });
    } else {
      req.session.message = "Token Mismatch"
      res.json({ allowAccess: false, username : username, message: "Token Mismatch" });
    }
  } catch (err) {
    res.status(500).send('Server error');
  }
});

router.post('/resetpassword', async (req, res) => {
  try {
    const { username, newpassword } = req.body;
    const user = await User.findOne({ username });
    if (user) {
        const hashnewPassword = await bcrypt.hash(newpassword, 10);
        const updatedUser = await User.findOneAndUpdate(
          { username },
          { password: hashnewPassword },
          { new: true }
        );
        if (updatedUser) {
          res.json({ message: "Password Reset successfull" });
        } else {
          res.json({ message: "Password Reset failed" });
        }
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (err) {
    res.status(500).send('Server error');
  }
});

router.post('/confirmpassword', async (req, res) => {
  try {
    const { username, password, cpassword } = req.body;

    if (password !== cpassword) {
      req.session.message = "Passwords do not match"
      return res.redirect('/changepassword'); 
    }

    const user = await User.findOne({ username });
    if (user) {
      const hashnewPassword = await bcrypt.hash(password, 10);
      const updatedUser = await User.findOneAndUpdate(
        { username },
        { password: hashnewPassword },
        { new: true }
      );
      if (updatedUser) {
        req.session.message = "Password changed successfully";
      } else {
        req.session.message = "Password change failed";
      }
      return res.redirect('/login');
    } else {
      req.session.message = "User not found";
      return res.redirect('/unauthorize');
    }
    
  } catch (err) {
    res.status(500).send('Server error');
  }
});


function generateToken() {
  return Math.random().toString(36).substring(2);
}

//Sending Mail with user crendentials
async function handleUserAccountDetails(email,username,password,actuallink) {
  const subject = "Flamingo DayApp Account has been created";
  const text = `Username is: ${username} \n Password is : ${password} \n Click here to login ${actuallink}`;
  //const html = `<strong>Username is:</strong> ${username} <br> <strong>Password is:</strong> ${password}`;
  try {
    //await sendEmail(email, subject, text, html);
    await sendEmailUsingGmailAPI(email, subject, text);
      return token;
  } catch (error) {
      console.error('Failed to send token:', error);
  }
}


async function handleTokenRequest(email) {
  const token = generateToken();
  const subject = "Your Reset Token for Forgot password";
  const text = `Your token is: ${token}`;
  const html = `<strong>Your token is:</strong> ${token}`;

  try {
    //await sendEmail(email, subject, text, html);
    await sendEmailUsingGmailAPI(email, subject, text);
      return token;
  } catch (error) {
      console.error('Failed to send token:', error);
  }
}

router.post('/update-session', (req, res) => {
  if (req.session) {
    req.session.component = req.body.component;
    req.session.action = req.body.action;
    res.json({ message: 'Session updated successfully' });
  } else {
    res.status(500).json({ message: 'Failed to update session' });
  }
});


router.post('/upload', upload.single('image'), async (req, res) => {
  const filename = req.file.filename;
  const username = req.query.user;  
  const url = `${serve}/${filename}`; 
  try {
      await UserInfo.findOneAndUpdate(
          { username: username },
          { profilepic: filename }
      );
      res.json({ url: url, filename: filename, message: 'Successfully uploaded file' });
  } catch (error) {
      console.error('Database update failed:', error);
      res.status(500).send('Failed to update profile picture');
  }
});


export default router;