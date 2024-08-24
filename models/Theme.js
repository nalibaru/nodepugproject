import mongoose from 'mongoose';

const themeScheme = new mongoose.Schema({
  username: { type: String, required: true,unique: true },
  themeName : { type : String},
  updatedOn: { type: Date }, 
});

export default mongoose.model('Theme', themeScheme);