module.exports = function(app) {

    const bodyParser = require('body-parser');
    const Bet = require('../models/betModel');
    const jsonParser = bodyParser.json();
    const responseMessage = require('../common/constants/api-response-messages');

    /* 
        request: 
        { 
            gameId: gameId,
            LeagueId: LeagueId,
            teamToWin: teamToWin
        }
    */
    app.post('/api/bet', jsonParser, function (req, res) {
        let bet = Bet({
            gameId: req.body.gameId,
            userId: req.decoded.userId,
            LeagueId: req.body.LeagueId,
            teamToWin: req.body.teamToWin
        });

        bet.save(function(err) {
            if (err) {
                res.send(responseMessage.BET.CREATE_FAIL);
                throw err;
            };
            res.send(responseMessage.BET.CREATE_SUCCESS);
        });
    });

    /* 
        request: 
        { 
            betId: betId,
            teamToWin: teamToWin
        }
    */
    app.put('/api/bet', jsonParser, function (req, res) {
        Bet.findById(req.body.leagueId, function (err, bet) {
            if (err) throw err;
            if (req.decoded.userId === bet.userId) {
                bet.teamToWin = req.body.teamToWin;
                league.__v++;
                league.save();
                res.send(responseMessage.LEAGUE.UPDATE_SUCCESS);
            }
        });
    });

    /* 
        request: 
        { 
            add all neccessary data for find bets
        }
    */
    app.get('/api/bet', jsonParser, function (req, res) {
        League.find(req.body, function (err, league) {
            if (err) throw err;
            res.json(league);
        });
    });
}
