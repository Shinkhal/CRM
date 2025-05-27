import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  googleId: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  name: String,
  image: String,
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;
