import mongoose from 'mongoose';

const eventAssignSchema = new mongoose.Schema({
  assignId : {type: String, required: true, unique: true},
  eventId: { type: String, required: true },
  assignTo: { type: String, required: true },
  assignBy: { type: String, required: true },
  assignedOn: { type: Date, default: Date.now }, 
  deletedOn: { type: Date }, 
  flag: { type: Boolean, default: false } 
});

export default mongoose.model('AssignedEvents', eventAssignSchema);