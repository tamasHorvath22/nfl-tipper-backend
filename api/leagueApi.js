module.exports = function(app) {

    const bodyParser = require('body-parser');
    const League = require('../models/leagueModel');
    const jsonParser = bodyParser.json();
    const responseMessage = require('../common/constants/api-response-messages');

    app.post('/api/league', jsonParser, function (req, res) {
        console.log(req.decoded);
        let league = League({
            name: req.body.name,
            creator: req.decoded.userId,
            players: [req.decoded.userId],
            leagueAvatarUrl: req.body.leagueAvatarUrl || null
        });

        league.save(function(err) {
            if (err) {
                res.send(responseMessage.LEAGUE.CREATE_FAIL);
                throw err;
            };
            res.send(responseMessage.LEAGUE.CREATE_SUCCESS);
        });
    });

    app.delete('/api/league', jsonParser, function (req, res) {
        League.findById(req.body.leagueId, function (err, league) {
            if (err) throw err;
            if (req.decoded.userId === league.creator) {
                League.deleteOne({ _id: req.body.leagueId }, function(deleteError) {
                    if (deleteError) {
                        res.send(responseMessage.LEAGUE.DELETE_ERROR);
                        throw deleteError;
                    }
                    res.send(responseMessage.LEAGUE.DELETE_SUCCESS);
                });
            }
        });
    });

    app.put('/api/league', jsonParser, function (req, res) {
        League.findById(req.body.leagueId, function (err, league) {
            if (err) throw err;
            if (req.decoded.userId === league.creator) {
                const modifyableKeys = ['name', 'leagueAvatarUrl'];
                let hasChanged = false;
                Object.keys(req.body.data).forEach(key => {
                    if (modifyableKeys.includes(key) && league[key]) {
                        league[key] = req.body.data[key];
                        hasChanged = true;
                    }
                });
                if (hasChanged) {
                    league.__v++;
                    league.save();
                    res.send(responseMessage.LEAGUE.UPDATE_SUCCESS);
                } else {
                    res.send(responseMessage.COMMON.NO_CHANGES_MADE);
                }
            }
        });
    });
}
