module.exports = function(app) {

    const bodyParser = require('body-parser');
    const User = require('../models/userModel');
    const EmailConfirm = require('../models/confirmEmailModel');
    const jsonParser = bodyParser.json();
    const bcrypt = require('bcrypt');
    const jwt = require('jsonwebtoken');
    const config = require('../config');
    const responseMessage = require('../common/constants/api-response-messages');
    const mailType = require('../common/constants/email-type');
    const schemas = require('../common/constants/schemas');
    const sendEmail = require('../modules/emailModule');
    const Transaction = require('mongoose-transactions');

    const userData = { username: 'Sztányi Adrienn', emailAddress: 'tompa22@gmail.com', inviter: 'Tamas Horvath', leagueName: 'leagueNam1', applyLink: '444.hu' }

    /* 
        request: 
        { 
            username: username,
            password: password
        }
    */
    app.post('/login', jsonParser, (req, res) => {
        
      // sendEmail(userData, mailType.REGISTRATION); // EZ A JÓ EMAIL KÜLDŐ!!!!!!!!

      User.findOne({ username: req.body.username }, function(err, user) {
        if (err) {
          res.send(responseMessage.USER.ERROR);
          return;
        };
        if (!user) {
          res.send(responseMessage.USER.WRONG_USERNAME_OR_PASSWORD);
          return;
        }
        if (!user.isEmailConfirmed) {
          res.send(responseMessage.USER.EMAIL_NOT_CONFIRMED);
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
    app.post('/register', jsonParser, async function (req, res) {
      const user = User({
        username: req.body.username,
        password: req.body.password,
        email: req.body.email,
        leagues: [],
        avatarUrl: null
      });

      const emailConfirm = EmailConfirm({
        email: req.body.email,
        userId: user._id
      })
      const transaction = new Transaction(true);
      transaction.insert(schemas.CONFIRM_EMAIL, emailConfirm);
      transaction.insert(schemas.USER, user);

      try {
        await transaction.run();
        const userEmilData = {
          email: user.emailAddress,
          username: user.username,
          url: `${process.env.UI_BASE_URL}${process.env.CONFIRM_EMAIL_URL}/${emailConfirm._id}`
        }

        // sendEmail(userEmilData, mailType.EMAIL_CONFIRM); // EZ A JÓ EMAIL KÜLDŐ!!!!!!!!

        res.send(responseMessage.USER.SUCCESSFUL_REGISTRATION);
      } catch (err)  {
        transaction.rollback();
        let source;
        if (err.error.keyPattern.hasOwnProperty('username')) {
          source = responseMessage.USER.USERNAME_TAKEN;
        } else if (err.error.keyPattern.hasOwnProperty('email')) {
          source = responseMessage.USER.EMAIL_TAKEN;
        } else {
          source = responseMessage.USER.UNSUCCESSFUL_REGISTRATION;
        }
        res.send(source);
      };
    });

    app.get('/confirm-email/:hash', async function (req, res) {
      let confirmModel = null
      try {
        confirmModel = await EmailConfirm.findById(req.params.hash).exec();
      } catch (err) {
        res.send(responseMessage.USER.NO_EMAIL_HASH_FOUND);
        return;
      }

      let user = null
      try {
        user = await User.findById(confirmModel.userId).exec();
        user.isEmailConfirmed = true
      } catch (err) {
        res.send(responseMessage.USER.NOT_FOUND);
        return;
      }
      
      const transaction = new Transaction(true);
      transaction.remove(schemas.CONFIRM_EMAIL, confirmModel)
      transaction.insert(schemas.USER, user);

      try {
        await transaction.run();
        res.send(responseMessage.USER.EMAIL_CONFIRMED);
      } catch (err)  {
        res.send(responseMessage.USER.EMAIL_CONFIRM_FAIL);
        transaction.rollback();
      };
    });

    app.post('/api/user/change', jsonParser, function (req, res) {
      User.findOne({ username: req.body.username }, function(err, user) {
        if (err) {
          res.send(responseMessage.USER.ERROR);
          return;
        };
        user.avatarUrl = req.body.avatarUrl;
        user.save();
        res.json(user);
      });
    });

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
            console.log(error)
            res.send(responseMessage.USER.AUTHENTICATION_ERROR);
            return;
          };
          if (authenticated) {
            user.password = req.body.newPassword;
            user.save();
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
            // res.send(responseMessage.USER.PASSWORD_CHANGE_SUCCESS);
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
