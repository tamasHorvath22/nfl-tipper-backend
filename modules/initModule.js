const WeekTrackerModel = require('../models/weekTracker');
const regOrPst = require('../common/constants/regular-or-postseason')
const ScheduleService = require('../services/schedule-service');
const logger = require('../services/logger-service');
const WeekTrackerDoc = require('../persistence/week-tracker-doc');

module.exports = async function () {
  // logger.log({
  //   level: 'info',
  //   message: 'Hello my pretty new logger!!!!!'
  // })
  
  await WeekTrackerDoc.initWeekTracker()

  // TODO comment back if goes to live
  ScheduleService.scheduleAll();

}
