const League = require('../models/leagueModel');
const mongoose = require('mongoose');
const Transaction = require('mongoose-transactions');
const responseMessage = require('../common/constants/api-response-messages');
const schemas = require('../common/constants/schemas');
const LeagueDoc = require('../persistence/league-doc');


module.exports = {
  connectToDatabase: connectToDatabase,
  saveNewUserToDb: saveNewUserToDb,
  createPasswordReset: createPasswordReset,
  createNewPassword: createNewPassword,
  confirmEmail: confirmEmail,
  changePassword: changePassword,
  changeUserData: changeUserData,
  saveNewLeague: saveNewLeague,
  saveInvitation: saveInvitation,
  acceptInvitation: acceptInvitation,
  saveWeekBets: saveWeekBets,
  modifyLeague: modifyLeague
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

async function changeUserData(user) {
  const transaction = new Transaction(true);
  transaction.insert(schemas.USER, user);

  if (user.leagues.length) {
    let leagueIds = [];
    user.leagues.forEach(league => {
      leagueIds.push(league.leagueId);
    })

    let leagues;
    try {
      leagues = await LeagueDoc.getLeaguesByIds(leagueIds);
      if (!leagues) {
        return responseMessage.LEAGUE.LEAGUES_NOT_FOUND;
      }
    } catch (err) {
      console.error(err);
      return responseMessage.LEAGUE.LEAGUES_NOT_FOUND;
    }
    leagues.forEach(league => {
      league.players.find(player => user._id.equals(player.id)).avatar = user.avatarUrl;
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

async function saveNewLeague(user, league) {
  const transaction = new Transaction(true);
  transaction.insert(schemas.LEAGUE, league);
  transaction.insert(schemas.USER, user);

  try {
    await transaction.run();
    return true;
  } catch (err)  {
    transaction.rollback();
    console.error(err);
    return false;
  };
}

async function saveInvitation(user, league) {
  const transaction = new Transaction(true);
  transaction.insert(schemas.LEAGUE, league);
  transaction.insert(schemas.USER, user);
  try {
    await transaction.run();
    // MailService.send()
    return responseMessage.LEAGUE.INVITATION_SUCCESS;
  } catch (err)  {
    console.error(err);
    transaction.rollback();
    return responseMessage.LEAGUE.INVITATION_FAIL;
  };
}

async function acceptInvitation(user, league) {
  const transaction = new Transaction(true);
  league.markModified('seasons')
  transaction.insert(schemas.LEAGUE, league);
  transaction.insert(schemas.USER, user);

  try {
    await transaction.run();
    return user;
  } catch (err) {
    console.error(err);
    transaction.rollback();
    return responseMessage.LEAGUE.JOIN_FAIL;
  };
}

async function saveWeekBets(league) {
  const transaction = new Transaction(true);
  league.markModified('seasons')
  transaction.insert(schemas.LEAGUE, league);

  try {
    await transaction.run();
    return responseMessage.LEAGUE.BET_SAVE_SUCCESS;
  } catch (err)  {
    console.error(err);
    transaction.rollback();
    return responseMessage.LEAGUE.BET_SAVE_FAIL;
  };
}

async function modifyLeague(league) {
  const transaction = new Transaction(true);
  transaction.insert(schemas.LEAGUE, league);

  try {
    await transaction.run();
    return responseMessage.LEAGUE.UPDATE_SUCCESS;
  } catch (err)  {
    console.error(err);
    await transaction.rollback();
    return responseMessage.LEAGUE.UPDATE_FAIL;
  };
}
