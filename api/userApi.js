module.exports = function(app) {

    const bodyParser = require('body-parser');
    const User = require('../models/userModel');
    const jsonParser = bodyParser.json();
    const bcrypt = require('bcrypt');
    const jwt = require('jsonwebtoken');
    const config = require('../config');
    const responseMessage = require('../common/constants/api-response-messages');

    app.post('/login', jsonParser, (req, res) => {
        User.findOne({ username: req.body.username }, function(err, user) {
            if (err) throw err;
            bcrypt.compare(req.body.password, user.password, function(error, authenticated) {
                if (error) throw error;
                if (authenticated) {
                    const userObj = {
                        username: user.username,
                        userId: user._id,
                        userEmail: user.email
                    }
                    jwt.sign(userObj, config.getJwtPrivateKey(), function(tokenError, token) {
                        if (tokenError) {
                            res.send(responseMessage.USER.TOKEN_CREATE_ERROR);
                            throw tokenError
                        };
                        res.json({ token: token });
                    });
                } else {
                    res.send(responseMessage.USER.WRONG_USERNAME_OR_PASSWORD);
                }
            })
        });
    });

    app.post('/register', jsonParser, function (req, res) {
        let user = User({
            username: req.body.username,
            password: req.body.password,
            email: req.body.email,
            leagues: [],
            avatarUrl: null
        });
        user.save(function(err) {
            if (err) {
                res.send(responseMessage.USER.UNSUCCESSFUL_REGISTRATION);
                throw err;
            };
            res.send(responseMessage.USER.SUCCESSFUL_REGISTRATION);
        });
    });

    app.post('/api/change-pass', jsonParser, function (req, res) {
        User.findOne({ username: req.decoded.username }, function(err, user) {
            if (err) {
                res.send(responseMessage.USER.WRONG_USERNAME_OR_PASSWORD);
                throw err;
            };
            bcrypt.compare(req.body.oldPassword, user.password, function(error, authenticated) {
                if (error) {
                    res.send(responseMessage.USER.AUTHENTICATION_ERROR);
                    throw error;
                };
                if (authenticated) {
                    user.password = req.body.newPassword;
                    user.save();
                    res.send(responseMessage.USER.PASSWORD_CHANGE_SUCCESS);
                } else {
                    res.send(responseMessage.USER.WRONG_USERNAME_OR_PASSWORD);
                }
            })
        });
    });
}
