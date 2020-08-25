const Transaction = require('mongoose-transactions');
const responseMessage = require('../common/constants/api-response-messages');
const schemas = require('../common/constants/schemas');


module.exports = {
  saveNewLeague: saveNewLeague,
  saveInvitation: saveInvitation,
  acceptInvitation: acceptInvitation,
  saveWeekBets: saveWeekBets,
  modifyLeague: modifyLeague,
  saveClosedWeeks: saveClosedWeeks
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

async function saveClosedWeeks(leagues) {
  const transaction = new Transaction(true);

  leagues.forEach(league => {
    league.markModified('seasons');
    transaction.update(schemas.LEAGUE, league._id, league, { new: true });
  })

  try {
    await transaction.run();
    console.log('weeks close success');
  } catch (err)  {
    transaction.rollback();
    console.error(err);
    console.log('week close fail');
  };
}
