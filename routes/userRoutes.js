import express from 'express';
import bcrypt from 'bcrypt'; 
import jwt from 'jsonwebtoken'; 
import User from '../models/User.js';
import UserInfo from '../models/UserInfo.js';
import { hashPassword } from '../utils/HashPassword.js';
import { formattedDate } from '../utils/DateConversion.js';
import { roleLevel, accessLevelforClient } from '../utils/roleLevel.js';
import Theme from '../models/Theme.js';

const router = express.Router();
const saltRounds = 10;
const jwtSecret = process.env.JWT_SECRET || 'your_secret_key';

router.get('/authenticate', async (req, res) => {
  try {
    const { username, password } = req.query;
    const user = await User.findOne({ username: { $regex: `^${username}$`, $options: 'i' } });
    const userInfo = await UserInfo.findOne({ username: { $regex: `^${username}$`, $options: 'i' } });
    const userDeletedAccount = await User.findOne({ username: { $regex: `^${username}$`, $options: 'i' } , deletedAccount : true});
    const userInvalidInfo = await UserInfo.findOne({ username: { $regex: `^${username}$`, $options: 'i' } , active : false});
    const themeData = await Theme.findOne({ username: username });
    const todayDate = new Date();
    if (user && userInfo) {
      if (user.username !== username) {
        return res.status(200).json({ message: "Username must match case exactly." });
      }
      const match = await bcrypt.compare(password, user.password);
      if (match) {
        const token = jwt.sign(
          { userId: user._id, username: user.username },
          jwtSecret,
          { expiresIn: '1h' } 
        );
        const userExtData = userInfo.toObject();
        const { password, ...userWithoutPassword } = user.toObject();
        const joinedDate = formattedDate(userExtData.joinedDate);
        const lastLoggedIn = formattedDate(userWithoutPassword.lastLoggedIn) || todayDate;
        let theme = 'light';
        if (themeData) {
          theme = themeData.themeName;
        }
        const rolelevel = roleLevel(userWithoutPassword.role);
        const accesslevel = accessLevelforClient(userWithoutPassword.role, rolelevel);
        let updateLoggedIn = {}
        if (user.flag === true)
        {
           updateLoggedIn = await User.findOneAndUpdate({username},{lastLoggedIn : todayDate , flag : false },{ new: true });
        }
        else {
           updateLoggedIn = await User.findOneAndUpdate({username},{lastLoggedIn : todayDate },{ new: true });
        }
        res.json({ message: "Authentication successful", ...userWithoutPassword,...userExtData, token,rolelevel,accesslevel,theme,joinedDate,lastLoggedIn });
      } else {
        res.status(400).json({ message: "Authentication failed" });
      }
    }
    else if (userInvalidInfo)
    {
      res.status(200).json({ message: "User Account Deactivated" });
    }
    else if (userDeletedAccount)
    {
      res.status(200).json({ message: "User Account Removed temporarily" });
    }
    else {
      res.status(200).json({ message: "User not found" });
    }
  } catch (err) {
    console.log(err.message);
    res.status(500).send('Server error');
  }
});

router.post('/authenticatecloud', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username: username });
    if (user) {
      const match = await bcrypt.compare(password, user.password);
      if (match) {
        const { password, ...userWithoutPassword } = user.toObject(); 
        res.json({ message: "Authentication successful", ...userWithoutPassword });
      } else {
        res.status(401).json({ message: "Authentication failed" });
      }
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (err) {
    console.log(err.message);
    res.status(500).send('Server error');
  }
});

// GET all users
router.get('/all', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).send('Error retrieving users: ' + err.message);
  }
});


// GET all users that are eligible for hard delete
router.get('/allharddeletedetails', async (req, res) => {
  try {
    const users = await User.find({ deletedAccount : true });
    const userInfos = await UserInfo.find({ active: false });
    const results = users.map(user => {
      const userInfo = userInfos.find(info => info.username === user.username);
      if (!userInfo) {
        return null; 
      }
      
      return {
        username: userInfo.username,
        address: userInfo.address,
        phoneNumber: userInfo.phoneNumber,
        mailId: userInfo.mailId,
        createdOn: userInfo.createDate,
        joinedOn: userInfo.joinedDate || 'No Data',
        firstName: user.firstName,
        lastName: user.lastName,
        designation: user.designation,
        role: user.role,
        lastLoggedIn: user.lastLoggedIn,
        flag : user.flag ? 'Not yet loggedIn' : 'Logged In',
        active: userInfos.active ? 'yes' : 'no',
        delete : user.deletedAccount ?  'deleted' : 'Not deleted'
      };
    }).filter(result => result !== null); // Remove null results
    res.json(results);
  } catch (err) {
    res.status(500).send('Error retrieving users: ' + err.message);
  }
});

