const axios = require('axios');
const gamesJson = require('../common/template');
const LeagueDoc = require('../persistence/league-doc');
const GameModel = require('../models/gameModel');
const WeekModel = require('../models/weekModel');
const gameStatus = require('../common/constants/game-status');
const Transaction = require('mongoose-transactions');
const schemas = require('../common/constants/schemas');
const ScheduleService = require('../services/schedule-service');

module.exports = function () {  
  createNewWeekAndGames()
}

const baseApiUrl = 'https://api.sportradar.us/nfl/official/trial/v5/en/games/2020/REG/';
const apiKeyPart = '/schedule.json?api_key='

async function getWeekData() {
  const week = 1;
  const path = `${baseApiUrl}${week}${apiKeyPart}${process.env.SPORTRADAR_KEY}`
  const weekData = await axios.get(path);
  return weekData.data;
}

async function getLeagues() {
  return await LeagueDoc.getAllLeagues();
}

async function createNewWeekAndGames() {
  const leagues = await getLeagues();
  const weekData = await getWeekData();
  const transaction = new Transaction(true);

  leagues.forEach(league => {
    const currentSeason = league.seasons.find(season => season.year === weekData.year);
    if (currentSeason.weeks.find(week => week.weekId === weekData.week.id)) {
      return;
    }
    let week = WeekModel({
      weekId: weekData.week.id,
      number: weekData.week.sequence,
      isOpen: true,
      games: []
    })
    weekData.week.games.forEach(game => {
      let newGame = GameModel({
        gameId: game.id,
        homeTeam: game.home.name,
        homeTeamAlias: game.home.alias,
        awayTeam: game.away.name,
        awayTeamAlias: game.away.alias,
        status: gameStatus.SCHEDULED,
        homeScore: null,
        awayScore: null,
        startTime: game.scheduled,
        isOpen: true,
        winner: null,
        winnerTeamAlias: null,
        bets: []
      })
      league.players.forEach(player => {
        newGame.bets.push({ id: player.id, name: player.name, bet: null })
      })
      week.games.push(newGame);
    })

    currentSeason.weeks.push(week);
    league.markModified('seasons')
    transaction.insert(schemas.LEAGUE, league);
  })

  
  try {
    await transaction.run();
    ScheduleService.setBetEndings();
  } catch (err) {
    transaction.rollback();
    console.log(err);
  }
}
