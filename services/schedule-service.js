const schedule = require('node-schedule');
const LeagueDoc = require('../persistence/league-doc');
const Transaction = require('mongoose-transactions');
const schemas = require('../common/constants/schemas');
const GameService = require('../services/game-service');

module.exports = {
  scheduleAll: scheduleAll
}

let minute = 59

async function scheduleCloseWeek() {
  const scheduleTime = '05 11 * * 2';
  const teatScheduleTime = '23 15 * * 5';
  const tempTrigger = '27 * * * *';

  schedule.scheduleJob(teatScheduleTime, async function() {
    console.log('shedule test!!!!!!')
    console.log('timed function triggered');
    
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
      console.log(err);
      console.log('week close fail');
    };
  }.bind(await LeagueDoc.getAllLeagues()));
}

function scheduleEvaluateGames() {
  schedule.scheduleJob(`${minute++} * * * *`, async function() {
    try {
      await GameService.evaluateWeek();
      console.log('week evaluation success');
    } catch (err) {
      console.log(err);
      console.log('week evaluation fail');
    }
  })
}

function scheduleStepWeek() {
  schedule.scheduleJob(`${minute++} * * * *`, async function() {
    try {
      await GameService.stepWeekTracker();
      console.log('week tracker step success');
    } catch (err) {
      console.log(err);
      console.log('week tracker step fail');
    }
  })
}

function scheduleCreateNewWeek() {
  schedule.scheduleJob(`${minute++} * * * *`, async function() {
    try {
      await GameService.createNewWeekAndGames();
      console.log('new week creation success');
    } catch (err) {
      console.log(err);
      console.log('new week creation fail');
    }
  })
}

async function scheduleAll() {
  await scheduleCloseWeek();
  scheduleEvaluateGames();
  scheduleStepWeek();
  scheduleCreateNewWeek();
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
        console.log(err);
        transaction.rollback();
      };
    }.bind(await LeagueDoc.getAllLeagues())); 
  }
}
