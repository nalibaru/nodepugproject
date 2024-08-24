import mongoose from 'mongoose';

const userInfoSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true  },
    address: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    mailId: { type: String, required: true},
    createDate: { type: Date, default: Date.now },
    joinedDate: { type: Date },
    lastDate: { type: Date },
    updatedDate: { type: Date,default: Date.now },
    active: { type: Boolean }, // Whether user can access the account
    resetToken: { type: String },
    profilepic: { type: String }
});

export default mongoose.model('UserInfo', userInfoSchema); 