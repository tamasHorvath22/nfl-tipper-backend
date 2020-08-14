const WeekTrackerModel = require('../models/weekTracker');
const regOrPst = require('../common/constants/regular-or-postseason')
const ScheduleService = require('../services/schedule-service');
const logger = require('../services/logger-service');
const WeekTrackerDoc = require('../persistence/week-tracker-doc');
const BackupService = require('../services/backup-service');

module.exports = async function () {
  // logger.log({
  //   level: 'info',
  //   message: 'Hello my pretty new logger!!!!!'
  // })
  
  await WeekTrackerDoc.initWeekTracker();

  // backup test
  // const cucc = await BackupService.getLast();
  // console.log(JSON.parse(cucc.users));
  
  // await BackupService.saveBackup();
}
