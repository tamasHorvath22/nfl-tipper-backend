const responseMessage = require('../common/constants/api-response-messages');
const User = require('../models/userModel');

module.exports = {
  getUserById: getUserById,
  getUserByUsername: getUserByUsername,
  getUserByEmail: getUserByEmail
}

async function getUserById(id) {
  return await User.findById(id).exec();
}

async function getUserByUsername(username) {
  return await User.findOne({ username: username }).exec();
}

async function getUserByEmail(email) {
  return await User.findOne({ email: email }).exec();
}
