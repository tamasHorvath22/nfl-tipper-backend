const UserDoc = require('../persistence/user.doc');
const LeagueDoc = require('../persistence/league.doc');
const WeekTrackerDoc = require('../persistence/weektracker.doc');
const Backup = require('../models/backup.model');
const ConfirmEmail = require('../models/confirmemail.model');
const forgotPassword = require('../models/forgotpassword.model');
const League = require('../models/league.model');
const WeekTracker = require('../models/weektracker.model');
const Transaction = require('mongoose-transactions');
const schemas = require('../common/constants/schemas');

module.exports = {
  saveBackup: saveBackup,
  restore: restore
}

async function saveBackup() {
  const dataFromDb = {
    confirmEmails: { schema: schemas.CONFIRM_EMAIL, data: null },
    forgotPassword: { schema: schemas.FORGOT_PASSWORD, data: null },
    leagues: { schema: schemas.LEAGUE, data: null },
    weeekTracker: { schema: schemas.WEEK_TRACKER, data: [] }
  }
  try {
    dataFromDb.confirmEmails.data = await UserDoc.getAllConfirmEmail()
    dataFromDb.forgotPassword.data = await UserDoc.getAllForgotPassword()
    dataFromDb.leagues.data = await LeagueDoc.getAllLeagues()
    dataFromDb.weeekTracker.data.push(await WeekTrackerDoc.getTracker())
  } catch(err) {
    console.log('get data from database failed, backup failed!');
    console.error(err);
    return;
  }

  const backup = Backup(dataFromDb);
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

async function restore() {
  let backup;
  try {
    const all = await Backup.find({}).sort({ _id: -1 }).limit(1);
    backup = all[0];
  } catch (err) {
    console.error(err);
    return
  }
  const docs = [
    { key: 'confirmEmails', model: ConfirmEmail, schema: schemas.CONFIRM_EMAIL },
    { key: 'forgotPassword', model: forgotPassword, schema: schemas.FORGOT_PASSWORD },
    { key: 'leagues', model: League, schema: schemas.LEAGUE },
    { key: 'weeekTracker', model: WeekTracker, schema: schemas.WEEK_TRACKER }
  ];

  docs.forEach(doc => {
    doc.model.remove().exec();
  })
  
  const transaction = new Transaction(true);
  
  docs.forEach(doc => {
    backup[doc.key].data.forEach(elem => {
      transaction.insert(doc.schema, elem);
    })
  })

  try {
    await transaction.run();
    console.log('restore done')
  } catch (err)  {
    console.error(err);
    await transaction.rollback();
    console.log('Restore error!')
  };
}
