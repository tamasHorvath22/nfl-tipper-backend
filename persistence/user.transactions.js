const Transaction = require('mongoose-transactions');
const responseMessage = require('../common/constants/api-response-messages');
const schemas = require('../common/constants/schemas');


module.exports = {
  saveNewUserToDb: saveNewUserToDb,
  createPasswordReset: createPasswordReset,
  createNewPassword: createNewPassword,
  confirmEmail: confirmEmail,
  changePassword: changePassword,
  changeUserData: changeUserData
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

async function createNewPassword(user, forgotPassword) {
  const transaction = new Transaction(true);
  transaction.insert(schemas.USER, user);
  transaction.remove(schemas.FORGOT_PASSWORD, forgotPassword._id);

  try {
    await transaction.run();
    return responseMessage.USER.RESET_PASSWORD_SUCCESS;
  } catch (err)  {
    console.error(err);
    transaction.rollback();
    return responseMessage.USER.RESET_PASSWORD_FAIL;
  };
}

async function confirmEmail(user, confirmEmail) {
  const transaction = new Transaction(true);
  transaction.remove(schemas.CONFIRM_EMAIL, confirmEmail._id);
  transaction.insert(schemas.USER, user);

  try {
    await transaction.run();
    return responseMessage.USER.EMAIL_CONFIRMED;
  } catch (err)  {
    console.error(err);
    transaction.rollback();
    return responseMessage.USER.EMAIL_CONFIRM_FAIL;
  };
}

async function changePassword(user) {
  const transaction = new Transaction(true);
  transaction.insert(schemas.USER, user);

  try {
    await transaction.run();
    return true;
  } catch (err)  {
    console.error(err);
    transaction.rollback();
    return false;
  };
}

async function changeUserData(user, leagues) {
  const transaction = new Transaction(true);
  transaction.insert(schemas.USER, user);

  if (leagues && leagues.length) {
    leagues.forEach(league => {
      league.markModified('players');
      transaction.update(schemas.LEAGUE, league._id, league, { new: true });
    })
  }

  try {
    await transaction.run();
    return user;
  } catch (err)  {
    console.error(err);
    transaction.rollback();
    return responseMessage.USER.MODIFY_FAIL;
  };
}
