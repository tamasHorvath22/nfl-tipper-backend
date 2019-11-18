const jwt = require('jsonwebtoken');
const userApi = require('./userApi');
const leagueApi = require('./leagueApi');
const playerApi = require('./playerApi');

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
                    throw err;
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
    playerApi(app);
}