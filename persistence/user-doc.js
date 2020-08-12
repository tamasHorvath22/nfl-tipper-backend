const User = require('../models/userModel');
const ConfirmEmail = require('../models/confirmEmailModel');
const ForgotPassword = require('../models/forgotPasswordModel');

module.exports = {
  getUserById: getUserById,
  getUserByUsername: getUserByUsername,
  getUserByEmail: getUserByEmail,
  getAllUsers: getAllUsers,
  getAllConfirmEmail: getAllConfirmEmail,
  getAllForgotPassword: getAllForgotPassword
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

async function getAllUsers() {
  return await User.find({}).exec();
}

async function getAllConfirmEmail() {
  return await ConfirmEmail.find({}).exec();
}

async function getAllForgotPassword() {
  return await ForgotPassword.find({}).exec();
}
