import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  designation: { type: String, required: true },
  role: { type: String, required: true },
  lastLoggedIn: { type: Date },
  deletedAccount: { type: Boolean, default: false }, //soft delete
  flag: { type: Boolean, default: true } //First-time - true Once user login , set as false
});

export default mongoose.model('User', userSchema);