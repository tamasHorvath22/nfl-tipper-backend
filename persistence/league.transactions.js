const Transaction = require('mongoose-transactions');
const schemas = require('../common/constants/schemas');


module.exports = {
  saveClosedWeeks: saveClosedWeeks,
  saveLeagueAndUser: saveLeagueAndUser,
  updateLeagues: updateLeagues
}

async function saveLeagueAndUser(user, league) {
  const transaction = new Transaction(true);
  league.markModified('seasons')
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

async function updateLeagues(leagues) {
  const transaction = new Transaction(true);
  leagues.forEach(league => {
    league.markModified('seasons')
    transaction.insert(schemas.LEAGUE, league);
  })

  try {
    await transaction.run();
    return true;
  } catch (err)  {
    console.error(err);
    transaction.rollback();
    return false;
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
    return true;
  } catch (err)  {
    transaction.rollback();
    console.error(err);
    console.log('week close fail');
    return false;
  };
}
