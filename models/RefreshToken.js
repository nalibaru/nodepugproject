import mongoose from 'mongoose';

const RefreshTokenSchema = new mongoose.Schema({
    refreshToken: { type: String, required: true, unique: true },
    accessToken: { type: String },
    accessTokenExpiry : { type: Date},
    createDate: { type: Date, default: Date.now },
    active: { type: Boolean, default: true }
});
  
export default mongoose.model('RefreshToken', RefreshTokenSchema);