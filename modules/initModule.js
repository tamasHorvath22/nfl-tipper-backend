const WeekTrackerModel = require('../models/weektracker.model');
const regOrPst = require('../common/constants/regular-or-postseason')
const ScheduleService = require('../services/schedule.service');
const logger = require('../services/logger.service');
const WeekTrackerDoc = require('../persistence/weektracker.doc');
const BackupService = require('../services/backup.service');
const { exec } = require("child_process");

module.exports = async function () {
  // logger.log({
  //   level: 'info',
  //   message: 'Hello my pretty new logger!!!!!'
  // })
  
  await WeekTrackerDoc.initWeekTracker();

  // await ScheduleService.createNewWeek();

  // const command = `cd ..; mongodump --forceTableScan --uri mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASS}@cluster0-m8z4s.mongodb.net/${process.env.DB_NAME}`
  // exec(command, (error, stdout, stderr) => {
  //   if (error) {
  //       console.log(`error: ${error.message}`);
  //       return;
  //   }
  //   if (stderr) {
  //       console.log(`stderr: ${stderr}`);
  //       return;
  //   }
  //   console.log(`stdout: ${stdout}`);
  // });
  
  // await BackupService.saveBackup();

  // await BackupService.restore();
}
