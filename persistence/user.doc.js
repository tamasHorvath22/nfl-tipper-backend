const User = require('../models/user.model');
const ConfirmEmail = require('../models/confirmemail.model');
const ForgotPassword = require('../models/forgotpassword.model');
const responseMessage = require('../common/constants/api-response-messages');

module.exports = {
  getUserById: getUserById,
  getUserByUsername: getUserByUsername,
  getUserByEmail: getUserByEmail,
  getAllUsers: getAllUsers,
  getAllConfirmEmail: getAllConfirmEmail,
  getAllForgotPassword: getAllForgotPassword,
  getForgotPasswordById: getForgotPasswordById,
  getEmailConfirmById: getEmailConfirmById
}

async function getUserById(id) {
  try {
    return await User.findById(id).exec();
  } catch(err) {
    console.error(err);
    return responseMessage.DATABASE.ERROR;
  }
}

async function getUserByUsername(username) {
  try {
    return await User.findOne({ username: username }).exec();
  } catch(err) {
    console.error(err);
    return responseMessage.DATABASE.ERROR;
  }
}

async function getUserByEmail(email) {
  try {
    return await User.findOne({ email: email }).exec();
  } catch(err) {
    console.error(err);
    return responseMessage.DATABASE.ERROR;
  }
}

async function getAllUsers() {
  try {
    return await User.find({}).exec();
  } catch(err) {
    console.error(err);
    return responseMessage.DATABASE.ERROR;
  }
}

async function getAllConfirmEmail() {
  return await ConfirmEmail.find({}).exec();
}

async function getAllForgotPassword() {
  return await ForgotPassword.find({}).exec();
}

async function getForgotPasswordById(id) {
  try {
    return await ForgotPassword.findById(id).exec();
  } catch(err) {
    console.error(err);
    return responseMessage.DATABASE.ERROR;
  }
}

async function getEmailConfirmById(id) {
  try {
    return await ConfirmEmail.findById(id).exec();
  } catch(err) {
    console.error(err);
    return responseMessage.DATABASE.ERROR;
  }
}
