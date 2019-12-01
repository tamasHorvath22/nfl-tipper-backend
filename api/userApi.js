module.exports = function(app) {

    const bodyParser = require('body-parser');
    const User = require('../models/userModel');
    const jsonParser = bodyParser.json();
    const bcrypt = require('bcrypt');
    const jwt = require('jsonwebtoken');
    const config = require('../config');
    const responseMessage = require('../common/constants/api-response-messages');
    const nodemailer = require("nodemailer");
    const Mailgun = require('mailgun-js');
    const fs = require('fs')
    const emailTemplates = require('../common/constants/email-templates');
    const MailService = require('../services/email.service');
    // const mailService2 = new MailService(new Mailgun({ apiKey: process.env.EMAIL_API_KEY, domain: process.env.EMAIL_DOMAIN }), emailTemplates);
    const mailService = new MailService(nodemailer, fs, emailTemplates);

    /* 
        request: 
        { 
            username: username,
            password: password
        }
    */
    app.post('/login', jsonParser, (req, res) => {
        
        const userData = { username: 'Békési Tivadar', crazy: 'Ezaz, működik bakker!!!', email: 'tompa22@gmail.com' }
        mailService.sendEmail(userData, {});
        
        User.findOne({ username: req.body.username }, function(err, user) {
            if (err) throw err;
            if (!user) {
                res.send(responseMessage.USER.WRONG_USERNAME_OR_PASSWORD);
                return;
            }
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
                res.send(responseMessage.USER.UNSUCCESSFUL_REGISTRATION);
                throw err;
            };
            res.send(responseMessage.USER.SUCCESSFUL_REGISTRATION);
            mailService.sendRegistrationEmail(user.email);
        });
    });

    // function sendEmail (email) {
    //     const mailgun = new Mailgun({ apiKey: process.env.EMAIL_API_KEY, domain: process.env.EMAIL_DOMAIN })
    //     const data = {
    //         from: 'no-reply@fl.tipper.com',
    //         to: email,
    //         subject: 'Welcome to NFL tipper!',
    //         html: 'Na, kinek sikerült megoldania az email küldést? :)'
    //     }

    //     mailgun.messages().send(data, function(err, body) {
    //         if (err) {
    //             console.log("got an error: ", err);
    //         } else {
    //             console.log('body:');
    //             console.log(body);
    //         }
    //     })
    // }

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

    /* 
        request: 
        { 
            username: username,
            email: email
        }
    */
    app.post('/user-check', jsonParser, function (req, res) {
        let occupied = []
        User.findOne( { username: req.body.username }, function (err, user) {
            if (err) { throw err }
            if (user) {
                occupied.push(responseMessage.USER.USERNAME_TAKEN)
            }
            User.findOne( { email: req.body.email }, function (err, user) {
                if (err) { throw err }
                if (user) {
                    occupied.push(responseMessage.USER.EMAIL_TAKEN) 
                }
                res.json({ occupied: occupied })
            })
        })
    })

    /* 
        no data needed, user returned from token data
    */
    app.post('/api/get-user', jsonParser, function (req, res) {
        User.findOne({ username: req.decoded.username }, function (err, user) {
            if (err) { throw err }
            res.json(user)
        })
    })
}
