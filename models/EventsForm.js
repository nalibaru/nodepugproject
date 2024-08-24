import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true },
  eventName: { type: String, required: true },
  desc: { type: String },
  createdBy: { type: String },
  updatedBy: { type: String },
  scheduledDateTime : {type: Date},
  scheduledDay: { type: Date }, 
  scheduledTime: { type: String }, 
  createdOn: { type: Date, default: Date.now }, 
  deletedOn: { type: Date }, 
  flag: { type: Boolean, default: false } 
});

export default mongoose.model('Events', eventSchema);