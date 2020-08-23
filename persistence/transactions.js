const League = require('../models/leagueModel');
const mongoose = require('mongoose');
const Transaction = require('mongoose-transactions');
const responseMessage = require('../common/constants/api-response-messages');
const schemas = require('../common/constants/schemas');


module.exports = {
  connectToDatabase: connectToDatabase,
  saveNewUserToDb: saveNewUserToDb,
  createPasswordReset: createPasswordReset
}

function connectToDatabase(connectionString) {
  mongoose.set('useCreateIndex', true);
  mongoose.connect(connectionString, { useUnifiedTopology: true, useNewUrlParser: true });
}

async function saveNewUserToDb(user, emailConfirm) {
  const transaction = new Transaction(true);
  transaction.insert(schemas.USER, user);
  transaction.insert(schemas.CONFIRM_EMAIL, emailConfirm);

  try {
    await transaction.run();
    return responseMessage.USER.SUCCESSFUL_REGISTRATION;
  } catch (err)  {
    transaction.rollback();
    if (err.error.keyPattern.hasOwnProperty('username')) {
      return responseMessage.USER.USERNAME_TAKEN;
    } else if (err.error.keyPattern.hasOwnProperty('email')) {
      return responseMessage.USER.EMAIL_TAKEN;
    } else {
      return responseMessage.USER.UNSUCCESSFUL_REGISTRATION;
    }
  };
}

async function createPasswordReset(forgotPassword) {
  const transaction = new Transaction(true);
  transaction.insert(schemas.FORGOT_PASSWORD, forgotPassword);

  try {
    await transaction.run();
    return true;
  } catch (err)  {
    console.error(err);
    transaction.rollback();
    return false;
  };

}
