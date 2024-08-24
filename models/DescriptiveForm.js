import mongoose from 'mongoose';

const DescriptiveFormSchema = new mongoose.Schema({
    descriptiveId : {type:String, required:true , unique :true},
    questionId: { type: String, required: true },
    answer: { type: String, required: true },
    createdBy: { type: String, required: true },
    createDate: { type: Date, default: Date.now },
    updatedDate: { type: Date, default: Date.now },
    active: { type: Boolean, default: true }
});
  
export default mongoose.model('DescriptiveForm', DescriptiveFormSchema);