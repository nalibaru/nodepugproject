import mongoose from 'mongoose';

const studentMockTestMarksSchema = new mongoose.Schema({
  mocktestMarksId : {type: String, required: true, unique: true},
  mocktestId: { type: String, required: true },
  mocktestAssignId: { type: String, required: true },
  username: { type: String, required: true },
  assignBy: { type: String, required: true },
  assignedOn: { type: Date },
  marks : {type: Number},
  takenOn: { type: Date, default: Date.now },
  lastTakenOn: { type: Date },   
  deletedOn: { type: Date }, 
  flag: { type: Boolean, default: false }, 
  count : {type : Number} 
});

export default mongoose.model('StudentMockTestMarks', studentMockTestMarksSchema);