import express from 'express';
import TimeTable from '../models/TimeTableForm.js';
import { v4 as uuidv4 } from 'uuid';
import { convertTo12HourFormat } from '../utils/DateConversion.js';
const router = express.Router();

router.post('/submit', async (req, res) => {
  const view = req.session.view;
    const day = req.body.day;
    const openTime = req.body.openTime;
    const username = req.session.username;
    const timetable = await TimeTable.findOne({
      day: day,
      openTime: openTime,
      flag: false
    });
  
  if (timetable)
  {
    if (view === 'server')
    {
    req.session.message = "There is a subject allocated for the same time and day!";
    res.redirect('/timetable');
    }
    else {
    res.status(404).send('There is a subject allocated for the same time and day!');
    }
  }
  else {
    const timeTabledata = new TimeTable({
      timeTableId: uuidv4(),
      createdBy: username,
      ...req.body
  })
    await timeTabledata.save();
    if (view === 'server')
    {
    req.session.message = "TimeTable added successfully!";
    res.redirect('/timetable');
    }
    else {
      res.status(201).send('TimeTable added successfully!');
    }
  }
});

router.post('/update', async (req, res) => {
  const {day,subject,openTime,closeTime,timeTableId,desc,scheduledTime } = req.body;
  
  const timetable = await TimeTable.findOneAndUpdate(
    {timetableId: timeTableId},
    {day,subject,openTime,closeTime,desc,scheduledTime},
    {new: true});

  if (timetable)
  {
  req.session.message = "There is a subject allocated for the same time and day!";
  res.redirect('/timetable');
   }
});


router.post('/delete/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await TimeTable.findOneAndDelete({ timeTableId: id });
      if (result) {
            req.session.message = "TimeTable deleted successfully!";
            res.status(200).send('Deleted successfully and It won\'t be recovered again.');
        } else {
            res.status(404).send('Data not found');
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

router.put('/delete/:timeTableId', async (req, res) => {
    try {
        const { timeTableId } = req.params;
        const result = await TimeTable.findOneAndUpdate(
            { timeTableId }, 
            { flag: true, deletedOn: new Date() },
            { new: true } 
        );
      if (result) {
        req.session.message = "TimeTable deleted successfully!";
        res.status(200).json({ message: "TimeTable deleted successfully!" });
        } else {
        res.status(404).json({ message: "Data not found" });
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

router.get('/today', async (req, res) => {
    try {
        const  user  = req.session.username || req.query;
        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const today = new Date().getDay();
        const todayDay = daysOfWeek[today];
        const timetable = await TimeTable.find({
        createdBy: user,
        day: todayDay,
        flag: false
      });
        
      const transformedData = timetable.map(data => ({
        subject: data.subject,
        description: data.desc,
        time: convertTo12HourFormat(data.openTime, data.closeTime),
        openTime: data.openTime,
        closeTime : data.closeTime,
        scheduledTime : data.scheduledTime,
        createdOn: data.createdOn.toISOString(),
        timeTableId: data.timeTableId,
        day : data.day
      }));
        
      res.status(200).json(transformedData);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  });
  
  router.get('/yesterday', async (req, res) => {
    try {
        const  user  = req.session.username;
        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const today = new Date().getDay();
        const todayDay = daysOfWeek[today - 1];
        const timetable = await TimeTable.find({
        createdBy: user,
        day: todayDay,
        flag: false 
      });
        
      const transformedData = timetable.map(data => ({
        subject: data.subject,
        description: data.desc,
        time: convertTo12HourFormat(data.openTime, data.closeTime),
        openTime: data.openTime,
        closeTime : data.closeTime,
        scheduledTime : data.scheduledTime,
        createdOn: data.createdOn.toISOString(),
        timeTableId: data.timeTableId,
        day : data.day
      }));
        
      res.status(200).json(transformedData);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  });
  
router.get('/tommorrow', async (req, res) => {
    try {
        const  user  = req.session.username;
        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const today = new Date().getDay();
        const todayDay = daysOfWeek[today + 1];
        const timetable = await TimeTable.find({
        createdBy: user,
        day: todayDay,
        flag: false
      });
        
      const transformedData = timetable.map(data => ({
        subject: data.subject,
        description: data.desc,
        time: convertTo12HourFormat(data.openTime, data.closeTime),
        openTime: data.openTime,
        closeTime : data.closeTime,
        scheduledTime : data.scheduledTime,
        createdOn: data.createdOn.toISOString(),
        timeTableId: data.timeTableId,
        day : data.day
      }));
        
      res.status(200).json(transformedData);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
});
  
router.get('/allByUserwithoutDeleted', async (req, res) => {
    try {
        const  user  = req.session.username;
        //const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const today = new Date().getDay();
        //const todayDay = daysOfWeek[today];
        const timetable = await TimeTable.find({
        createdBy: user,
        flag: false
      });
        
      const transformedData = timetable.map(data => ({
        subject: data.subject,
        description: data.desc,
        time: convertTo12HourFormat(data.openTime, data.closeTime),
        openTime: data.openTime,
        closeTime : data.closeTime,
        scheduledTime : data.scheduledTime,
        createdOn: data.createdOn.toISOString(),
        timeTableId: data.timeTableId,
        day : data.day
      }));
      res.status(200).json(transformedData);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
});
  
//Upcoming events 
router.get('/getByUser', async (req, res) => {
  try {
    const { user } = req.query;
    const timetables = await TimeTable.find({
      createdBy: user,
      flag: false
    });
    
    const dayArr = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const trandata = dayArr.map(day => {
      const filteredTimetables = timetables.filter(timetable => timetable.day === day);
      return {
        day: day,
        flag: false,
        events: filteredTimetables.map(timetable => ({
          id: timetable.timeTableId,
          time: timetable.scheduledTime,
          subject: timetable.subject,
          description: timetable.desc,
          openTime: timetable.openTime,
          closeTime: timetable.closeTime,
          convertTime: convertTo12HourFormat(timetable.openTime, timetable.closeTime) 
        }))
      };
    });

    const filteredData = trandata.filter(day => day.events.length > 0);
    res.status(200).json(filteredData);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});


router.get('/get/all', async (req, res) => {
  try {
    const { user } = req.query;
    console.log("user" + user);
    const timetables = await TimeTable.find({
      createdBy: user,
      flag: false
    });
    console.log("data for timetable" + timetables.length);
    const dayArr = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const trandata = timetables.map(timetable => {
     const timeValue =  convertTo12HourFormat(timetable.openTime, timetable.closeTime);
      return {
        day: timetable.day,
        flag: timetable.flag,
        subject: timetable.subject,
        time : timeValue
   } 
  });
      res.status(200).json(trandata);
  } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
  }
});
  

export default router;