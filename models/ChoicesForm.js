import mongoose from 'mongoose';

const ChoicesFormSchema = new mongoose.Schema({
    choiceId : { type : String, required : true, unique : true},
    choice: { type: Array, required: true },
    correctChoice : { type: String, required: true},
    questionId: { type: String, required: true },
    createdBy: { type: String, required: true },
    createDate: { type: Date, default: Date.now },
    updatedDate: { type: Date, default: Date.now },
    active: { type: Boolean, default: true }
});
  
export default mongoose.model('ChoicesForm', ChoicesFormSchema);