const userDoc = require('../persistence/user-doc');

module.exports = function(app) {

  const bodyParser = require('body-parser');
  const User = require('../models/userModel');
  const jsonParser = bodyParser.json();
  const UserService = require('../services/user-service');

  const userData = { username: 'Sztányi Adrienn', emailAddress: 'tompa22@gmail.com', inviter: 'Tamas Horvath', leagueName: 'leagueNam1', applyLink: '444.hu' }

  /* 
    request: 
    { 
      username: username,
      password: password
    }
  */
  app.post('/login', jsonParser, async (req, res) => {
    res.send(await UserService.login(req.body));
  });

  /* 
    request: 
    { 
      username: username,
      password: password,
      email: email
    }
  */
  app.post('/register', jsonParser, async function (req, res) {
    res.send(await UserService.register(req.body));
  });

  /* 
    request: 
    { 
      email: email
    }
  */
  app.post('/reset-password', jsonParser, async function (req, res) {
    res.send(await UserService.resetPassword(req.body.email));
  });

  /* 
    request: 
    { 
      hash: hash
      password: password
    }
  */
  app.post('/new-password', jsonParser, async function (req, res) {
    res.send(await UserService.newPassword(req.body));
  });

  /* 
    request: 
    { 
      hash: hash
    }
  */
  app.post('/check-pass-token', jsonParser, async function (req, res) {
    res.send(await UserService.checkPassToken(req.body.hash));
  });

  app.get('/confirm-email/:hash', async function (req, res) {
    res.send(await UserService.confirmEmail(req.params.hash));
  });

  /* 
      request: 
      { 
          oldPassword: oldPassword,
          newPassword: newPassword
      }
  */
  app.post('/api/change-pass', jsonParser, async function (req, res) {
    res.send(await UserService.changePassword(req.decoded.username, req.body));
  });

  /* 
      no data needed, user returned from token data
  */
  app.post('/api/get-user', jsonParser, async function (req, res) {
    res.send(await UserService.getUser(req.decoded.username));
  })

  // TODO find out if this endpoint is needed

  // app.post('/api/user/change', jsonParser, function (req, res) {
  //   User.findOne({ username: req.body.username }, function(err, user) {
  //     if (err) {
  //       res.send(responseMessage.USER.ERROR);
  //       return;
  //     };
  //     user.avatarUrl = req.body.avatarUrl;
  //     user.save();
  //     res.json(user);
  //   });
  // });
}
