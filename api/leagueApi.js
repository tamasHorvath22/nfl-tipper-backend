const schemas = require('../common/constants/schemas');
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();
const LeagueService = require('../services/league-service');

module.exports = function(app) {
  
  /* 
    request: 
    { 
      name: name,
      leagueAvatarUrl: leagueAvatarUrl
    }
  */
  app.post('/api/league', jsonParser, async function (req, res) {
    res.send(await LeagueService.createLeague(req.decoded, req.body));
  });

  /* 
    request: 
    { 
      leagueId: leagueId
    }
  */
  app.post('/api/accept-league-invitation', jsonParser, async function (req, res) {
    res.send(await LeagueService.acceptInvitaion(req.decoded.userId, req.body.leagueId));
  });

  /* 
    request: 
    { 
      leagueIds: list of league ids
    }
  */
  app.post('/api/get-leagues', jsonParser, async (req, res) => {
    res.send(await LeagueService.getLeagueNames(req.body.leagueIds));
  });

  /* 
    request: 
    { 
      leagueId: leagueId
    }
  */
  app.post('/api/get-league', jsonParser, async (req, res) => {
    res.send(await LeagueService.getLeague(req.body.leagueId));
  });

  /* 
    request: 
    { 
      leagueId: leagueId,
      invitedEmail: invitedEmail
    }
  */
  app.post('/api/league/invite', jsonParser, async function (req, res) {
    res.send(await LeagueService.sendInvitation(req.decoded.userId, req.body));
  });

  /* 
    request: 
    { 
      leagueId: leagueId
    }
  */
  app.post('/api/league/get-season', jsonParser, async function (req, res) {
    res.send(await LeagueService.getSeasonData(req.decoded.userId, req.body.leagueId));
  });

  /* 
    request: 
    { 
      leagueId: leagueId
      week: week
    }
  */
  app.post('/api/league/save-week-bets', jsonParser, async function (req, res) {
    res.send(await LeagueService.saveWeekBets(req.decoded.userId, req.body.leagueId, req.body.week));
  });

  /* 
    request: 
    { 
      leagueId: leagueId,
      invitedEmail: invitedEmail
    }
  */
  // app.post('/api/league/delete-invite', jsonParser, async function (req, res) {

  //   const league = await League.findById(req.body.leagueId).exec();
  //   const invitedUser = await User.findOne({ email: req.body.invitedEmail }).exec();

  //   if (req.decoded.userId !== league.creator) {
  //     res.send(responseMessage.LEAGUE.NO_INVITATION_RIGHT);
  //   } else {
  //     league.invitations.splice(league.invitations.indexOf(invitedUser._id), 1);
  //     invitedUser.invitations.splice(invitedUser.invitations.indexOf(league._id));
  //     const transaction = new Transaction(true);
  //     transaction.insert(schemas.LEAGUE, league);
  //     transaction.insert(schemas.USER, invitedUser);
  //     try {
  //       await transaction.run();
  //       // sendEmail();
  //       res.send(responseMessage.LEAGUE.INVITATION_DELETE_SUCCESS);
  //     } catch (err)  {
  //       res.send(responseMessage.LEAGUE.INVITATION_DELETE_FAIL);
  //       transaction.rollback();
  //     };
  //   }
  // });
}
