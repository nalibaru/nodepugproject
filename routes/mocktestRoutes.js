import express from 'express';
import MockTest from '../models/MocktestForm.js';
import Question from '../models/QuestionForm.js';
import Descriptive from '../models/DescriptiveForm.js';
import Choice from '../models/ChoicesForm.js';
import AssignedMockTest from '../models/AssignedMocktest.js';
import StudentMockTestMarks from '../models/StudentMockTest.js';
import { allowAction } from '../utils/roleLevel.js';
import User from '../models/User.js';
import { v4 as uuidv4 } from 'uuid';
import { escapeRegex } from '../utils/DateConversion.js'
import { roleLevel , accessLevelforClient} from '../utils/roleLevel.js';
const router = express.Router();

router.post('/submit', async (req, res) => {
  const username = req.session.username;
  const { mockTestName, subject, noOfQuestions, totalMarks, closedOn, mockTestId } = req.query;
  let operation;

  try {
    const mtName = escapeRegex(mockTestName);
    let existingMockTest;
    console.log("mockTestId" + mockTestId);
    if (mockTestId) {
      existingMockTest = await MockTest.findOne({
        mockTestName: { $regex: new RegExp(`^${mtName}$`, 'i') },
        mockTestId: { $ne: mockTestId } 
      });
    } else {
      existingMockTest = await MockTest.findOne({
        mockTestName: { $regex: new RegExp(`^${mtName}$`, 'i') }
      });
    }

    if (existingMockTest) {
      req.session.message = `${mockTestName} is already available`;
      return res.status(200).json({ message: req.session.message });
    }

    let savedMockTest;
    if (mockTestId) {
      operation = 'updated';
      savedMockTest = await MockTest.findOneAndUpdate(
        { mockTestId: mockTestId },
        {
          mockTestName,
          subject,
          noOfQuestions,
          totalMarks,
          closedOn: new Date(closedOn)
        },
        { new: true }
      );
    } else {
      operation = 'added';
      const newMockTest = new MockTest({
        mockTestId: uuidv4(),
        createdBy: username,
        mockTestName,
        subject,
        noOfQuestions,
        totalMarks,
        closedOn: new Date(closedOn)
      });
      savedMockTest = await newMockTest.save();
    }
    if (operation === 'added')
    {
      res.status(201).json({ success: true, message: `MockTest ${operation} successfully , please scroll down to add questions`, mockTestId: savedMockTest.mockTestId });
    }
    else {
      res.status(201).json({ success: true, message: `MockTest ${operation} successfully`, mockTestId: savedMockTest.mockTestId });
    }
  } catch (err) {
    console.error('Error saving mock test:', err);
    res.status(500).json({ success: false, message: 'Failed to save mock test' });
  }
});


router.post('/add-question', async (req, res) => {
  try {
    const { question, type, numChoices, totalMarks, mockTestId, correctChoice, description ,questionId,typeValue} = req.query;
    if (!question || !type || !mockTestId) {
      throw new Error('Question, Type, and MockTestId are required.');
    }
  
    let operation = "added";
    const choiceCount = numChoices || 0;
    let choices = [];
    const username = req.session.username;
    let questionData;

    if (questionId === null || questionId === undefined || questionId === '') {
       const newQuestion = new Question({
        questionId: uuidv4(),
        question,
        type,
        noOfChoices: numChoices,
        totalMarks,
        mockTestId,
        createdBy: username
       });
      questionData = await newQuestion.save();
    } else {
      operation = "updated";
      questionData = await Question.findOneAndUpdate(
        { questionId },
        { question, type, noOfChoices: numChoices, totalMarks, mockTestId, createdBy: username },
        { new: true }
      );
    }

    if (type.toLowerCase() === "mcq") {
      for (let i = 0; i < choiceCount; i++) {
        const choiceVal = req.query[`choice${i + 1}`];
        console.log("choices" + choiceVal);
        choices.push(choiceVal);
      }
      if (questionId) {
        await Choice.findOneAndUpdate(
          { questionId: questionData.questionId },
          { choice : choices, correctChoice }
        );
      } else {
        const choiceData = new Choice({
          choiceId: uuidv4(),
          choice : choices,
          correctChoice,
          questionId: questionData.questionId,
          createdBy: username
        });
        await choiceData.save();
      }
    } else {
      if (questionId) {
        await Descriptive.findOneAndUpdate(
          { questionId: questionData.questionId },
          { answer: description }
        );
      } else {
        const desc = new Descriptive({
          descriptiveId: uuidv4(),
          questionId: questionData.questionId,
          answer: description,
          createdBy: username
        });
        await desc.save();
      }
    }
    res.json({
      success: true,
      typeValue : typeValue,
      message: `Question ${operation} successfully!`,
      question: questionData
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: 'Error adding question: ' + err.message
    });
  }
});

