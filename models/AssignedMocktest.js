import mongoose from 'mongoose';

const mtAssignSchema = new mongoose.Schema({
  assignId : {type: String, required: true, unique: true},
  mocktestId: { type: String, required: true },
  assignTo: { type: String, required: true },
  assignBy: { type: String, required: true },
  assignedOn: { type: Date, default: Date.now }, 
  deletedOn: { type: Date }, 
  flag: { type: Boolean, default: false } 
});

export default mongoose.model('AssignedMockTest', mtAssignSchema);