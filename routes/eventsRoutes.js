import express from 'express';
import Event from '../models/EventsForm.js';
import AssignedEvent from '../models/AssignEvents.js';
import User from '../models/User.js';
import { v4 as uuidv4 } from 'uuid';
import AssignEvents from '../models/AssignEvents.js';
const router = express.Router();
import { allowAction } from '../utils/roleLevel.js';


router.post('/submit', async (req, res) => {
  try {
    const { eventId, eventName, desc, scheduledDateTime, username } = req.body;
    const usernameValue = req.session.username || username;
   
    if (!eventName || !desc || !scheduledDateTime) {
      res.render('events', { message: "All fields are required" });
      return;
    }
    const data = scheduledDateTime.split('T');
    const scheduledDay = data[0];
    const timeParts = data[1].split(":");
    const scheduledTime = `${timeParts[0]}:${timeParts[1]}`;
  
    if (eventId) {
      await Event.findOneAndUpdate(
        { eventId },
        { eventName, desc, scheduledDateTime, scheduledDay, scheduledTime},
        { new: true }
      );
      req.session.message = "Event updated successfully!";
    } else { 
      const newEventId = uuidv4();
      const newEvent = new Event({
        eventId: newEventId,
        eventName,
        desc,
        createdBy: usernameValue,
        scheduledDateTime,
        scheduledDay,
        scheduledTime
      });
      await newEvent.save();
      req.session.message = "Event added successfully!";
    }
    if (req.session.view === 'server')
    {
      res.redirect('/events');
    }
    else {
      res.status(201).send('Event created successfully');
    }
  } catch (err) {
    res.status(400).send('Error processing event: ' + err.message);
  }
});
  
