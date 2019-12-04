module.exports = function(app) {

    const bodyParser = require('body-parser');
    const User = require('../models/userModel');
    const jsonParser = bodyParser.json();
    const bcrypt = require('bcrypt');
    const jwt = require('jsonwebtoken');
    const config = require('../config');
    const responseMessage = require('../common/constants/api-response-messages');
    const mailType = require('../common/constants/email-type');
    const sendEmail = require('../modules/emailModule');
    const takenCred = {
        USERNAME: 'USERNAME',
        EMAIL: 'EMAIL',
        NONE: 'NONE'
    }

    /* 
        request: 
        { 
            username: username,
            password: password
        }
    */
    app.post('/login', jsonParser, (req, res) => {
        
        // const userData = { username: 'Sztányi Adrienn', happy: 'Yess, it works :) !!!', email: 'tompa22@gmail.com' }
        const userData = { username: 'Sztányi Adrienn', email: 'tompa22@gmail.com', inviter: 'Tamas Horvath', leagueName: 'leagueNam1', applyLink: '444.hu' }
        // mailService.sendEmail(userData, mailType.LEAGUE_INVITE);
        sendEmail(userData, mailType.REGISTRATION);

        User.findOne({ username: req.body.username }, function(err, user) {
            if (err) {
                res.send(responseMessage.USER.ERROR);
                return;
            };
            if (!user) {
                res.send(responseMessage.USER.WRONG_USERNAME_OR_PASSWORD);
                return;
            }
            bcrypt.compare(req.body.password, user.password, function(error, authenticated) {
                if (error) {
                    res.send(responseMessage.USER.AUTHENTICATION_ERROR);
                    return;
                }
                if (authenticated) {
                    const userObj = {
                        username: user.username,
                        userId: user._id,
                        userEmail: user.email
                    }
                    jwt.sign(userObj, config.getJwtPrivateKey(), function(tokenError, token) {
                        if (tokenError) {
                            res.send(responseMessage.USER.TOKEN_CREATE_ERROR);
                            return;
                        };
                        res.json({ token: token });
                    });
                } else {
                    res.send(responseMessage.USER.WRONG_USERNAME_OR_PASSWORD);
                }
            })
        });
    });

    /* 
        request: 
        { 
            username: username,
            password: password,
            email: email
        }
    */
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
                res.send(checkIfUsernameOrEmailTaken(err.errmsg, user.username, user.email))
                return;
            };
            res.send(responseMessage.USER.SUCCESSFUL_REGISTRATION);
            // mailService.sendRegistrationEmail(user.email);
        });
    });

    function checkIfUsernameOrEmailTaken (errorMessage, username, email) {
        if (errorMessage.includes(username)) {
            return responseMessage.USER.USERNAME_TAKEN;
        } else if (errorMessage.includes(email)) {
            return responseMessage.USER.EMAIL_TAKEN;
        } else {
            return responseMessage.USER.UNSUCCESSFUL_REGISTRATION;
        }
    };

    /* 
        request: 
        { 
            oldPassword: oldPassword,
            newPassword: newPassword
        }
    */
    app.post('/api/change-pass', jsonParser, function (req, res) {
        User.findOne({ username: req.decoded.username }, function(err, user) {
            if (err) {
                res.send(responseMessage.USER.WRONG_USERNAME_OR_PASSWORD);
                return;
            };
            bcrypt.compare(req.body.oldPassword, user.password, function(error, authenticated) {
                if (error) {
                    res.send(responseMessage.USER.AUTHENTICATION_ERROR);
                    return;
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

    /* 
        no data needed, user returned from token data
    */
    app.post('/api/get-user', jsonParser, function (req, res) {
        User.findOne({ username: req.decoded.username }, function (err, user) {
            if (err) { 
                res.send(responseMessage.USER.NOT_FOUND);
                return;
            }
            res.json(user)
        })
    })
}
