const UserDoc = require('../persistence/user-doc');
const LeagueDoc = require('../persistence/league-doc');
const WeekTrackerDoc = require('../persistence/week-tracker-doc');
const Backup = require('../models/backupModel');
const Transaction = require('mongoose-transactions');
const schemas = require('../common/constants/schemas');

module.exports = {
  saveBackup: saveBackup,
  getLast: getLast
}

async function saveBackup() {
  const backupStrings = {}
  const dataFromDb = {}
  try {
    dataFromDb.confirmEmails = await UserDoc.getAllConfirmEmail()
    dataFromDb.forgotPassword = await UserDoc.getAllForgotPassword()
    dataFromDb.leagueInvitations = await LeagueDoc.getAllLeagueInvitations()
    dataFromDb.leagues = await LeagueDoc.getAllLeagues()
    dataFromDb.users = await UserDoc.getAllUsers()
    dataFromDb.weeekTracker = await WeekTrackerDoc.getTracker()
  } catch(err) {
    console.log('get data from database failed, backup failed');
    console.error(err);
    return;
  }

  const keys = Object.keys(dataFromDb);
  keys.forEach(key => {
    let tempArray = [];
    console.log(dataFromDb[key])
    for (let i = 0; i < dataFromDb[key].length; i++) {
      tempArray.push(JSON.stringify(dataFromDb[key][i]));
    }
    backupStrings[key] = tempArray;
  })
  backupStrings.week = dataFromDb.weeekTracker;

  const backup = Backup(backupStrings);
  const transaction = new Transaction(true);
  transaction.insert(schemas.BACKUP, backup);

  try {
    await transaction.run();
    console.log('backup save success');
  } catch (err)  {
    console.error(err);
    await transaction.rollback();
    console.log('backup save failed');
  };
}

async function getLast() {
  const all = await Backup.find({});
  return all[all.length - 1];
} 