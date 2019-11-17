const axios = require('axios');
const gamesJson = require('../common/template');
const GameModel = require('../models/gameModel');
const League = require('../models/leagueModel');
const gameStatus = require('../common/constants/game-status');

module.exports = function () {
    gamesJson.week.games.forEach(game => {
        let gameModel = GameModel({
            gameId: game.id,
            homeTeam: game.home.alias,
            awayTeam: game.away.alias,
            status: gameStatus.UPCOMING,
            homeScore: null,
            awayScore: null,
            season: gamesJson.year,
            weekNo: gamesJson.week.sequence,
            gameStartTime: game.scheduled
        });
        gameModel.save(function(err) {
            if (err) throw err;
        });
    });

    // GameModel.deleteMany({}, function() {})

}
