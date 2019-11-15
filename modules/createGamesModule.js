const axios = require('axios');
const gamesJson = require('../common/template');
const GameModel = require('../models/gameModel');

module.exports = function () {
    gamesJson.week.games.forEach(game => {
        let gameModel = GameModel({
            gameId: game.id,
            homeTeam: game.home.alias,
            awayTeam: game.away.alias,
            homeScore: null,
            awayScore: null,
            season: gamesJson.year,
            weekNo: gamesJson.week.sequence,
            gameStartTime: game.scheduled,
            result: null,
            scores: {
                first: 1
            }
        });
        gameModel.save(function(err) {
            if (err) throw err;
        });
    });

}
