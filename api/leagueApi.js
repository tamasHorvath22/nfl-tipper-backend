module.exports = function(app) {

    const bodyParser = require('body-parser');
    const League = require('../models/leagueModel');
    const LeagueInvitation = require('../models/leagueInvitation');
    const Player = require('../models/playerModel');
    const jsonParser = bodyParser.json();
    const responseMessage = require('../common/constants/api-response-messages');
    const randomString = require('randomstring');

    // admin token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImFkbWluIiwidXNlcklkIjoiNWRkMjgyMTJmMDQ0MTgyNDIwNzBlYjQxIiwidXNlckVtYWlsIjoiYWRtaW5AYWRtaW4uY29tIiwiaWF0IjoxNTc0MDc2OTU3fQ.yo4tSBeUffGDk3q_xKAFWtHrxrg_HAZBnCmNEdoR-ww
    // admin jelszava

    // player token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InBsYXllciIsInVzZXJJZCI6IjVkZDI4MmZmNmNjNDI5NDMzMDliZDc2NyIsInVzZXJFbWFpbCI6InBsYXllckBwbGF5ZXIuY29tIiwiaWF0IjoxNTc0MDc3MTkxfQ.f_c1HR4Car-mWJxlpETkSdSLHAiL8Cg9311LagHQX-c
    // player jelszava


    /* 
        request: 
        { 
            name: name,
            leagueAvatarUrl: leagueAvatarUrl
        }
    */
    app.post('/api/league', jsonParser, function (req, res) {
        let league = League({
            name: req.body.name,
            creator: req.decoded.userId,
            players: [
                Player({
                    username: req.decoded.username,
                    userId: req.decoded.userId,
                    leaguePoints: 0,
                    leagueId: null
                })
            ],
            leagueAvatarUrl: req.body.leagueAvatarUrl || null
        });

        // set leagueId for creator player
        league.players[0].leagueId = league._id;

        league.save(function(err) {
            if (err) {
                res.send(responseMessage.LEAGUE.CREATE_FAIL);
                throw err;
            };
            res.send(responseMessage.LEAGUE.CREATE_SUCCESS);
        });
    });

    /* 
        request: 
        { 
            leagueId: leagueId
        }
    */
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

    /* 
        request: 
        { 
            leagueId: leagueId,
            data: {}  --> league fields with data
        }
    */
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

    /* 
        request: 
        { 
            leagueId: leagueId
        }
    */
    app.get('/api/league', jsonParser, function (req, res) {
        League.findById(req.body.leagueId, function (err, league) {
            if (err) throw err;
            res.json(league);
        });
    });

    app.post('/api/league-invite', jsonParser, function (req, res) {
        League.findById(req.body.leagueId, function (err, league) {
            if (err) throw err;

            const leagueInvitation = LeagueInvitation({
                leagueId: body.leagueId,
                invitedEmail: body.invitedEmail,
                token: randomString.generate(15)
            })

            // TODO add invitations array to league, and push invites in
        });
    });
}
