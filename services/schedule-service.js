const schedule = require('node-schedule');
const LeagueDoc = require('../persistence/league-doc');
const Transaction = require('mongoose-transactions');
const schemas = require('../common/constants/schemas');
const WeekTrackerDoc = require('../persistence/week-tracker-doc');
const regOrPst = require('../common/constants/regular-or-postseason');
const GameService = require('../services/game-service');

module.exports = {
  setBetEndings: setBetEndings,
  closeWeek: closeWeek
}

async function setBetEndings() {
  const leagues = await LeagueDoc.getAllLeagues();
  // TODO remove previous year (-1)
  const currentYear = new Date().getFullYear() - 1;
  const currentSeason = leagues[0].seasons.find(season => season.year === currentYear);
  const startTimes = new Set()
  currentSeason.weeks[currentSeason.weeks.length - 1].games.forEach(game => {
    startTimes.add(new Date(game.startTime).getTime());
  })

  for (let time of startTimes) {
    const date = new Date(time);
    const scheduleTime = `${date.getMinutes()} ${date.getHours()} ${date.getDate()} ${date.getMonth() + 1} *`;
    schedule.scheduleJob(scheduleTime, async function(innerTime) {

      const transaction = new Transaction(true);

      this.forEach(league => {
        const currentYear = new Date().getFullYear();
        const currentSeason = league.seasons.find(season => season.year === currentYear);
        const currentWeek = currentSeason.weeks[currentSeason.weeks.length - 1];

        for (let i = 0; i < currentWeek.games.length; i++) {
          const game = currentWeek.games[i];
          const currentGameTime = new Date(game.startTime).getTime();
          const calledTime = new Date(innerTime).getTime();

          // const tempTime = new Date('2020-09-13T20:05:00.000+00:00').getTime();

          if (currentGameTime === calledTime) {
            game.isOpen = false;
          }
        }
        
        league.markModified('seasons')
        transaction.update(schemas.LEAGUE, league._id, league, { new: true });
      })

      try {
        await transaction.run();
      } catch (err)  {
        transaction.rollback();
      };
    }.bind(await LeagueDoc.getAllLeagues())); 
  }
}

async function closeWeek() {
  const scheduleTime = '05 11 * * 2';

  const tempTrigger = '24 * * * *';

  schedule.scheduleJob(scheduleTime, async function() {
    const transaction = new Transaction(true);

    this.forEach(league => {
      // TODO remove previous year (-1)
      const currentYear = new Date().getFullYear() - 1;
      const currentSeason = league.seasons.find(season => season.year === currentYear);
      const currentWeek = currentSeason.weeks[currentSeason.weeks.length - 1];
      currentWeek.isOpen = false;

      league.markModified('seasons');
      transaction.update(schemas.LEAGUE, league._id, league, { new: true });
    })

    try {
      await transaction.run();
      await GameService.evaluateWeek();
      await stepWeekTracker();
    } catch (err)  {
      await transaction.rollback();
    };
  }.bind(await LeagueDoc.getAllLeagues()))
}

async function stepWeekTracker() {
  const weekTracker = await WeekTrackerDoc.getTracker();

  if (weekTracker.regOrPst === regOrPst.REGULAR && weekTracker.week === 17) {
    weekTracker.week = 1;
    weekTracker.regOrPst = regOrPst.POSTSEASON;
  } else if (weekTracker.regOrPst === regOrPst.POSTSEASON && weekTracker.week === 4) {
    weekTracker.year++;
    weekTracker.week = 1;
    weekTracker.regOrPst = regOrPst.REGULAR
  } else {
    weekTracker.week++;
  }

  const transaction = new Transaction(true);
  transaction.insert(schemas.WEEK_TRACKER, weekTracker);

  try {
    await transaction.run();
    console.log('week tracker save success')
    await GameService.createNewWeekAndGames();
    // await setBetEndings();
    console.log('week tracker try branch success')
  } catch (err)  {
    await transaction.rollback();
    console.log('week tracker error')
  };
}
