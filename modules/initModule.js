const WeekTrackerModel = require('../models/weekTracker');
const regOrPst = require('../common/constants/regular-or-postseason')
const ScheduleService = require('../services/schedule-service');
const logger = require('../services/logger-service');

module.exports = async function () {
  // logger.log({
  //   level: 'info',
  //   message: 'Hello my pretty new logger!!!!!'
  // })

  await ScheduleService.closeWeek();

  // TODO comment back if goes to live

  // initgame();
  // new deploy

  // TODO set the starting tracker year to current year

  // let weekTracker = WeekTrackerModel({
  //   year: 2019,
  //   week: 1,
  //   regOrPst: regOrPst.REGULAR
  // })
  // weekTracker.save()
}
