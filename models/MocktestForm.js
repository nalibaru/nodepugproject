import mongoose from 'mongoose';

const MocktestFormSchema = new mongoose.Schema({
    mockTestId : { type : String, required : true, unique : true},
    mockTestName: { type: String, required: true },
    subject: { type: String, required: true },
    noOfQuestions: { type: Number, required: false },
    createdBy: { type: String, required: true },
    createDate: { type: Date, default: Date.now },
    closedOn: { type: Date },
    updatedDate: { type: Date, default: Date.now },
    active: { type: Boolean, default: true },
    totalMarks: { type: Number, required: false },
    submit: { type: Boolean, default: false },
    submitDate : { type: Date }
});
  
export default mongoose.model('MocktestForm', MocktestFormSchema);