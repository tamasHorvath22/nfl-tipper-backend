const Transaction = require('mongoose-transactions');
const schemas = require('../common/constants/schemas');


module.exports = {
  saveNewSeasonAndWeektracker: saveNewSeasonAndWeektracker,
  saveSeasonModifications: saveSeasonModifications,
  saveWeekTrackerModifications: saveWeekTrackerModifications
}

async function saveNewSeasonAndWeektracker(leagues, weektracker) {
  const transaction = new Transaction(true);
  transaction.insert(schemas.WEEK_TRACKER, weektracker);
  
  leagues.forEach(league => {
    league.markModified('seasons');
    transaction.insert(schemas.LEAGUE, league);
  })

  try {
    await transaction.run();
    return true
  } catch (err) {
    console.error(err);
    transaction.rollback();
    return false;
  }
}

async function saveSeasonModifications(leagues) {
  const transaction = new Transaction(true);

  leagues.forEach(league => {
    league.markModified('seasons');
    transaction.insert(schemas.LEAGUE, league);
  })

  try {
    await transaction.run();
    return true;
  } catch (err) {
    console.error(err);
    transaction.rollback();
    return false;
  }
}

async function saveWeekTrackerModifications(weekTracker) {
  const transaction = new Transaction(true);
  transaction.insert(schemas.WEEK_TRACKER, weekTracker);

  try {
    await transaction.run();
    return true;
  } catch (err)  {
    console.error(err);
    transaction.rollback();
    return false;
  };
}
