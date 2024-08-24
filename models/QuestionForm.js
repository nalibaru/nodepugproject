import mongoose from 'mongoose';

const QuestionFormSchema = new mongoose.Schema({
    questionId : { type: String, required: true, unique : true },
    question: { type: String, required: true },
    type: { type: String, required: true  },
    noOfChoices: { type: Number, required: false },
    createdBy: { type: String, required: true },
    createDate: { type: Date, default: Date.now },
    updatedDate: { type: Date, default: Date.now },
    active: { type: Boolean, default: true },
    totalMarks: { type: Number, required: false },
    mockTestId : { type : String, required : true }
});
  
export default mongoose.model('QuestionForm', QuestionFormSchema);