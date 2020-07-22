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
    let user;
    try {
      user = await User.findById(req.decoded.userId).exec();
      if (!user) {
        res.send(responseMessage.USER.NOT_FOUND);
        return;
      }
    } catch (err) {
      res.send(responseMessage.USER.NOT_FOUND);
      return;
    }

    let league = League({
      name: req.body.name,
      creator: req.decoded.userId,
      invitations: [],
      players: [{ id: user._id, name: req.decoded.username }],
      seasons: [
        Season({
          year: currentYear,
          numberOfSeason: currentYear - 1919,
          numberOfSuperBowl: currentYear - 1965,
          weeks: [],
          standings: [{ id: user._id, name: req.decoded.username, score: 0 }],
          isOver: false,
          isCurrent: true
        })
      ],
      leagueAvatarUrl: req.body.leagueAvatarUrl || null
    });

    user.leagues.push({ leagueId: league._id, name: league.name });

    const transaction = new Transaction(true);
    transaction.insert(schemas.LEAGUE, league);
    transaction.insert(schemas.USER, user);

    try {
      await transaction.run();
      res.json(user)
    } catch (err)  {
      transaction.rollback();
      res.send(responseMessage.LEAGUE.CREATE_FAIL);
    };
  });

  /* 
    request: 
    { 
      leagueId: leagueId
    }
  */
  app.post('/api/accept-league-invitation', jsonParser, async function (req, res) {
    let league;
    let user;
    try {
      league = await League.findById(req.body.leagueId).exec();
      if (!league) {
        res.send(responseMessage.LEAGUE.LEAGUES_NOT_FOUND);
        return;
      }
    } catch (err) {
      res.send(responseMessage.LEAGUE.LEAGUES_NOT_FOUND);
      return;
    }

    try {
      user = await User.findById(req.decoded.userId).exec();
      if (!user) {
        res.send(responseMessage.USER.NOT_FOUND);
        return;
      }
    } catch (err) {
      res.send(responseMessage.USER.NOT_FOUND);
      return;
    }

    if (!league.invitations.includes(user._id)) {
      res.send(responseMessage.LEAGUE.USER_NOT_INVITED);
      return;
    }
    user.invitations.splice(user.invitations.indexOf(league._id), 1);
    user.leagues.push({ leagueId: league._id, name: league.name });
    league.invitations.splice(league.invitations.indexOf(user._id));
    league.players.push({ id: user._id, name: user.username }); 
    league.seasons.find(season => season.isCurrent).standings.push({ id: user._id.toString(), name: user.username, score: 0 })
    
    const transaction = new Transaction(true);
    league.markModified('seasons')
    transaction.insert(schemas.LEAGUE, league);
    transaction.insert(schemas.USER, user);

    try {
      await transaction.run();
      res.json(user)
      // res.send(responseMessage.LEAGUE.JOIN_SUCCESS);
    } catch (err)  {
      res.send(responseMessage.LEAGUE.JOIN_FAIL);
      transaction.rollback();
    };
  });

  /* 
    request: 
    { 
      leagueIds: list of league ids
    }
  */
  app.post('/api/get-leagues', jsonParser, (req, res) => {
    let idArray = []
    req.body.leagueIds.forEach(league => {
      idArray.push(mongoose.Types.ObjectId(league))
    })

    League.find({ _id: { $in: idArray } }, (err, leagues) => {
      if (err) {
        res.send(responseMessage.LEAGUE.LEAGUES_NOT_FOUND);
        return;
      }
      const leagueNames = []
      leagues.forEach(league => {
        leagueNames.push({ _id: league._id, name: league.name })
      })
      res.json(leagueNames);
    });
  });

  /* 
    request: 
    { 
      leagueId: leagueId
    }
  */
  app.post('/api/get-league', jsonParser, async (req, res) => {
    let league;
    try {
      league = await League.findById(req.body.leagueId).exec();
    } catch (err) {
      res.send(responseMessage.LEAGUE.NOT_FOUND);
      return;
    }
    if (!league) {
      res.send(responseMessage.LEAGUE.NOT_FOUND);
    } else {
      res.json(league);
    }
  });

  /* 
    request: 
    { 
      leagueId: leagueId,
      invitedEmail: invitedEmail
    }
  */
  app.post('/api/league/invite', jsonParser, async function (req, res) {
    let league;
    let invitedUser;
    try {
      league = await League.findById(req.body.leagueId).exec();
      if (!league) {
        res.send(responseMessage.LEAGUE.LEAGUES_NOT_FOUND);
        return;
      }
    } catch (err) {
      res.send(responseMessage.COMMON.ERROR);
      return;
    }

    try {
      invitedUser = await User.findOne({ email: req.body.invitedEmail }).exec();
      if (!invitedUser) {
        res.send(responseMessage.USER.NO_EMAIL_FOUND);
        return;
      }
    } catch (err) {
      res.send(responseMessage.COMMON.ERROR);
      return;
    }

    if (league.players.find(user => user.id === invitedUser._id)) {
      res.send(responseMessage.LEAGUE.USER_ALREADY_IN_LEAGUE);
      return;
    }
    
    if (league.invitations.includes(invitedUser._id) || invitedUser.invitations.includes(league._id)) {
      res.send(responseMessage.LEAGUE.USER_ALREADY_INVITED);
      return;
    }

    if (req.decoded.userId !== league.creator) {
      res.send(responseMessage.LEAGUE.NO_INVITATION_RIGHT);
    } else {
      league.invitations.push(invitedUser._id);
      invitedUser.invitations.push({ leagueId: league._id, name: league.name });
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
      league.invitations.splice(league.invitations.indexOf(invitedUser._id), 1);
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
}
