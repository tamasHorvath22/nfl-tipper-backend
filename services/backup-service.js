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
  const backup = Backup({
    confirmEmails: JSON.stringify(await UserDoc.getAllConfirmEmail()),
    forgotPassword: JSON.stringify(await UserDoc.getAllForgotPassword()),
    leagueInvitations: JSON.stringify(await LeagueDoc.getAllLeagueInvitations()),
    leagues: JSON.stringify(await LeagueDoc.getAllLeagues()),
    users: JSON.stringify(await UserDoc.getAllUsers()),
    weeekTracker: JSON.stringify(await WeekTrackerDoc.getTracker())
  })
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