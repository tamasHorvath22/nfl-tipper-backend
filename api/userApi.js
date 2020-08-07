const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();
const UserService = require('../services/user-service');

module.exports = function(app) {

  /* 
    request: 
    { 
      username: username,
      password: password
    }
  */
  app.post('/login', jsonParser, async (req, res) => {
    console.log('bejön?');
    console.log(req);
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

  /* 
    request: user object
  */
  app.post('/api/user/change', jsonParser, async function (req, res) {
    res.send(await UserService.changeUserData(req.decoded.userId, req.body.avatarUrl));
  });
}
