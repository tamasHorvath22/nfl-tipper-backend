module.exports = function(app) {

    const bodyParser = require('body-parser');
    const League = require('../models/leagueModel');
    const LeagueInvitation = require('../models/leagueInvitationModel');
    const Player = require('../models/playerModel');
    const jsonParser = bodyParser.json();
    const responseMessage = require('../common/constants/api-response-messages');
    const sendEmail = require('../modules/emailModule');
    const User = require('../models/userModel');

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
            invitations: [],
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
        saveLeague(league, res, responseMessage.LEAGUE.CREATE_FAIL, responseMessage.LEAGUE.CREATE_SUCCESS);

        User.findById(req.decoded.userId, function(err, user) {
            if (err) {
                // TODO
            }
            if (user) {
                user.leagues.push(league._id);
                user.save(function(err) {
                    if (err) {
                        // TODO
                    }
                })
            }
        })
    });

    /* 
        request: 
        { 
            leagueId: leagueId
        }
    */
    app.delete('/api/league', jsonParser, function (req, res) {
        League.findById(req.body.leagueId, function (err, league) {
            if (err) {
                res.send(responseMessage.LEAGUE.NOT_FOUND);
                return;
            }
            if (req.decoded.userId === league.creator) {
                League.deleteOne({ _id: req.body.leagueId }, function(deleteError) {
                    if (deleteError) {
                        res.send(responseMessage.LEAGUE.DELETE_ERROR);
                        return;
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
            if (err) {
                res.send(responseMessage.LEAGUE.NOT_FOUND);
                return;
            }
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
                    saveLeague(league, res, responseMessage.LEAGUE.UPDATE_FAIL, responseMessage.LEAGUE.UPDATE_SUCCESS);
                } else {
                    res.send(responseMessage.COMMON.NO_CHANGES_MADE);
                }
            } else {
                res.send(responseMessage.LEAGUE.NOT_AUTHORIZED);
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
            if (err) {
                res.send(responseMessage.LEAGUE.NOT_FOUND);
                return;
            }
            res.json(league);
        });
    });

    /* 
        request: 
        { 
            leagueId: leagueId,
            invitedEmail: invitedEmail
        }
    */
    app.post('/api/league/invite', jsonParser, function (req, res) {
        League.findById(req.body.leagueId, function (err, league) {
            if (err) {
                res.send(responseMessage.LEAGUE.NOT_FOUND);
                return;
            }
            if (req.decoded.userId === league.creator) {
                const leagueInvitation = LeagueInvitation({
                    leagueId: req.body.leagueId,
                    invitorId: req.decoded.userId,
                    invitedEmail: req.body.invitedEmail
                })
                User.findOne( { email: req.body.invitedEmail }, function(err, user) {
                    if (err) {
                        // TODO log
                    }
                    if (user) {
                        user.invitations.push(leagueInvitation)
                        user.save(function(err) {
                            if (err) {
                                // TODO log
                                return;
                            };
                            // TODO log
                        })
                    } else {
                        leagueInvitation.save(function(err) {
                            if (err) {
                                // TODO log
                                return;
                            };
                            // TODO log
                        })
                    }
                })
    
                // saveLeague(league, res, responseMessage.LEAGUE.INVITATION_FAIL, responseMessage.LEAGUE.INVITATION_SUCCESS);

                // sendEmail();
            } else {
                res.send(responseMessage.LEAGUE.NOT_AUTHORIZED);
            }
        });
    });

    /* 
        request: 
        { 
            leagueId: leagueId,
            invitationId: invitationId
        }
    */
    app.put('/api/league/invite', jsonParser, function (req, res) {
        League.findById(req.body.leagueId, function (err, league) {
            if (err) {
                res.send(responseMessage.LEAGUE.NOT_FOUND);
                return;
            }
            league.players.push(
                Player({
                    username: req.decoded.username,
                    userId: req.decoded.userId,
                    leaguePoints: 0,
                    leagueId: req.body.leagueId
                })
            )
            league.save(function(err) {
                if (err) {
                    // TODO
                }
            })

            User.findById(req.decoded.userId, function(err, user) {
                if (err) {
                    // TODO
                }
                if (user) {
                    user.leagues.push(league._id);
                    user.save(function(err) {
                        if (err) {
                            // TODO
                        }
                    })
                }
            })
            deleteInvitation(req.body.invitationId, req.decoded.userId);
        });
    });

    function deleteInvitation(invitationId, userId) {
        LeagueInvitation.deleteOne({ _id: req.body.invitationId }, function(err) {
            if (err) {
                res.send(responseMessage.LEAGUE.DELETE_ERROR);
                return;
            }
            res.send(responseMessage.LEAGUE.DELETE_SUCCESS);
        });


        LeagueInvitation.findById(invitationId, function(err, invitation) {
            if (err) {
                // res.send(errMess);
                return;
            }
            if (!invitation) {
                User.findById(userId, function(err, user) {
                    if (err) {
                        // res.send(errMess);
                        return;
                    }
                    for (let i = 0; i < user.invitations.length; i++) {
                        if (user.invitations[i]._id === invitationId) {
                            user.invitations.splice(i, 1);
                            break;
                        }
                    }
                    user.save(function(err) {
                        if (err) {
                            // TODO
                        }
                    })
                })
            } else {

            }
        })
    }

    function saveLeague(league, res, errMess, succMess) {
        league.save(function(err) {
            if (err) {
                res.send(errMess);
                return;
            };
            res.send(succMess);
        });
    }
}
