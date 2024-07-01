const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  bpBalance: { type: Number, default: 0 },
});

const User = mongoose.model('User', userSchema);

module.exports = User;
