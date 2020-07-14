const schemas = require('../common/constants/schemas');

module.exports = function(app) {

    const bodyParser = require('body-parser');
    const League = require('../models/leagueModel');
    const LeagueInvitation = require('../models/leagueInvitationModel');
    const Player = require('../models/playerModel');
    const Season = require('../models/seasonModel');
    const Week = require('../models/weekModel');
    const jsonParser = bodyParser.json();
    const responseMessage = require('../common/constants/api-response-messages');
    const sendEmail = require('../modules/emailModule');
    const User = require('../models/userModel');
    const mongoose = require('mongoose');
    const Transaction = require('mongoose-transactions');

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

    app.post('/api/league', jsonParser, async function (req, res) {
        const currentYear = new Date().getFullYear();

        let league = League({
            name: req.body.name,
            creator: req.decoded.userId,
            invitations: [],
            players: [req.decoded.userId],
            seasons: [
                Season({
                    year: currentYear,
                    numberOfSeason: currentYear - 1919,
                    numberOfSuperBowl: currentYear - 1965,
                    weeks: [],
                    isOver: false
                })
            ],
            leagueAvatarUrl: req.body.leagueAvatarUrl || null
        });

        const user = await User.findById(req.decoded.userId).exec();
        user.leagues.push(league._id);

        const transaction = new Transaction(true);
        transaction.insert(schemas.LEAGUE, league);
        transaction.insert(schemas.USER, user);

        try {
            await transaction.run();
            res.send(responseMessage.LEAGUE.CREATE_SUCCESS);
        } catch (err)  {
            res.send(responseMessage.LEAGUE.CREATE_FAIL);
            transaction.rollback();
        };
    });

    // /* 
    //     request: 
    //     { 
    //         leagueId: leagueId
    //     }
    // */
    // app.delete('/api/league', jsonParser, function (req, res) {
    //     League.findById(req.body.leagueId, function (err, league) {
    //         if (err) {
    //             res.send(responseMessage.LEAGUE.NOT_FOUND);
    //             return;
    //         }
    //         if (req.decoded.userId === league.creator) {
    //             League.deleteOne({ _id: req.body.leagueId }, function(deleteError) {
    //                 if (deleteError) {
    //                     res.send(responseMessage.LEAGUE.DELETE_ERROR);
    //                     return;
    //                 }
    //                 res.send(responseMessage.LEAGUE.DELETE_SUCCESS);
    //             });
    //         }
    //     });
    // });

    // /* 
    //     request: 
    //     { 
    //         leagueId: leagueId,
    //         data: {}  --> league fields with data
    //     }
    // */
    // app.put('/api/league', jsonParser, function (req, res) {
    //     League.findById(req.body.leagueId, function (err, league) {
    //         if (err) {
    //             res.send(responseMessage.LEAGUE.NOT_FOUND);
    //             return;
    //         }
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
    //                 saveLeague(league, res, responseMessage.LEAGUE.UPDATE_FAIL, responseMessage.LEAGUE.UPDATE_SUCCESS);
    //             } else {
    //                 res.send(responseMessage.COMMON.NO_CHANGES_MADE);
    //             }
    //         } else {
    //             res.send(responseMessage.LEAGUE.NOT_AUTHORIZED);
    //         }
    //     });
    // });

    // /* 
    //     request: 
    //     { 
    //         leagueId: leagueId
    //     }
    // */
    // app.get('/api/league', jsonParser, function (req, res) {
    //     League.findById(req.body.leagueId, function (err, league) {
    //         if (err) {
    //             res.send(responseMessage.LEAGUE.NOT_FOUND);
    //             return;
    //         }
    //         res.json(league);
    //     });
    // });

    /* 
        request: 
        { 
            leagues: list of league ids,
            property: the property to find by
        }
    */
    app.post('/api/get-leagues', jsonParser, (req, res) => {
        let idArray = []
        req.body.leagues.forEach(league => {
            idArray.push(mongoose.Types.ObjectId(league))
        })

        League.find({ [req.body.property]: { $in: idArray } }, (err, leagues) => {
            if (err) {
                res.send(responseMessage.LEAGUE.LEAGUES_NOT_FOUND);
                return;
            }
            res.json(leagues);
        });
    });

    /* 
        request: 
        { 
            leagueId: leagueId,
            invitedEmail: invitedEmail
        }
    */
    app.post('/api/league/invite', jsonParser, async function (req, res) {

        const league = await League.findById(req.body.leagueId).exec();
        const invitedUser = await User.findOne({ email: req.body.invitedEmail }).exec();
        if (!invitedUser) {
            res.send(responseMessage.USER.NO_EMAIL_FOUND);
            return;
        }

        if (req.decoded.userId !== league.creator) {
            res.send(responseMessage.LEAGUE.NO_INVITATION_RIGHT);
        } else {
            league.invitations.push(req.body.invitedEmail);
            invitedUser.invitations.push(league._id);
            const transaction = new Transaction(true);
            transaction.insert(schemas.LEAGUE, league);
            transaction.insert(schemas.USER, invitedUser);
            try {
                await transaction.run();
                // sendEmail();
                res.send(responseMessage.LEAGUE.INVITATION_SUCCESS);
            } catch (err)  {
                res.send(responseMessage.LEAGUE.INVITATION_FAIL);
                transaction.rollback();
            };
        }
    });

     /* 
        request: 
        { 
            leagueId: leagueId,
            invitedEmail: invitedEmail
        }
    */
    app.post('/api/league/delete-invite', jsonParser, async function (req, res) {

        const league = await League.findById(req.body.leagueId).exec();
        const invitedUser = await User.findOne({ email: req.body.invitedEmail }).exec();

        if (req.decoded.userId !== league.creator) {
            res.send(responseMessage.LEAGUE.NO_INVITATION_RIGHT);
        } else {
            league.invitations.splice(league.invitations.indexOf(req.body.invitedEmail), 1);
            invitedUser.invitations.splice(invitedUser.invitations.indexOf(league._id));
            const transaction = new Transaction(true);
            transaction.insert(schemas.LEAGUE, league);
            transaction.insert(schemas.USER, invitedUser);
            try {
                await transaction.run();
                // sendEmail();
                res.send(responseMessage.LEAGUE.INVITATION_DELETE_SUCCESS);
            } catch (err)  {
                res.send(responseMessage.LEAGUE.INVITATION_DELETE_FAIL);
                transaction.rollback();
            };
        }
    });

    // function saveLeague(league, res, errMess, succMess) {
    //     league.save(function(err) {
    //         if (err) {
    //             res.send(errMess);
    //             return;
    //         };
    //         res.send(succMess);
    //     });
    // }
}