// Protected route
router.get('/protected', (req, res) => {
  res.status(200).send('Welcome to the protected route!');
});

// GET user by username with additional info
router.get('/get/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username: username });
    if (user) {
      const extraInfo = await UserInfo.findOne({ username: username });
      const userData = user.toObject();
      const userInfoData = extraInfo.toObject();
      delete userData.password;
      res.json({ message: "User exists", ...userData, ...userInfoData });
    } else {
      res.status(404).json({ message: "User does not exist" });
    }
  } catch (err) {
    console.log(err.message);
    res.status(500).send('Server error');
  }
});


router.get('/getonly/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username: username });
    if (user) {
      const userData = user.toObject();
      delete userData.password;
      res.json({ message: "User exists", ...userData });
    } else {
      res.status(404).json({ message: "User does not exist" });
    }
  } catch (err) {
    console.log(err.message);
    res.status(500).send('Server error');
  }
});

async function checkUserAndMailIdExist(username, mailId, userId) {
  const lowerCaseUsername = username.toLowerCase();
  const lowerCaseMailId = mailId.toLowerCase();
  if (userId) {
    const userData = await User.findOne({ username: new RegExp(`^${lowerCaseUsername}$`, 'i') });
    const mailData = await UserInfo.findOne({ mailId: new RegExp(`^${lowerCaseMailId}$`, 'i') });
    if (mailData && mailData.username !== userData.username) {
      return true; 
    }
  } else {
    const userData = await User.findOne({ username: new RegExp(`^${lowerCaseUsername}$`, 'i') });
    const mailData = await UserInfo.findOne({ mailId: new RegExp(`^${lowerCaseMailId}$`, 'i') });
    if (userData || mailData) {
      return true; 
    }
  }
  return false; 
}


