const schedule = require('node-schedule');
const LeagueDoc = require('../persistence/league-doc');
const Transaction = require('mongoose-transactions');
const schemas = require('../common/constants/schemas');

module.exports = {
  setBetEndings: setBetEndings
}

async function setBetEndings() {
  const leagues = await LeagueDoc.getAllLeagues();
  const currentYear = new Date().getFullYear()
  const currentSeason = leagues[0].seasons.find(season => season.year === currentYear);
  const startTimes = new Set()
  currentSeason.weeks[currentSeason.weeks.length - 1].games.forEach(game => {
    startTimes.add(new Date(game.startTime).getTime());
  })

  for (let time of startTimes) {
    const date = new Date(time);
    const scheduleTime = `${date.getMinutes()} ${date.getHours()} ${date.getDate()} ${date.getMonth() + 1} *`;
    const closeBets = schedule.scheduleJob(scheduleTime, async function(innerTime) {

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
        console.log('save success')
      } catch (err)  {
        transaction.rollback();
        console.log('some error happened')
        console.log(err);
      };
    }.bind(await LeagueDoc.getAllLeagues())); 
  }
}
