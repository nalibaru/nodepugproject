import mongoose from 'mongoose';

const timetableSchema = new mongoose.Schema({
    timeTableId: {type: String, required : true,unique : true},
    day: { type: String, required: true },
    subject: { type: String, required: true },
    desc: { type: String },
    createdBy: { type: String },
    scheduledTime: { type: String }, 
    openTime: { type: String },
    closeTime : { type : String},
    createdOn: { type: Date, default: Date.now }, 
    deletedOn: { type: Date }, 
    flag: { type: Boolean, default: false }
});

export default mongoose.model('Timetable', timetableSchema);