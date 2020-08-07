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
  console.log('close week schedule setter called');
  const scheduleTime = '05 11 * * 2';

  let minute = 28;
  const tempTrigger = '27 * * * *';

  schedule.scheduleJob(`${minute++} * * * *`, async function() {
    console.log('timed function triggered');
    console.log(this);

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
      console.log('week close success');
    } catch (err)  {
      await transaction.rollback();
      console.log('week close fail');
      return;
    };
  }.bind(await LeagueDoc.getAllLeagues()))

  schedule.scheduleJob(`${minute++} * * * *`, async function() {
    try {
      await GameService.evaluateWeek();
      console.log('week evaluation success');
    } catch (err) {
      console.log('week evaluation fail');
    }
  })

  schedule.scheduleJob(`${minute++} * * * *`, async function() {
    try {
      await stepWeekTracker();
      console.log('week tracker step success');
    } catch (err) {
      console.log('week tracker step fail');
    }
  })

  schedule.scheduleJob(`${minute++} * * * *`, async function() {
    try {
      await GameService.createNewWeekAndGames();
      console.log('new week creation success');
    } catch (err) {
      console.log('new week creation fail');
    }
  })
}

async function stepWeekTracker() {
  console.log('weektracker called')
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
    // await setBetEndings();
  } catch (err)  {
    await transaction.rollback();
    console.log('week tracker error')
    return;
  };
  // await GameService.createNewWeekAndGames();
}