router.post('/delete/:id', async (req, res) => {
    try {
        const { id } = req.params;
      const result = await Event.findOneAndDelete({ eventId: id });
      const assignedEvents = await AssignedEvent.find({ eventId: id });
      if (result) {
        for (const assignedEvent of assignedEvents) {
          const assignId = assignedEvent.assignId;
          await AssignedEvent.findOneAndDelete({ assignId: assignId });
           }
            req.session.message = "Event deleted successfully!";
            res.status(200).send('Deleted successfully and It won\'t be recovered again.');
        } else {
            res.status(404).send('Data not found');
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

router.put('/delete/:eventId' ,async (req, res) => {
  try {
      const { eventId } = req.params;
      const assignedEvents = await AssignedEvent.find({ eventId }); // Corrected variable name
      const result = await Event.findOneAndUpdate(
          { eventId },
          { flag: true, deletedOn: new Date() },
          { new: true }
      );

      if (result) {
          for (const assignedEvent of assignedEvents) {
              const assignId = assignedEvent.assignId;
              await AssignedEvent.findOneAndUpdate(
                  { assignId },
                  { flag: true, deletedOn: new Date() },
                  { new: true }
              );
          }
        req.session.message = "Event deleted successfully!";
        res.status(200).send({ message : 'Event deleted'});
      } else {
        res.status(404).send({ message : 'Data not found'});
      }
  } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
  }
});

router.get('/today', async (req, res) => {
    try {
      const  user  = req.session.username || req.query.user;
      const allowActionValue = allowAction(req.session.role, req.session.rolelevel, req.session.component, req.session.action);
      const today = new Date().toISOString().split('T')[0];
      const events = await Event.find({
        createdBy: user,
        scheduledDay: today,
        flag: false
      });
        
      const transformedEvents = events.map(event => {
        const day1 = event.scheduledDay.toISOString().split('T')[0];
        const extData = event.eventName + " is scheduled at " + event.scheduledTime +" and It is about "+ event.desc;
        return {
          title: event.eventName,
          description: event.desc,
          date: day1,
          time: event.scheduledTime,
          createdOn: event.createdOn.toISOString(),
          eventId: event.eventId,
          allowAction: allowActionValue,
          eventName: extData
        };
      });
        
      res.status(200).json(transformedEvents);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  });
  
  router.get('/latest' ,async (req, res) => {
    try {
      const user = req.session.username || req.query.user;
      const events = await Event.find({
        createdBy: user,
        flag: false
      }).sort({ createdOn: -1 }).limit(10);
      const assignedEvents = await AssignEvents.find({ assignTo: user, flag: false });
      const allowActionValue = allowAction(req.session.role, req.session.rolelevel, req.session.component, req.session.action);
      const transformedAssignedEvents = await Promise.all(assignedEvents.map(async (eventAssigned) => {
        const assignEventData = eventAssigned.eventId;
        const eventdata = await Event.findOne({ eventId: assignEventData , flag : false});

        return {
            title: eventdata.eventName,
            description: eventdata.desc,
            date: eventdata.scheduledDay.toISOString().split('T')[0],
            time: eventdata.scheduledTime,
            createdOn: eventdata.createdOn.toISOString(),
            eventId: eventdata.eventId,
            allowAction: allowActionValue,
            createdBy : eventdata.createdBy
        };
    }));
      const transformedEvents = events.map(event => ({
        title: event.eventName,
        description: event.desc,
        date: event.scheduledDay.toISOString().split('T')[0],
        time: event.scheduledTime,
        createdOn: event.createdOn.toISOString(),
        eventId: event.eventId,
        allowAction: allowActionValue,
        createdBy : event.createdBy
      }));
      const combinedEvents = [...transformedEvents, ...transformedAssignedEvents];
      const finalTransformedEvents = combinedEvents.map(event => ({
        ...event
      }));
      res.status(200).json(finalTransformedEvents);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  });

  router.get('/latestEvents', async (req, res) => {
    try {
      const user = req.session.username || req.query.user;
      const day = new Date();
      const events = await Event.find({
        createdBy: user,
        scheduledDay : { $gte : day } ,
        flag: false
      }).sort({ createdOn: -1 }).limit(10);
      const assignedEvents = await AssignEvents.find({ assignTo: user, flag: false });
      const allowActionValue = allowAction(req.session.role, req.session.rolelevel, req.session.component, req.session.action);
      const transformedAssignedEvents = await Promise.all(assignedEvents.map(async (eventAssigned) => {
        const assignEventData = eventAssigned.eventId;
        const eventdata = await Event.findOne({ eventId: assignEventData , flag : false});

        return {
            title: eventdata.eventName,
            description: eventdata.desc,
            date: eventdata.scheduledDay.toISOString().split('T')[0],
            time: eventdata.scheduledTime,
            createdOn: eventdata.createdOn.toISOString(),
            eventId: eventdata.eventId,
            allowAction: allowActionValue,
            createdBy : eventdata.createdBy
        };
    }));
      const transformedEvents = events.map(event => ({
        title: event.eventName,
        description: event.desc,
        date: event.scheduledDay.toISOString().split('T')[0],
        time: event.scheduledTime,
        createdOn: event.createdOn.toISOString(),
        eventId: event.eventId,
        allowAction: allowActionValue,
        createdBy : event.createdBy
      }));
      const combinedEvents = [...transformedEvents, ...transformedAssignedEvents];
      const finalTransformedEvents = combinedEvents.map(event => ({
        ...event
      }));
      res.status(200).json(finalTransformedEvents);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  });

  router.get('/recent' ,async (req, res) => {
    try {
      const user = req.session.username;
  
     
      const events = await Event.find({
        createdBy: user,
        flag: true
      }).sort({ deletedOn: -1 }).limit(10);
  
      console.log('Events:', events);
  
    
      const allowActionValue = allowAction(req.session.role, req.session.rolelevel, req.session.component, req.session.action);  
  
      const transformedEvents = events.map(event => {
        if (event) {
          return {
            title: event.eventName || 'No title',
            description: event.desc || 'No description',
            date: event.scheduledDay ? event.scheduledDay.toISOString().split('T')[0] : 'No date',
            time: event.scheduledTime || 'No time',
            createdOn: event.createdOn ? event.createdOn.toISOString() : 'No created date',
            eventId: event.eventId || 'No event ID',
            allowAction: allowActionValue
          };
        } else {
          console.error('Encountered null or undefined event.');
          return null; 
        }
      }).filter(event => event !== null); 
  
      res.status(200).json(transformedEvents);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  });
  
  
  router.get('/allByUserwithoutDeleted', async (req, res) => {
    try {
      const user = req.session.username || req.query.user;
      const events = await Event.find({
        createdBy: user,
        flag: false
      });
    
      const allowActionValue = allowAction(req.session.role, req.session.rolelevel, req.session.component, req.session.action);      
      const transformedEvents = events.map(event => ({
        title: event.eventName,
        description: event.desc,
        date: event.scheduledDay.toISOString().split('T')[0],
        time: event.scheduledTime,
        createdOn: event.createdOn.toISOString(),
        eventId: event.eventId,
        allowAction: allowActionValue,
        createdBy : event.createdBy
      }));
   
    res.status(200).json(transformedEvents);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  });

  router.get('/pastEventsByUser', async (req, res) => {
    try {
      const { user } = req.query;
      const date = new Date();
      const currentDay = date;
      const events = await Event.find({
        createdBy: user,
        scheduledDay: { $lt:  currentDay },  
        flag: false
      });
      const assignedEvents = await AssignEvents.find({ assignTo: user, flag: false });
      const transformedAssignedEvents = await Promise.all(assignedEvents.map(async (eventAssigned) => {
        const assignEventData = eventAssigned.eventId;
        const eventdata = await Event.findOne({ eventId: assignEventData , flag : false,scheduledDay: { $lt:  currentDay }});
        const allowActionValue = allowAction(req.session.role, req.session.rolelevel, req.session.component, req.session.action);
        if (eventdata)
        {
        return {
          title: eventdata.eventName,
          description: eventdata.desc,
          date: eventdata.scheduledDay.toISOString().split('T')[0],
          time: eventdata.scheduledTime,
          createdOn: eventdata.createdOn.toISOString(),
          eventId: eventdata.eventId,
          allowAction: allowActionValue,
          createdBy : eventdata.createdBy
          };
          }
      }));
      const transformedEvents = events.map(event => ({
        title: event.eventName,  
        description: event.desc,
        date: event.scheduledDay.toISOString().split('T')[0],  
        time: event.scheduledTime,
        createdOn: event.createdOn.toISOString(),
          eventId: event.eventId,
        flag: event.flag,
        createdBy : event.createdBy
    }));
    const combinedEvents = [...transformedEvents, ...transformedAssignedEvents];
    const finalTransformedEvents = combinedEvents.map(event => ({
      ...event
  }));
  res.status(200).json(finalTransformedEvents);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  });

  router.get('/alldeletedByUser' ,async (req, res) => {
    try {
      const { user } = req.query;
      const events = await Event.find({
        createdBy: user,
        flag: true
      });
  
      const transformedEvents = events.map(event => ({
        title: event.eventName,  
        description: event.desc,
        date: event.scheduledDay.toISOString().split('T')[0],  
        time: event.scheduledTime,
        createdOn: event.createdOn.toISOString(),
        eventId: event.eventId,  
        flag: event.flag,
        createdBy : event.createdBy
    }));
      res.status(200).json(transformedEvents);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
});

  router.get('/todayassign', async (req, res) => {
    try {
      const  user  = req.session.username;
      const today = new Date().toISOString().split('T')[0];
      const events = await Event.find({
        scheduledDay: today,
        createdBy: user,
        flag: false
      });
      const transformedEvents = await Promise.all(events.map(async event => {
        const assignedEvents = await AssignedEvent.find({
          eventId: event.eventId,
          flag: false
        });
        return assignedEvents.map(assignEvent => ({
          assignId: assignEvent.assignId,
          eventId: assignEvent.eventId,
          eventName: event.eventName,
          assignedBy: assignEvent.assignBy,
          assignedTo: assignEvent.assignTo,
          assignedOn: assignEvent.assignedOn
        }));
      }));
      const flattenedEvents = transformedEvents.flat();
      const groupedEvents = flattenedEvents.reduce((acc, event) => {
        if (!acc[event.eventName]) {
          acc[event.eventName] = [];
        }
        acc[event.eventName].push(event);
        return acc;
      }, {});
  
      res.status(200).json(groupedEvents);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  });

router.get('/latestassign' ,async (req, res) => {
  try {
    const  user  = req.session.username;
    const assignedEvents = await AssignedEvent.find({
      assignBy: user,
      flag: false
    }).sort({ createdOn: -1 }).limit(10);
    
    const transformedEvents = await Promise.all(assignedEvents.map(async assignEvent => {
      const event = await Event.findOne({
        eventId: assignEvent.eventId,
        flag: false
      });
      return {
        assignId : assignEvent.assignId,
        eventId: assignEvent.eventId,
        eventName: event.eventName,
        assignedBy: assignEvent.assignBy,
        assignedTo: assignEvent.assignTo,
        assignedOn: assignEvent.assignedOn
      };
    }));

    const groupedEvents = transformedEvents.reduce((acc, event) => {
      if (!acc[event.eventName]) {
        acc[event.eventName] = [];
      }
      acc[event.eventName].push(event);
      return acc;
    }, {});

    res.status(200).json(groupedEvents);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

router.get('/recentdelete', async (req, res) => {
  try {
    const  user  = req.session.username;
    const assignedEvents = await AssignedEvent.find({
      assignBy: user,
      flag: true
    }).sort({ deletedOn: -1 }).limit(10);
      
    const transformedEvents = await Promise.all(assignedEvents.map(async assignEvent => {
      const event = await Event.findOne({
        eventId: assignEvent.eventId,
        flag: false
      });
      return {
        assignId : assignEvent.assignId,
        eventId: assignEvent.eventId,
        eventName: event.eventName,
        assignedBy: assignEvent.assignBy,
        assignedTo: assignEvent.assignTo,
        assignedOn: assignEvent.assignedOn
      };
    }));

    const groupedEvents = transformedEvents.reduce((acc, event) => {
      if (!acc[event.eventName]) {
        acc[event.eventName] = [];
      }
      acc[event.eventName].push(event);
      return acc;
    }, {});

    res.status(200).json(groupedEvents);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

router.get('/allassignnotdeleted', async (req, res) => {
  try {
    const  user  = req.session.username;
    const assignedEvents = await AssignedEvent.find({
      assignBy: user,
      flag: false
    });

    const transformedEvents = await Promise.all(assignedEvents.map(async assignEvent => {
      const event = await Event.findOne({
        eventId: assignEvent.eventId,
        flag: false
      });
      return {
        assignId : assignEvent.assignId,
        eventId: assignEvent.eventId,
        eventName: event.eventName,
        assignedBy: assignEvent.assignBy,
        assignedTo: assignEvent.assignTo,
        assignedOn: assignEvent.assignedOn
      };
    }));

    const groupedEvents = transformedEvents.reduce((acc, event) => {
      if (!acc[event.eventName]) {
        acc[event.eventName] = [];
      }
      acc[event.eventName].push(event);
      return acc;
    }, {});

    res.status(200).json(groupedEvents);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

router.post('/deleteassign/:assignId', async (req, res) => {
  try {
      const { assignId } = req.params;
      const result = await AssignedEvent.findOneAndDelete({ assignId: assignId });
    if (result) {
      req.session.message = "Assignment deleted successfully!";
      res.status(200).json({ message: 'Assignment deleted' });
    } else {
      res.status(404).json({ message : 'Data not found' });
    }
  } catch (err) {
      console.error(err.message);
      res.status(500).json({ message: 'Server error' });
  }
});

router.put('/deleteassign/:assignId', async (req, res) => {
  try {
      const { assignId } = req.params;
      const result = await AssignedEvent.findOneAndUpdate(
          { assignId }, 
          { flag: true, deletedOn: new Date() },
          { new: true } 
      );
    if (result) {
        req.session.message = "Assignment deleted successfully!";
        res.status(200).send('Assignment deleted');
    } else {
        res.status(404).send('Data not found');
    }
  } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
  }
});

router.get('/unassignedUsers',async (req, res) => {
  try {
    const { eventId } = req.query;
    const username = req.session.username;
    const userData = await User.findOne({ username: username });
    if (!userData) {
      return res.status(404).send('User not found');
    }
    const assignedUsers = await AssignedEvent.find({ eventId, assignBy: username, flag: false} ).select('assignTo');
    const assignedUserNames = assignedUsers.map(assignment => assignment.assignTo);
    let orginalVAlues = [];
    let unassignedUsers = [];
    let unassignedGuestUsers = [];
    
    if (userData.role === 'admin' || userData.role === 'teacher') {
      unassignedUsers = await User.find({ username: { $nin: assignedUserNames }, deletedAccount: false, role: 'student' });
    } else if (userData.role === 'vip') {
      unassignedGuestUsers = await User.find({ username: { $nin: assignedUserNames }, deletedAccount: false, role: 'vvip' });
    }

    orginalVAlues = [...unassignedUsers, ...unassignedGuestUsers];
    res.status(200).json(orginalVAlues);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

router.post('/assignUser' ,async (req, res) => {
  try {
    const { username, eventId } = req.body;
    const user = req.session.username;
    const assignId = uuidv4();
    let text = "assigned";
    const assignedEve = await AssignedEvent.findOne({ eventId, flag: true, assignTo: username }).select('assignTo');
    if (assignedEve)
    {
      text = "reassigned";
      await AssignEvents.findOneAndUpdate(
        { assignTo: username, eventId },
        { flag : false, assignBy : user,assignedOn: new Date() },
        { new: true }
      );
    } else {
      const assignedEvent = new AssignedEvent({
        assignId,
        eventId,
        assignTo : username,
        assignBy : user, 
        assignedOn: new Date(),
        flag: false
      });
  
      await assignedEvent.save();
    }
    res.status(200).json({ success: true, message: `User ${text} successfully`});
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/getDetails',async (req, res) => {
  try {
      const { eventId } = req.query;
      const event = await Event.findOne({ eventId : eventId });

      if (!event) {
        return res.status(404).json({ message: 'Events not found' });
      }
      const year = event.scheduledDateTime.getFullYear();
      const month = String(event.scheduledDateTime.getMonth() + 1).padStart(2, '0'); 
      const day = String(event.scheduledDateTime.getDate()).padStart(2, '0');
      const hours = String(event.scheduledDateTime.getHours()).padStart(2, '0');
      const minutes = String(event.scheduledDateTime.getMinutes()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`;
    const data = {
      eventId : event.eventId,
      eventName: event.eventName,
      description: event.desc,
      scheduledDateTime: formattedDate,
      }
    res.render('eventform', { data, type : "update"}, (err, html) => {
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