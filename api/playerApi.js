module.exports = function(app) {

    const bodyParser = require('body-parser');
    const League = require('../models/leagueModel');
    const Player = require('../models/playerModel');
    const jsonParser = bodyParser.json();
    const responseMessage = require('../common/constants/api-response-messages');

    /* 
        request: 
        { 
            leagueId: leagueId,
            userId: userId 
        }
    */
    app.delete('/api/league/player', jsonParser, function (req, res) {
        League.findById(req.body.leagueId, function (err, league) {
            if (err) throw err;
            if (req.decoded.userId === league.creator) {
                Player.deleteOne({ userId: req.body.userId }, function(deleteError) {
                    if (deleteError) {
                        res.send(responseMessage.PLAYER.DELETE_ERROR);
                        throw deleteError;
                    }
                    res.send(responseMessage.PLAYER.DELETE_SUCCESS);
                });

                for (let i = 0; i < league.players.length; i++) {
                    if (league.players[i].userId === req.body.userId) {
                        league.players.splice(i, 1);
                        break;
                    }
                }
                league.save();
            }
        });
    });

    /* 
        request: 
        { 
            leagueId: leagueId
        }
    */
    app.post('/api/league/player', jsonParser, function (req, res) {
        League.findById(req.body.leagueId, function (err, league) {
            if (err) throw err;
            let player = Player({
                username: req.decoded.username,
                userId: req.decoded.userId,
                leaguePoints: 0,
                leagueId: league._id
            })
            player.save(function(err) {
                if (err) {
                    res.send(responseMessage.PLAYER.CREATE_FAIL);
                    throw err;
                };
                res.send(responseMessage.PLAYER.CREATE_SUCCESS);
            });
            league.players.push(player);
            league.save(function(err) {
                if (err) {
                    res.send(responseMessage.LEAGUE.PLAYER_ADD_FAIL);
                    throw err;
                };
                res.send(responseMessage.LEAGUE.PLAYER_ADD_SUCCESS);
            });   
        });
    });

    // app.put('/api/league', jsonParser, function (req, res) {
    //     League.findById(req.body.leagueId, function (err, league) {
    //         if (err) throw err;
    //         if (req.decoded.userId === league.creator) {
    //             const modifyableKeys = ['name', 'leagueAvatarUrl'];
    //             let hasChanged = false;
    //             Object.keys(req.body.data).forEach(key => {
    //                 if (modifyableKeys.includes(key) && league[key]) {
    //                     league[key] = req.body.data[key];
    //                     hasChanged = true;
    //                 }
    //             });
    //             if (hasChanged) {
    //                 league.__v++;
    //                 league.save();
    //                 res.send(responseMessage.LEAGUE.UPDATE_SUCCESS);
    //             } else {
    //                 res.send(responseMessage.COMMON.NO_CHANGES_MADE);
    //             }
    //         }
    //     });
    // });
}