// Submit (Create or Update User)
router.post('/submit', async (req, res) => {
  try {
    let message = "";
    const {
      userId,
      username,
      password,
      firstName,
      lastName,
      designation,
      role,
      address,
      phoneNumber,
      mailId,
      active
    } = req.body;
    console.log("req.body:", JSON.stringify(req.body, null, 2));
    const value = await checkUserAndMailIdExist(username, mailId, userId);
    if (value === true)
    {
      req.session.title = userId ? "Update User" : "Add User";
      req.session.message = "Either Username or Mail Id already exist";
      res.redirect('/user');
    }
    
    let setActive = false;
    let setDeletedAccount = true;
    if (active === 'on' || active === true) {
      setActive = true;
      setDeletedAccount = false;
    }

    const date = new Date();
    let hashedPassword;

    if (userId) {
      const userData = await User.find({ username: username });
      if (userData.deletedAccount === false)
      {
        setDeletedAccount = false;
      }
      const updatedUser = await User.findOneAndUpdate(
        { username },
        {
          firstName,
          lastName,
          designation,
          role,
          deletedAccount : setDeletedAccount
        },
        { new: true }
      );

      const updatedUserInfo = await UserInfo.findOneAndUpdate(
        { username },
        {
          address,
          phoneNumber,
          mailId,
          updatedDate: date,
          active: setActive
        },
        { new: true }
      );
      if (updatedUser && updatedUserInfo) {
        message = "User updated successfully!";
      } else {
        console.log("User or UserInfo not found for username:", username);
        return res.status(404).send('User not found');
      }
    } else {
      hashedPassword = await hashPassword(password);
      const newUser = new User({
        username,
        password: hashedPassword,
        firstName,
        lastName,
        designation,
        role
      });

      const newUserInfo = new UserInfo({
        username,
        address,
        phoneNumber,
        mailId,
        joinedDate: date,
        lastDate: date,
        createDate: date,
        updatedDate: date,
        active: setActive
      });

      await newUser.save();
      await newUserInfo.save();
      message = "User created successfully!";
    }
    const user = await User.findOne({ username });
    const userInfo = await UserInfo.findOne({ username });

    const data = {
      userId: user._id,
      username: user.username,
      address: userInfo.address,
      phoneNumber: userInfo.phoneNumber,
      mailId: userInfo.mailId,
      firstName: user.firstName,
      lastName: user.lastName,
      designation: user.designation,
      role: user.role,
      active: userInfo.active ? 'true' : 'false',
      password: "*******"  
    };

    req.session.title = userId ? "Update User" : "Add User";
    req.session.message = message;
    res.redirect('/user');
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// HARD DELETE user
router.delete('/delete/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const result = await User.findOneAndDelete({ username: username });
    const resultUserInfo = await UserInfo.findOneAndDelete({ username: username });
    if (result && resultUserInfo) {
      res.status(200).json({message : `User ${username} deleted successfully.`});
    } else {
      res.status(404).send('User not found');
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});


// HARD DELETE user
router.delete('/userdelete/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const result = await User.findOneAndDelete({ username: username });
    if (result) {
      res.status(200).send(`User ${username} deleted successfully.`);
    } else {
      res.status(404).send('User not found');
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// HARD DELETE user
router.delete('/userinfodelete/:username' ,async (req, res) => {
  try {
    const { username } = req.params;
    const resultUserInfo = await UserInfo.findOneAndDelete({ username: username });
    if (resultUserInfo) {
      res.status(200).send(`User ${username} deleted successfully.`);
    } else {
      res.status(404).send('User not found');
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

//Soft Delete
router.put('/delete/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const date = new Date();

  
    const result = await User.findOneAndUpdate(
      { username }, 
      {
        deletedAccount: true,
        active: false
      },
      { new: true } 
    );

    // Update the UserInfo collection
    const resultUserInfo = await UserInfo.findOneAndUpdate(
      { username },
      { active: false, updatedDate: date },
      { new: true }
    );

    if (result && resultUserInfo) {
      req.session.message = "User deleted successfully!";
      return res.status(200).json({ message: req.session.message });
    } else {
      return res.status(404).json({ message: 'Data not found' });
    }
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.get('/searchData', async (req, res) => {
  try {
    console.log('Received query:', req.query);
    const { username, mailId, actiontype } = req.query;
    let searchTypeParam = `searchType-${actiontype}`;
    let searchType = req.query[searchTypeParam];

    if (!username && !mailId) {
      return res.status(400).send('Username or Mail ID is required');
    }

    if (searchType === "strict") {
      const user = await User.findOne({
        $or: [
          ...(username ? [{ username }] : []),
          ...(mailId ? [{ mailId }] : [])
        ]
      });

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const userInfo = await UserInfo.findOne({ username: user.username });

      if (!userInfo) {
        return res.status(404).json({ message: 'User info not found' });
      }

      return res.json({
        username: userInfo.username,
        address: userInfo.address,
        phoneNumber: userInfo.phoneNumber,
        mailId: userInfo.mailId,
        createdOn: userInfo.createDate,
        joinedOn: userInfo.joinedDate || 'No Data',
        firstName: user.firstName,
        lastName: user.lastName,
        designation: user.designation,
        role: user.role,
        lastLoggedIn: user.lastLoggedIn,
        flag : user.flag ? 'Not yet Logged In' : 'Logged In',
        active: user.active ? 'yes' : 'no'
      });
    } else {
      const searchQuery = {
        $or: [
          ...(username ? [{ username: { $regex: username, $options: 'i' } }] : []),
          ...(mailId ? [{ mailId: { $regex: mailId, $options: 'i' } }] : [])
        ]
      };

      if (searchQuery.$or.length === 0) {
        return res.status(400).send('Username or Mail ID is required for general search');
      }

      const users = await User.find(searchQuery);
      const userInfos = await UserInfo.find({
        $or: users.map(user => ({ username: user.username }))
      });

      const results = users.map(user => {
        const userInfo = userInfos.find(info => info.username === user.username);
        if (!userInfo) {
          return null; // Skip users without corresponding user info
        }
        
        return {
          username: userInfo.username,
          address: userInfo.address,
          phoneNumber: userInfo.phoneNumber,
          mailId: userInfo.mailId,
          createdOn: userInfo.createDate,
          joinedOn: userInfo.joinedDate || 'No Data',
          firstName: user.firstName,
          lastName: user.lastName,
          designation: user.designation,
          role: user.role,
          lastLoggedIn: user.lastLoggedIn,
          active: user.active ? 'yes' : 'no'
        };
      }).filter(result => result !== null); 

      const uniqueResults = Array.from(new Set(results.map(result => JSON.stringify(result)))).map(result => JSON.parse(result));
      console.log("data", uniqueResults);
      return res.json(uniqueResults);
    }
  } catch (err) {
    console.error(err.message);
    return res.status(500).send('Server error');
  }
});

router.get('/search', async (req, res) => {
  try {
    const { username, mailId, actiontype } = req.query;
    const searchTypeParam = `searchType-${actiontype}`;
    const searchType = req.query[searchTypeParam];
    console.log("actiontype" + actiontype);
    if (!username && !mailId) {
      return res.render('user/userdetails', { data: [] });
    }
    let dataResult;
    if (searchType === "strict") {
      const conditions = [];
      if (actiontype === 'delete') {
        if (username) conditions.push({ username, active: true });
        if (mailId) conditions.push({ mailId, active: true });
      } else {
        if (username) conditions.push({ username });
        if (mailId) conditions.push({ mailId });
      }

      if (conditions.length === 0) {
        return res.render('user/userdetails', { data: [] });
      }

      const userInfo = await UserInfo.findOne({ $or: conditions });

      if (!userInfo) {
        return res.render('user/userdetails', { data: [] });
      }

      const user = await User.findOne({ username: userInfo.username });

      if (!user) {
        return res.render('user/userdetails', { data: [] });
      }

      dataResult = [Object.assign({}, user.toObject(), userInfo.toObject(), { actiontype })];
    } else {
      const searchQuery = [];
      if (actiontype === 'delete') {
        if (username) searchQuery.push({ active: true, username: { $regex: username, $options: 'i' } });
        if (mailId) searchQuery.push({ active: true, mailId: { $regex: mailId, $options: 'i' } });
      } else {
        if (username) searchQuery.push({ username: { $regex: username, $options: 'i' } });
        if (mailId) searchQuery.push({ mailId: { $regex: mailId, $options: 'i' } });
      }

      if (searchQuery.length === 0) {
        return res.render('user/userdetails', { data: [] });
      }

      const usersInfo = await UserInfo.find({ $or: searchQuery });
      if (usersInfo.length === 0) {
        return res.render('user/userdetails', { data: [] });
      }

      const users = await User.find({
        $or: usersInfo.map(user => ({ username: user.username }))
      });

      dataResult = users.map(user => {
        const userInfo = usersInfo.find(info => info.username === user.username);
        if (!userInfo) {
          return null; // Skip users without corresponding user info
        }
        return Object.assign({}, user.toObject(), userInfo.toObject());
      }).filter(result => result !== null); // Remove null results
    }

    const data = dataResult.map(user => ({
      username: user.username,
      address: user.address,
      phoneNumber: user.phoneNumber,
      mailId: user.mailId,
      createdOn: user.createDate,
      joinedOn: user.joinedDate || 'No Data',
      firstName: user.firstName,
      lastName: user.lastName,
      designation: user.designation,
      role: user.role,
      lastLoggedIn: user.lastLoggedIn,
      active: user.active ? 'yes' : 'no',
      actiontype: actiontype
    }));

     res.render('user/userdetails', { data });
  } catch (err) {
    console.error(err.message);
    return res.status(500).send('Server error');
  }
});

router.get('/getDetails',  async (req, res) => {
  try {
      const { username } = req.query;
      const user = await User.findOne({ username : username });

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      const userInfo = await UserInfo.findOne({ username: user.username });

      if (!userInfo) {
        return res.status(404).json({ message: 'User info not found' });
      }
    const data = {
      userId : user._id,
      username: user.username,
      address: userInfo.address,
      phoneNumber: userInfo.phoneNumber,
      mailId: userInfo.mailId,
      firstName: user.firstName,
      lastName: user.lastName,
      designation: user.designation,
      role: user.role,
      active: userInfo.active ? 'true' : 'false',
      password : "*******"
    }
    req.session.title = "Update User"; 
    req.session.type = "update"; 
    res.render('user/userform', { data, title: req.session.title, type : req.session.type }, (err, html) => {
      if (err) {
        console.error(err.message);
        return res.status(500).send('Server error');
      }
      res.json({ html } );
    });
  } catch (err) {
    console.error(err.message);
    return res.status(500).send('Server error');
  }
});

export default router;