router.post('/finalsubmit/:mockTestId', async (req, res) => {
  const { mockTestId } = req.params;
  try {
    const mtdata = await MockTest.findOne({ mockTestId });
    if (!mtdata) {
      return res.status(404).json({ message: 'MockTest not found' });
    }
    
    const QuestionData = await Question.find({ mockTestId, active: true });
    const noOfQuestions = QuestionData.length;
    const totalMarks = checkMarks(QuestionData);

    const dataUser = await User.findOne({ username: mtdata.createdBy });
   
    if (!dataUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (dataUser.role === 'special') {
      const assignId = uuidv4();
      const assignedMockTest = new AssignedMockTest({
        assignId,
        mocktestId: mockTestId,
        assignTo: dataUser.username,
        assignBy: dataUser.username,
        assignedOn: new Date(),
        flag: false
      });
      await assignedMockTest.save();
    }

    const result = await MockTest.findOneAndUpdate(
      { mockTestId },
      {
        noOfQuestions,
        totalMarks,
        submit: true,
        submitDate: new Date() 
      },
      { new: true }
    );

    if (result) {
      res.status(201).json({ message: `${result.mockTestName} submitted successfully.` });
    } else {
      res.status(404).json({ message: 'Failed to update MockTest.' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

function checkMarks(QuestionData) {
  const totalMarks = QuestionData.reduce((sum, item) => sum + item.totalMarks, 0);
  return totalMarks;
}

router.get('/fetchQuestion/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const question = await Question.findOne({ questionId: id });
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    const choices = await Choice.findOne({ questionId: id, active: true });
    const desc = await Descriptive.findOne({ questionId: id, active: true });

    let questionDetails = {};
    if (choices && choices.choice && Array.isArray(choices.choice)) {
      choices.choice.forEach((choice, index) => {
        questionDetails[`choice_${index + 1}`] = choice;
      });
    }

    res.status(200).json({
      questionId: question.questionId,
      mockTestId: question.mockTestId,
      type: question.type,
      question: question.question,
      numChoices: question.noOfChoices,
      questionDetails,
      correct_choice: choices ? choices.correctChoice : null,
      totalMarks: question.totalMarks,
      answer: desc ? desc.answer : null
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

//Hard delete the mocktest data
router.post('/mtdelete/:id', (req,res) => {
    const { id } = req.params;
    const result = MockTest.findOneAndDelete({mockTestId : id});
    if (result) {
        res.status(200).send(`${result.mockTestName} deleted successfully.`);
    } else {
        res.status(404).send('MockTest not found');
    }
});

//hard delete the question
router.post('/questdelete/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await Question.findOneAndDelete({ questionId: id });

    if (!result) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    const questionId = result.questionId;
    await Descriptive.deleteMany({ questionId: questionId });
    await Choice.deleteMany({ questionId: questionId });

    res.status(200).json({ success: true, message: `${result.question} deleted successfully.` });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

//soft delete the question
router.put('/questiondelete/:id', async (req, res) => {
  const { id } = req.params;
  const date = new Date();
  try {
    const result = await Question.findOneAndUpdate({ questionId: id }, { active : false , updatedDate : date});

    if (!result) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    const questionId = result.questionId;
    await Descriptive.findOneAndUpdate({ questionId: questionId }, {active : false, updatedDate : date});
    await Choice.findOneAndUpdate({ questionId: questionId }, {active : false, updatedDate : date});

    res.status(200).json({ success: true, message: `${result.question} deleted successfully.` });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});


//Hard delete the whole associated data
router.post('/delete/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // Delete MockTest
        const result = await MockTest.findOneAndDelete({ mockTestId: id });
        if (!result) {
            return res.status(404).send('MockTest not found');
        }
        // Delete associated descriptive answers and choices
        const questions = await Question.find({ mockTestId: id });
        // Delete associated questions
        await Question.deleteMany({ mockTestId: id });
        
        const questionIds = questions.map(q => q.questionId);
        await Descriptive.deleteMany({ questionId: { $in: questionIds } });
        await Choice.deleteMany({ questionId: { $in: questionIds } });
        // Delete associated assignments and marks
        await AssignedMockTest.deleteMany({ mocktestId: id });
        res.status(200).json({message : `${result.mockTestName} and associated data deleted successfully.`});
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

//soft delete the data
router.put('/deactivate/:id', async (req, res) => {
    const { id } = req.params;
    const date = new Date();
    try {
        // Deactivate MockTest
        const result = await MockTest.findOneAndUpdate({ mockTestId: id }, { active: false , updatedDate : date});

        if (!result) {
            return res.status(404).send('MockTest not found');
        }

        // Deactivate associated questions
        await Question.updateMany({ mockTestId: id }, { active: false, updatedDate : date });

        // Deactivate associated descriptive answers and choices
        const questions = await Question.find({ mockTestId: id });
        const questionIds = questions.map(q => q.questionId);
        await Descriptive.updateMany({ questionId: { $in: questionIds } }, { active: false, updatedDate : date });
        await Choice.updateMany({ questionId: { $in: questionIds } }, { active: false, updatedDate : date });

        // Deactivate associated assignments and marks
        await AssignedMockTest.updateMany({ mocktestId: id }, { flag: true, assignedOn : date });

        res.status(200).json({message : `${result.mockTestName} deactivated successfully.`});
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

//soft delete the data
router.put('/deleteAssign/:id', async (req, res) => {
  const { id } = req.params;
  const date = new Date();
  try {
      // Deactivate associated assignments and marks
    const result = await AssignedMockTest.updateMany({ assignId: id }, { flag: true, deletedOn: date });
    if (result) {
      res.status(200).json({ message: 'Assignment deleted' });
    } else {
      res.status(404).json({ message : 'Data not found' });
    }  
  } catch (err) {
      res.status(500).json({ message: 'Server error' });
  }
});

router.post('/deleteAssign/:assignId', async (req, res) => {
  try {
      const { assignId } = req.params;
      const result = await AssignedMockTest.findOneAndDelete({ assignId: assignId });
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

router.get('/active-mocktests', async (req, res) => {
  try {
        const user = req.session.username;
        const mockTests = await MockTest.find({ createdBy : user , active: true , submit : false});

        const mockTestData = await Promise.all(mockTests.map(async (mockTest) => {
            const questions = await Question.find({ mockTestId: mockTest.mockTestId });
            const allowActionValue = allowAction(req.session.role, req.session.rolelevel, req.session.component, req.session.action);
            const questionsWithDetails = await Promise.all(questions.map(async (question) => {
                let questionDetails = {
                    question_id: question.questionId,
                    question_name: question.question,
                    type: question.type,
                    total_marks: question.totalMarks
                };

                if (question.type.toLowerCase() === "mcq") {
                    const choices = await Choice.findOne({ questionId: question.questionId });
                    questionDetails.choices = choices.choice.map((choice, index) => ({
                        [`choice_${index + 1}`]: choice
                    })).reduce((acc, curr) => ({ ...acc, ...curr }), {});
                    questionDetails.correct_choice = choices.correctChoice;
                } else if (question.type.toLowerCase() === "desc") {
                    const desc = await Descriptive.findOne({ questionId: question.questionId });
                    questionDetails.correct_answer = desc.answer;
                }

                return questionDetails;
            }));

            return {
                mocktestId: mockTest.mockTestId,
                mocktestName: mockTest.mockTestName,
                total_marks: mockTest.totalMarks,
                noofquestions: questions.length,
                createDate: mockTest.createDate,
                closedOn: mockTest.closedOn,
                subject: mockTest.subject,
                mocktestQuestions: questionsWithDetails,
                allowAction : allowActionValue
            };
        }));

        res.status(200).json(mockTestData);
    } catch (err) {
        res.status(500).send('Error fetching active mock tests: ' + err.message);
    }
});


router.get('/get/all', async (req, res) => {
  try {
      const user = req.query.user;
      const role = req.query.role;
      const rolelevel = roleLevel(role);
      const accesslevel = accessLevelforClient(role,rolelevel);
      const now = new Date();
      let categories = rolelevel === 1 || (rolelevel === 2 && role !== 'special')  ?
          ["Pending Submission", "Open For Submission", "Submitted MockTest", "Open Submitted MockTest"] :
          ["New Arrival", "Retake test", "Pending MockTest", "Evaluated MockTest"];
      if (role === 'special')
      {
        categories = [];
        categories.push("Closed Submit", "Open", "Submitted MockTest", "New Arrival", "Retake", "Pending MockTest", "Evaluated MockTest");
      }
      const results = {};

      for (let category of categories) {
          let queryConditions = {
              createdBy: user,
              active: true
          };
          switch (category) {
              case "Open For Submission":
              case "Pending Submission":
                  queryConditions.submit = false;
                  queryConditions.closedOn = category === "Pending Submission" ? { $lt: now } : { $gte: now };
                  const mockTestData1 = await MockTest.find(queryConditions);
                  results[category] = await processAvailableMockTests(mockTestData1, accesslevel,role);
              break;
              case "Open":
              case "Closed Submit":
                    queryConditions.submit = false;
                    queryConditions.closedOn = category === "Closed Submit" ? { $lt: now } : { $gte: now };
                    const mockTestData2 = await MockTest.find(queryConditions);
                    results[category] = await processAvailableMockTests(mockTestData2, accesslevel,role);
              break;
              case "Open Submitted MockTest":
              case "Submitted MockTest":
                  queryConditions.submit = true;
                  queryConditions.closedOn = category === "Submitted MockTest" ? { $lt: now } : { $gte: now };
                  results[category] = await MockTest.find(queryConditions);
                  break; 
              default:
                  const assignedMockTests = await AssignedMockTest.find({ assignTo: user, flag: false });
                  results[category] = await processAssignedMockTests(assignedMockTests, now, category,user);
                  break;
          }
      }
      res.status(200).json(results);
  } catch (err) {
      console.error('Error fetching mock tests:', err);
      res.status(500).send('Error fetching mock tests: ' + err.message);
  }
});

async function processAvailableMockTests(mocktests,accesslevel,role) {
  return Promise.all(mocktests.map(async (mockTest) => {
    const mockData = await MockTest.findOne({ mockTestId: mockTest.mockTestId }); 
    const questionData = await Question.findOne({ mockTestId: mockTest.mockTestId }); 
    const assignedMocktest = await AssignedMockTest.findOne({ mocktestId: mockTest.mockTestId });
    console.log("mocktestId" + mockTest.mockTestId);
    if (questionData && assignedMocktest) 
    {
      console.log("studentData is available"); 
      return mockData;
    }
    else if (questionData && accesslevel === 1 && role === 'special') {
      console.log("mt to show up");
      return mockData;
    }
    else {
      return null;
     }
  })).then(results => results.filter(mockData => mockData !== null));
}

async function processAssignedMockTests(assignedMockTests, now, category, user) {
  return Promise.all(assignedMockTests.map(async (mockTest) => {
    console.log("mockTestAssignId: " + mockTest.assignId + ", mockTestId: " + mockTest.mocktestId);
    const studentData = await StudentMockTestMarks.findOne({ mocktestAssignId: mockTest.assignId, username: user });
    let queryConditions = {
      mockTestId: mockTest.mocktestId,
      active: true,
      submit: true
    };
    switch (category) {
      case "New Arrival":
        queryConditions.closedOn = { $gte: now };
        break;
      case "Pending MockTest":
        queryConditions.closedOn = { $lt: now };
        break;
      case "Retake":
        queryConditions.closedOn = { $gte: now };
        break;
      case "Retake test":
        queryConditions.closedOn = { $gte: now };
        break;
      case "Evaluated MockTest":
        queryConditions.closedOn = { $lt: now };
        break;
    }
    const mockData = await MockTest.findOne(queryConditions);

    if (mockData) {
      if ((studentData && (category === 'Retake test' || category === 'Retake' || category === 'Evaluated MockTest')) ||
          (!studentData && (category === 'New Arrival' || category === 'Pending MockTest'))) {
       
        return {
          ...mockData.toObject(), 
          mocktestAssignId: mockTest.assignId
        };
      }
    }

    return null; 
  })).then(results => results.filter(data => data !== null));
}



router.get('/inactive-mocktests', async (req, res) => {
  try {
        const user = req.session.username;
        const mockTests = await MockTest.find({ active: false, createdBy : user });
        const allowActionValue = allowAction(req.session.role, req.session.rolelevel, req.session.component, req.session.action);
        const mockTestData = await Promise.all(mockTests.map(async (mockTest) => {
         
          const questions = await Question.find({ mockTestId: mockTest.mockTestId });
         
            return {
                mocktestName: mockTest.mockTestName,
                total_marks: mockTest.totalMarks,
                noofquestions: mockTest.noOfQuestions,
                createDate: mockTest.createDate,
                closedOn: mockTest.closedOn,
                subject: mockTest.subject,
                mocktestId: mockTest.mockTestId,
                allowAction : allowActionValue
            };
        }));

        res.status(200).json(mockTestData);
    } catch (err) {
        res.status(500).send('Error fetching inactive mock tests: ' + err.message);
    }
});

router.get('/recent-active-mocktests', async (req, res) => {
    try {
        const tenDaysAgo = new Date();
        tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
      const user = req.session.username;
      const mockTests = await MockTest.find({
            createdBy: user,
            active: true,
            submit : false,
            closedOn: { $gte: tenDaysAgo }
        });
        const allowActionValue = allowAction(req.session.role, req.session.rolelevel, req.session.component, req.session.action);
        const mockTestData = await Promise.all(mockTests.map(async (mockTest) => {

            return {
                mocktestName: mockTest.mockTestName,
                total_marks: mockTest.totalMarks,
                noofquestions: mockTest.noOfQuestions,
                createDate: mockTest.createDate,
                closedOn: mockTest.closedOn,
                subject: mockTest.subject,
                mocktestId: mockTest.mockTestId,
                allowAction: allowActionValue,
                createdBy: user
            };
        }));

        res.status(200).json(mockTestData);
    } catch (err) {
        res.status(500).send('Error fetching recently closed mock tests: ' + err.message);
    }
});

router.get('/recent-active-submitmocktests', async (req, res) => {
  try {
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 30);
    const user = req.session.username;
    const mockTests = await MockTest.find({
          createdBy: user,
          active: true,
          submit : true,
          closedOn: { $gte: tenDaysAgo }
      });
      const allowActionValue = allowAction(req.session.role, req.session.rolelevel, req.session.component, req.session.action);
      const mockTestData = await Promise.all(mockTests.map(async (mockTest) => {
          const questions = await Question.find({ mockTestId: mockTest.mockTestId });

          return {
              mocktestName: mockTest.mockTestName,
              total_marks: mockTest.totalMarks,
              noofquestions: mockTest.noOfQuestions,
              createDate: mockTest.createDate,
              closedOn: mockTest.closedOn,
              subject: mockTest.subject,
              mocktestId: mockTest.mockTestId,
              allowAction: allowActionValue,
              createdBy: user
          };
      }));

      res.status(200).json(mockTestData);
  } catch (err) {
      res.status(500).send('Error fetching recently closed mock tests: ' + err.message);
  }
});


router.get('/past-due-mocktests', async (req, res) => {
    try {
      const now = new Date();
      const user = req.session.username;

      const mockTests = await MockTest.find({
            createdBy : user,
            active: true,
            submit : false,
            closedOn: { $lt: now }
        });
        const allowActionValue = allowAction(req.session.role, req.session.rolelevel, req.session.component, req.session.action);
        const mockTestData = await Promise.all(mockTests.map(async (mockTest) => {
            const questions = await Question.find({ mockTestId: mockTest.mockTestId });

            return {
                mocktestName: mockTest.mockTestName,
                total_marks: mockTest.totalMarks,
                noofquestions: mockTest.noOfQuestions,
                createDate: mockTest.createDate,
                closedOn: mockTest.closedOn,
                subject: mockTest.subject,
                mocktestId: mockTest.mockTestId,
                allowAction: allowActionValue,
                createdBy : user,
            };
        }));

        res.status(200).json(mockTestData);
    } catch (err) {
        res.status(500).send('Error fetching past due mock tests: ' + err.message);
    }
});

router.get('/past-due-submitmocktests', async (req, res) => {
  try {
    const now = new Date();
    const user = req.session.username;

    const mockTests = await MockTest.find({
          createdBy : user,
          active: true,
          submit : true,
          closedOn: { $lt: now }
      });
      const allowActionValue = allowAction(req.session.role, req.session.rolelevel, req.session.component, req.session.action);
      const mockTestData = await Promise.all(mockTests.map(async (mockTest) => {
          const questions = await Question.find({ mockTestId: mockTest.mockTestId });

          return {
              mocktestName: mockTest.mockTestName,
              total_marks: mockTest.totalMarks,
              noofquestions: mockTest.noOfQuestions,
              createDate: mockTest.createDate,
              closedOn: mockTest.closedOn,
              subject: mockTest.subject,
              mocktestId: mockTest.mockTestId,
              allowAction: allowActionValue,
              createdBy : user,
          };
      }));

      res.status(200).json(mockTestData);
  } catch (err) {
      res.status(500).send('Error fetching past due mock tests: ' + err.message);
  }
});


router.get('/allByUserwithoutDeleted', async (req, res) => {
  try {
        const user = req.session.username;
        const now = new Date();
        const mockTests = await MockTest.find({ createdBy : user, active: true ,  submit : false,closedOn: { $gte: now }});
        const mockTestData = await Promise.all(mockTests.map(async (mockTest) => {
        const allowActionValue = allowAction(req.session.role, req.session.rolelevel, req.session.component, req.session.action);
            return {
                mocktestName: mockTest.mockTestName,
                total_marks: mockTest.totalMarks,
                noofquestions: mockTest.noOfQuestions,
                createDate: mockTest.createDate,
                closedOn: mockTest.closedOn,
                subject: mockTest.subject,
                mocktestId: mockTest.mockTestId,
                createdBy: user,
                allowAction : allowActionValue
            };
        }));

        res.status(200).json(mockTestData);
    } catch (err) {
        res.status(500).send('Error fetching inactive mock tests: ' + err.message);
    }
});


router.put('/resetMockTest/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const mockTest = await MockTest.findOne({ mockTestId: id });
    if (!mockTest) {
      return res.status(404).send('MockTest not found');
    }
    const dateNow = new Date();
    const dateTomorrow = new Date(dateNow.getTime() + (24 * 60 * 60 * 1000)); // Add 24 hours
    const updatedMockTest = await MockTest.findOneAndUpdate(
      { mockTestId: id },
      { closedOn: dateTomorrow, updatedDate: dateNow },
      { new: true }
    );

    if (!updatedMockTest) {
      return res.status(404).send('Unable to update MockTest.');
    }
    await AssignedMockTest.updateMany(
      { mockTestId: id },
      { flag: true, deletedOn: dateNow }
    );
    res.status(200).json({ message: `${updatedMockTest.mockTestName} reopened successfully and will close again at ${updatedMockTest.closedOn}.` });
  } catch (err) {
    res.status(500).send('Error updating mock test: ' + err.message);
  }
});

router.put('/undoMockTest/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const date = new Date();
    const mockTest = await MockTest.findOne({ mockTestId: id });
    if (!mockTest) {
        return res.status(404).send('MockTest not found');
    }

    const updatedMockTest = await MockTest.findOneAndUpdate(
      { mockTestId: id },
      { active : true, updatedDate : date },
      { new: true }
    );

    if (!updatedMockTest) {
      return res.status(404).send('Unable to update MockTest.');
    }

    await Question.updateMany({ mockTestId: id }, { active: true,updatedDate : date });

    const questions = await Question.find({ mockTestId: id });
    const questionIds = questions.map(q => q.questionId);
    await Descriptive.updateMany({ questionId: { $in: questionIds } }, { active: true,updatedDate : date });
    await Choice.updateMany({ questionId: { $in: questionIds } }, { active: true,updatedDate : date });

    await AssignedMockTest.updateMany({ mocktestId: id }, { flag: true,assignedOn:date });

    res.status(200).json({ message: `${updatedMockTest.mockTestName} reverted successfully and will close again at ${updatedMockTest.closedOn}.` });
  } catch (err) {
    res.status(500).send('Error updating mock test: ' + err.message);
  }
});

router.put('/undoQuestion/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const date = new Date();
    const questionData = await Question.findOne({ questionId: id });
    if (!questionData) {
        return res.status(404).send('question not found');
    }

    const updatedQuestion = await Question.findOneAndUpdate(
      { questionId: id },
      { active : true, updatedDate : date },
      { new: true }
    );

    if (!updatedQuestion) {
      return res.status(404).send('Unable to update question.');
    }
   
    await Descriptive.findOneAndUpdate({ questionId: id }, { active: true,updatedDate : date });
    await Choice.findOneAndUpdate({ questionId: id }, { active: true,updatedDate : date });

    res.status(200).json({ success : true, message: `${questionData.question} reverted successfully` });
  } catch (err) {
    res.status(500).send('Error updating mock test: ' + err.message);
  }
});

router.put('/undoAssignMockTest/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const date = new Date();
    const assigned = await AssignedMockTest.findOneAndUpdate(
      { assignId: id },
      { flag: false, assignedOn: date },
      { new: true }  
    );
    
    if (!assigned) {
      return res.status(404).send('Assignment not found');
    }
    res.status(200).json({ message: 'Reverted successfully' });
  } catch (err) {
    res.status(500).send('Error updating mock test: ' + err.message);
  }
});



router.get('/fetchsubmit/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const mockTest = await MockTest.findOne({ mockTestId: id });
    if (!mockTest) {
      return res.status(404).send('MockTest not found');
    }

    const assignedData = await AssignedMockTest.find({ mocktestId: id, flag: false });
    const assignStudentCount = assignedData.length;

    const studentTakenData = await StudentMockTestMarks.find({ mocktestId: id, flag: false });
    const studentCount = studentTakenData.length;
    
    const questions = await Question.find({ mockTestId: mockTest.mockTestId, active: true });

    const mockTestData = {
      mocktestId: mockTest.mockTestId,
      subject: mockTest.subject,
      createdBy: mockTest.createdBy,
      mocktestName: mockTest.mockTestName,
      total_marks: mockTest.totalMarks,
      noofquestions: questions.length,
      createDate: mockTest.createDate,
      updatedDate: mockTest.updatedDate,
      closedOn: mockTest.closedOn,
      active: mockTest.active,
      studentsAssigned: assignStudentCount,
      takenCount: studentCount
    };

    res.status(200).json(mockTestData);
  } catch (err) {
    console.error('Error fetching mock test:', err);
    res.status(500).send('Error fetching mock test');
  }
});

router.get('/fetchmocktest/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const mockTest = await MockTest.findOne({ mockTestId: id });
        if (!mockTest) {
            return res.status(404).send('MockTest not found');
        }
        const questions = await Question.find({ mockTestId: mockTest.mockTestId });
        const questionsWithDetails = await Promise.all(questions.map(async (question) => {
            let questionDetails = {
                question_id: question.questionId,
                question_name: question.question,
                type: question.type,
                total_marks: question.totalMarks,
                active: question.active,
                createDate: question.createDate,
                updatedDate: question.updatedDate,
                createdBy: question.createdBy
            };
            if (question.type.toLowerCase() === "mcq") {
                const choices = await Choice.findOne({ questionId: question.questionId });
                questionDetails.choices = choices.choice.map((choice, index) => ({
                    [`choice_${index + 1}`]: choice
                })).reduce((acc, curr) => ({ ...acc, ...curr }), {});
                questionDetails.correct_choice = choices.correctChoice;
            } else if (question.type.toLowerCase() === "desc") {
                const desc = await Descriptive.findOne({ questionId: question.questionId });
                questionDetails.correct_answer = desc.answer;
            }
            return questionDetails;
        }));

      const mockTestData = {
            mocktestId: mockTest.mockTestId,
            subject: mockTest.subject,
            createdBy: mockTest.createdBy,
            mocktestName: mockTest.mockTestName,
            total_marks: mockTest.totalMarks,
            noofquestions: mockTest.noOfQuestions,
            createDate: mockTest.createDate,
            updatedDate : mockTest.updatedDate,
            closedOn: mockTest.closedOn,
            active : mockTest.active,
            mocktestQuestions: questionsWithDetails
        };
        res.status(200).json(mockTestData);
    } catch (err) {
        res.status(500).send('Error fetching mock test: ' + err.message);
    }
});

router.get('/getQuestions', async (req, res) => {
  try {
    const { mockTestId,view } = req.query;
    
      const mockTest = await MockTest.findOne({ mockTestId: mockTestId });
      if (!mockTest) {
          return res.status(404).send('MockTest not found');
      }
    let questions = {};
    if (view === 'start')
    {
       questions = await Question.find({ mockTestId: mockTest.mockTestId ,active : true});
    } else {
       questions = await Question.find({ mockTestId: mockTest.mockTestId });
    }
      const questionsWithDetails = await Promise.all(questions.map(async (question,index) => {
        let questionDetails = {
              question_id: index,
              question_name: question.question,
              type: question.type.toLowerCase(),
              total_marks: question.totalMarks,
              active: question.active,
              createDate: question.createDate,
              updatedDate: question.updatedDate,
              createdBy: question.createdBy,
          };
          if (question.type.toLowerCase() === "mcq") {
            const choices = await Choice.findOne({ questionId: question.questionId });
            if (choices && choices.choice) {
                choices.choice.forEach((choice, index) => {
                    questionDetails[`choice_${index + 1}`] = choice;
                });
                questionDetails.correct_choice = choices.correctChoice;
            }
         }
          else if (question.type.toLowerCase() === "desc") {
              const desc = await Descriptive.findOne({ questionId: question.questionId });
              questionDetails.correct_answer = desc.answer;
          }
          return questionDetails;
      }));

    const mockTestData = {
          mocktestId: mockTest.mockTestId,
          subject: mockTest.subject,
          createdBy: mockTest.createdBy,
          mocktestName: mockTest.mockTestName,
          total_marks: mockTest.totalMarks,
          noofquestions: questions.length,
          createDate: mockTest.createDate,
          updatedDate : mockTest.updatedDate,
          closedOn: mockTest.closedOn,
          active : mockTest.active,
          mocktestQuestions: questionsWithDetails
      };
      res.status(200).json(mockTestData);
  } catch (err) {
      res.status(500).send('Error fetching mock test: ' + err.message);
  }
});

router.get('/unassignedUsers', async (req, res) => {
  try {
    const { mocktestId } = req.query;
    const username = req.session.username;

    // Fetch user data
    const userData = await User.findOne({ username });
    if (!userData) {
      return res.status(404).send('User not found');
    }

   
    const assignedUsers = await AssignedMockTest.find({ mocktestId, assignBy: username, flag: false }).select('assignTo');
    const assignedUserNames = assignedUsers.map(assignment => assignment.assignTo);

    let unassignedUsers = [];
    let unassignedGuestUsers = [];
    let orginalVAlues = [];

   
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



  router.post('/assignUser', async (req, res) => {
    try {
      const { username, mocktestId } = req.body;
      console.log("mocktestId" + mocktestId);
      const user = req.session.username;
      const assignId = uuidv4();
      let text = "assigned";
      const assignedMt = await AssignedMockTest.findOne({ mocktestId, flag : true, assignTo: username }).select('assignTo');
      if (assignedMt)
      {
        text = "reassigned";
        await AssignedMockTest.findOneAndUpdate(
          { assignTo: username, mocktestId },
          { flag : false, assignBy : user , assignedOn: new Date()},
          { new: true }
        );
      } else {
        const assignedMockTest = new AssignedMockTest({
          assignId,
          mocktestId,
          assignTo : username,
          assignBy : user, 
          assignedOn: new Date(),
          flag: false
        }); 
        await assignedMockTest.save();
      }
      res.status(200).json({ success: true, message: `User ${text} successfully` });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });

router.get('/todayassign', async (req, res) => {
    try {
      const  user  = req.session.username;
      const today = new Date().toISOString().split('T')[0];
      const allowActionValue = allowAction(req.session.role, req.session.rolelevel, req.session.component, req.session.action);
      
      const mocktests = await MockTest.find({
        createdBy: user,
        createdOn: { $gte: new Date(today), $lt: new Date(new Date(today).getTime() + 24 * 60 * 60 * 1000) },
        active: true
      });
  
      
        const transformedMockTest = await Promise.all(mocktests.map(async mocktest => {
        const questions = await Question.find({ mockTestId: mocktest.mockTestId,active: true });
        const assignedMockTest = await AssignedMockTest.find({
          mocktestId: mocktest.mockTestId,
          flag: false
        });
  
       
        return assignedMockTest.map(assignMt => ({
          assignId: assignMt.assignId,
          mocktestId: assignMt.mocktestId,
          mockTestName: mocktest.mockTestName,
          assignedBy: assignMt.assignBy,
          assignedTo: assignMt.assignTo,
          assignedOn: assignMt.assignedOn,
          total_marks: mocktest.totalMarks,
          noofquestions: questions.length,
          createDate: mocktest.createDate,
          closedOn: mocktest.closedOn,
          subject: mocktest.subject,
          allowAction : allowActionValue
        }));
      }));
  
     
      const flattenedMockTest = transformedMockTest.flat();
  
      
      const groupedMockTest = flattenedMockTest.reduce((acc, mocktest) => {
        if (!acc[mocktest.mockTestName]) {
          acc[mocktest.mockTestName] = [];
        }
        acc[mocktest.mockTestName].push(mocktest);
        return acc;
      }, {});
  
      res.status(200).json(groupedMockTest);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
});


router.get('/latestassign', async (req, res) => {
  try {
    const user = req.session.username;
    console.log("username" + user);
    const assignedMockTest = await AssignedMockTest.find({
      assignBy: user,
      flag: false
    }).sort({ createdOn: -1 }).limit(10);
    
      const transformedMockTest = await Promise.all(assignedMockTest.map(async assignMt => {
      const questions = await Question.find({ mockTestId: assignMt.mocktestId , active: true});
      const mocktest = await MockTest.findOne({
        mockTestId: assignMt.mocktestId,
        active: true
      });
        const allowActionValue = allowAction(req.session.role, req.session.rolelevel, req.session.component, req.session.action);
      return {
          assignId: assignMt.assignId,
          mocktestId: assignMt.mocktestId,
          mockTestName: mocktest.mockTestName,
          assignedBy: assignMt.assignBy,
          assignedTo: assignMt.assignTo,
          assignedOn: assignMt.assignedOn,
          total_marks: mocktest.totalMarks,
          noofquestions: mocktest.noOfQuestions,
          createDate: mocktest.createDate,
          closedOn: mocktest.closedOn,
          subject: mocktest.subject,
          allowAction : allowActionValue
      };
    }));

    const groupedMockTest = transformedMockTest.reduce((acc, mocktest) => {
      if (!acc[mocktest.mockTestName]) {
        acc[mocktest.mockTestName] = [];
      }
      acc[mocktest.mockTestName].push(mocktest);
      return acc;
    }, {});

    res.status(200).json(groupedMockTest);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});


router.get('/recentdelete', async (req, res) => {
  try {
    const  user  = req.session.username;
    const assignedMocktest = await AssignedMockTest.find({
      assignBy: user,
      flag: true
    }).sort({ deletedOn: -1 }).limit(10);
        const allowActionValue = allowAction(req.session.role, req.session.rolelevel, req.session.component, req.session.action);
        const transformedMockTest = await Promise.all(assignedMocktest.map(async assignMt => {
        const questions = await Question.find({ mockTestId: assignMt.mocktestId,active: true });
        const mocktest = await MockTest.findOne({
          mockTestId: assignMt.mocktestId,
          active: true
        });
        return {
            assignId: assignMt.assignId,
            mocktestId: assignMt.mocktestId,
            mockTestName: mocktest.mockTestName,
            assignedBy: assignMt.assignBy,
            assignedTo: assignMt.assignTo,
            assignedOn: assignMt.assignedOn,
            total_marks: mocktest.totalMarks,
            noofquestions: questions.length,
            createDate: mocktest.createDate,
            closedOn: mocktest.closedOn,
            subject: mocktest.subject,
            allowAction : allowActionValue
        };
      }));
  

    const groupedMockTest = transformedMockTest.reduce((acc, mocktest) => {
        if (!acc[mocktest.mockTestName]) {
          acc[mocktest.mockTestName] = [];
        }
        acc[mocktest.mockTestName].push(mocktest);
        return acc;
      }, {});
  
      res.status(200).json(groupedMockTest);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});


router.get('/allassignnotdeleted', async (req, res) => {
  try {
    const  user  = req.session.username;
    const assignedmockTest = await AssignedMockTest.find({
      assignBy: user,
      flag: false
    });
        const allowActionValue = allowAction(req.session.role, req.session.rolelevel, req.session.component, req.session.action);
        const transformedMockTest = await Promise.all(assignedmockTest.map(async assignMt => {
        const questions = await Question.find({ mockTestId: assignMt.mocktestId,active: true });
        const mocktest = await MockTest.findOne({
          mockTestId: assignMt.mocktestId,
          active: true
        });
        return {
            assignId: assignMt.assignId,
            mocktestId: assignMt.mocktestId,
            mockTestName: mocktest.mockTestName,
            assignedBy: assignMt.assignBy,
            assignedTo: assignMt.assignTo,
            assignedOn: assignMt.assignedOn,
            total_marks: mocktest.totalMarks,
            noofquestions: questions.length,
            createDate: mocktest.createDate,
            closedOn: mocktest.closedOn,
            subject: mocktest.subject,
            allowAction : allowActionValue
        };
      }));
  

    const groupedMockTest = transformedMockTest.reduce((acc, mocktest) => {
        if (!acc[mocktest.mockTestName]) {
          acc[mocktest.mockTestName] = [];
        }
        acc[mocktest.mockTestName].push(mocktest);
        return acc;
      }, {});
  
      res.status(200).json(groupedMockTest);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});


router.get('/search', async (req, res) => {
  try {
    const username = req.session.username;
    const roleLevel = req.session.roleLevel;
    const { mockTestName, actiontype, searchType, purpose } = req.query;
    let active = purpose !== 'deleted';

    let queryConditions = [];
    if (mockTestName) {
      const searchCondition = { 
        active: active, 
        mockTestName: searchType === 'general' ? { $regex: mockTestName, $options: 'i' } : mockTestName
      };
      if (roleLevel !== 1) {
        searchCondition.createdBy = username;
      }
      queryConditions.push(searchCondition);
    }

    const mockTests = await MockTest.find({ $or: queryConditions });
    if (mockTests.length === 0) {
      return res.render('mt/mtdetails', { data: [] });
    }

    const dataResult = await Promise.all(mockTests.map(async (mt) => {
      const questions = await Question.find({ mockTestId: mt.mockTestId });
      const questionsWithDetails = await Promise.all(questions.map(async (question) => {
          let questionDetails = {
              question_id: question.questionId,
              question_name: question.question,
              type: question.type,
              total_marks: question.totalMarks,
              active : question.active
          };

          if (question.type.toLowerCase() === "mcq") {
              const choices = await Choice.findOne({ questionId: question.questionId });
              questionDetails.choices = choices ? choices.choice.reduce((acc, choice, index) => ({
                ...acc,
                [`choice_${index + 1}`]: choice
            }), {}) : {};
              questionDetails.correct_choice = choices.correctChoice;
          } else if (question.type.toLowerCase() === "desc") {
              const desc = await Descriptive.findOne({ questionId: question.questionId });
              questionDetails.correct_answer = desc.answer;
          }

          return questionDetails;
      }));

      return {
          mockTestId: mt.mockTestId,
          mockTestName: mt.mockTestName,
          totalMarks: mt.totalMarks,
          noOfQuestions: questions.length,
          createDate: mt.createDate,
          closedOn: mt.closedOn,
          subject: mt.subject,
          active : active,
          mockTestQuestions: questionsWithDetails
      };
    }));

    return res.render('mt/mtdetails', { data: dataResult });
  } catch (err) {
    console.error(err.message);
    return res.status(500).send('Server error');
  }
});



router.get('/searchquestion', async (req, res) => {
  try {
    const username = req.session.username;
    const roleLevel = req.session.roleLevel;
    const { question, actiontype, searchType, purpose } = req.query;
    let active = purpose !== 'deleted';
    let queryConditions = [];
    if (question) {
      const searchCondition = { 
        active: active, 
        question: searchType === 'general' ? { $regex: question, $options: 'i' } : question
      };
      if (roleLevel !== 1) {
        searchCondition.createdBy = username;
      }
      queryConditions.push(searchCondition);
    }

    const questiondata = await Question.find({ $or: queryConditions });
    if (questiondata.length === 0) {
      return res.render('mt/mtquestdetails', { data: [] });
    }

    // Fetch choices and descriptive answers for the questions
    const choices = await Choice.find({
      questionId: { $in: questiondata.map(q => q.questionId) }
    });

    const descriptives = await Descriptive.find({
      questionId: { $in: questiondata.map(q => q.questionId) }
    });

    const mockTestIds = questiondata.map(q => q.mockTestId);
    const mockTests = await MockTest.find({ 'mockTestId': { $in: mockTestIds } });
      const data = questiondata.map(q => {
        const questionChoices = choices.filter(c => c.questionId === q.questionId);
        const choices1 = questionChoices[0].choice;
        const actualchoices = choices1.map((choice, index) => ({
        [`Choice_${index + 1}`]: choice
        })).reduce((acc, curr) => ({ ...acc, ...curr }), {});
       const questionDescriptive = descriptives.find(d => d.questionId === q.questionId);
       const mtdata = mockTests.find(mt => mt.mockTestId.toString() === q.mockTestId.toString());
      const correctChoice = questionChoices.find(c => c.correctChoice);

      return {
        questionId: q.questionId,
        question: q.question,
        type: q.type,
        choices: actualchoices, 
        descriptiveAnswer: questionDescriptive ? questionDescriptive.answer : 'No descriptive answer',
        createdBy: q.createdBy,
        createDate: q.createDate,
        updatedDate: q.updatedDate,
        active: q.active,
        totalMarks : q.totalMarks,
        correctChoice: correctChoice ? correctChoice.correctChoice : "No Choice",
        mockTestName: mtdata ? mtdata.mockTestName : 'Unknown',
        mockTestId : mtdata ? mtdata.mockTestId : '',
        closedOn: mtdata.closedOn,
        mactive : mtdata.active
      };
    });

    res.render('mt/mtquestdetails', { data });
  } catch (err) {
    console.error(err.message);
    return res.status(500).send('Server error');
  }
});

router.post('/studentsubmit', async (req, res) => {
  const { totalMarks, username, mocktestAssignId } = req.body;
  
  try {

    if (!totalMarks || !username || !mocktestAssignId) {
      return res.status(400).send('Invalid request data');
    }

    const assignData = await AssignedMockTest.findOne({ assignId: mocktestAssignId });
    if (!assignData) {
      return res.status(404).send('MockTest Assignment not found');
    }

    const stdTakenTest = await StudentMockTestMarks.findOne({
      mocktestAssignId: mocktestAssignId,
      mocktestId: assignData.mocktestId,
      username: username
    });

    let data;

    if (stdTakenTest) {
      data = await StudentMockTestMarks.findOneAndUpdate(
        {
          mocktestAssignId: mocktestAssignId,
          mocktestId: assignData.mocktestId,
          username: username
        },
        {
          $set: {
            marks: Math.max(stdTakenTest.marks, totalMarks),
            assignBy: assignData.assignBy,
            assignedOn: assignData.assignedOn,
            takenOn: new Date() 
          },
          $inc: { count: 1 } 
        },
        {
          new: true
        }
      );
    } else {
      const newStudentMockData = new StudentMockTestMarks({
        mocktestMarksId: uuidv4(),
        marks: totalMarks,
        username,
        mocktestAssignId,
        mocktestId: assignData.mocktestId,
        assignBy: assignData.assignBy,
        assignedOn: assignData.assignedOn,
        count: 1,
        flag: false,
        takenOn: new Date() 
      });
      data = await newStudentMockData.save();
      if (!data) {
        return res.status(500).send('Failed to update or create record');
      }
    }
    res.status(200).json(data);
  } catch (error) {
    console.error('Error processing student submit:', error);
    res.status(500).send('Failed to process submission');
  }
});


router.get('/viewmarks/:mocktestId', async (req, res) => {
  const { mocktestId } = req.params;
  try {
  
    const mockTestData = await MockTest.find({ mockTestId: mocktestId, active: true });
    if (!Array.isArray(mockTestData) || mockTestData.length === 0) {
      return res.status(404).send('No mock test data found.');
    }
    
    const studentAssignedData = await AssignedMockTest.find({ mocktestId: mockTestData[0].mockTestId, flag: false });
    
    
    if (!Array.isArray(studentAssignedData) || studentAssignedData.length === 0) {
      return res.status(404).send('No assigned mock test data found.');
    }

    const studentMockTestData = await Promise.all(studentAssignedData.map(async (element) => {
      const studentmockdata = await StudentMockTestMarks.findOne({
        mocktestAssignId: element.assignId,
        flag: false
      });
      
      if (studentmockdata) {
        return {
          mocktestId: studentmockdata.mocktestId,
          mocktestName: mockTestData.mockTestName,
          subject : mockTestData.subject,
          username: studentmockdata.username,
          createdBy: studentmockdata.createdBy,
          marks: studentmockdata.marks,
          takenOn: studentmockdata.takenOn,
          lastTakenOn: studentmockdata.lastTakenOn,
          assignedOn: studentmockdata.assignedOn,
          count: studentmockdata.count,
          assignBy: studentmockdata.assignBy
        };
      } else {
        const assignedData = await AssignedMockTest.findOne({ assignId: element.assignId, flag: false });
        const mockData = await MockTest.findOne({ mockTestId: assignedData.mocktestId, active: true });
        return {
          mocktestId: mockData.mockTestId,
          mocktestName: mockData.mockTestName,
          subject : mockData.subject,
          username: assignedData.assignTo,
          createdBy: mockData.createdBy,
          marks: "-",
          takenOn: "-",
          lastTakenOn: "-",
          assignedOn: assignedData.assignedOn,
          count: "-",
          assignBy: assignedData.assignBy
        };
      }
    }));

    studentMockTestData.sort((a, b) => {
      if (a.marks === "-" && b.marks === "-") return 0; 
      if (a.marks === "-") return 1; 
      if (b.marks === "-") return -1; 
      return a.marks - b.marks; 
    });
    
    if (!studentMockTestData || studentMockTestData.length === 0) {
      return res.status(404).send('No student mock test data found.');
    }

    res.status(200).json(studentMockTestData);
  } catch (error) {
    console.error('Failed to fetch student mock test data:', error);
    res.status(500).send('Internal Server Error');
  }
});


router.get('/viewStudentMarks/:mocktestAssignId', async (req, res) => {
  const { mocktestAssignId } = req.params;

  try {
    const studentmockdata = await StudentMockTestMarks.find({ mocktestAssignId: mocktestAssignId, flag: false });

    if (!studentmockdata || studentmockdata.length === 0) {
      return res.status(404).send('No student mock test data found.');
    }
    
    const studmockTestData = studentmockdata.map((event) => {
      return {
        assignTo: event.username,
        marks: event.marks,
        takenOn: event.takenOn,
        count: event.count,
      };
    });
    
    res.status(200).json(studmockTestData);
  } catch (error) {
    console.error('Failed to fetch student mock test data:', error);
    res.status(500).send('Internal Server Error');
  }
});


export default router;