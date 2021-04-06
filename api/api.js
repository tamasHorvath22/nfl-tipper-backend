const jwt = require('jsonwebtoken');
const userApi = require('./user.api');
const leagueApi = require('./league.api');

const responseMessage = require('../common/constants/api-response-messages');
const config = require('../config');

module.exports = function(app, ProtectedRoutes) {
  app.use('/api', ProtectedRoutes);

  ProtectedRoutes.use((req, res, next) => {
    let token = req.headers['authorization'];
    if (token) {
      if (token.startsWith('Bearer ')) {
        token = token.slice(7);
      }
      jwt.verify(token, config.getJwtPrivateKey(), (err, decoded) => {
        if (err) {
          res.send(responseMessage.USER.TOKEN_ERROR);
          return;
        } else {
          req.decoded = decoded;
          next();
        }
      });
    } else {
      res.send(responseMessage.USER.MISSING_TOKEN);
    }
  });

  userApi(app);
  leagueApi(app);
}
