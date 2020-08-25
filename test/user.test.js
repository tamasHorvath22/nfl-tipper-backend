const expect = require('chai').expect;
const UserService = require('../services/user.service');
const responseMessage = require('../common/constants/api-response-messages');
const CryptoJS = require('crypto-js');
const mongoose = require('mongoose');
const config = require('../config');
const User = require('../models/user.model');
const ForgotPassword = require('../models/forgotPasswordModel');
const EmailConfirm = require('../models/confirmEmailModel');
const jwt = require('jsonwebtoken');


describe('User service tests', () => {
  mongoose.connect(config.getTestDbConnectionString(),{ useUnifiedTopology: true, useNewUrlParser: true });

  describe('Registration tests', () => {
    before(async () => {
      await User.remove({});
      const user = User({
        username: 'username',
        password: 'password',
        email: 'test-email@email.com',
        leagues: [],
        invitations: [],
        avatarUrl: null,
        isEmailConfirmed: false,
        isAdmin: false
      })
      const emailConfirm = EmailConfirm({
        email: user.email,
        userId: user._id
      })
      await user.save();
      await emailConfirm.save();
    });

    it('starts with $, returns username taken', async () => {
      const result = await UserService.register({
        username: '$username',
        password: 'password',
        email: 'em@ail.com'
      })
      expect(result).to.equal(responseMessage.USER.USERNAME_TAKEN);
    });

    it('username is taken', async () => {
      const users = await User.find({}).exec();
      const user = users[0];

      const result = await UserService.register({
        username: user.username,
        password: CryptoJS.AES.encrypt('password', process.env.PASSWORD_SECRET_KEY).toString(),
        email: 'em@ail.com'
      })
      expect(result).to.equal(responseMessage.USER.USERNAME_TAKEN);
    });

    it('email is taken', async () => {
      const users = await User.find({}).exec();
      const user = users[0];

      const result = await UserService.register({
        username: Math.random().toString(36).substring(7),
        password: CryptoJS.AES.encrypt('password', process.env.PASSWORD_SECRET_KEY).toString(),
        email: user.email
      })
      expect(result).to.equal(responseMessage.USER.EMAIL_TAKEN);
    });
    
    it('user successfully registered', async () => {
      const username = Math.random().toString(36).substring(7);
      const email = `${Math.random().toString(36).substring(7)}@some-email.com`;

      const result = await UserService.register({
        username: username,
        password: CryptoJS.AES.encrypt('password', process.env.PASSWORD_SECRET_KEY).toString(),
        email: email
      })
      const savedUser = await User.find({ username: username });
      const emailConfirm = await EmailConfirm.find({ email: email});

      expect(result).to.equal(responseMessage.USER.SUCCESSFUL_REGISTRATION);
      expect(emailConfirm.userId).to.equal(savedUser._id);
    });
  });
  
  describe('login tests', () => {
    it('email is not confirmed', async () => {
      const result = await UserService.login(
        {
          username: 'username',
          password: CryptoJS.AES.encrypt('password', process.env.PASSWORD_SECRET_KEY).toString() 
        }
      );
      expect(result).to.equal(responseMessage.USER.EMAIL_NOT_CONFIRMED);
    });

    it('successful login', async () => {
      await User.update({ username: 'username' }, { $set: { isEmailConfirmed: true }});
      const result = await UserService.login(
        {
          username: 'username',
          password: CryptoJS.AES.encrypt('password', process.env.PASSWORD_SECRET_KEY).toString() 
        }
      );
      expect(result.hasOwnProperty('token')).to.be.true;
    });

    it('wrong password', async () => {
      const result = await UserService.login(
        {
          username: 'username',
          password: CryptoJS.AES.encrypt('password_1', process.env.PASSWORD_SECRET_KEY).toString() 
        }
      );
      expect(result).to.equal(responseMessage.USER.WRONG_USERNAME_OR_PASSWORD);
    });

    it('not existing user', async () => {
      const result = await UserService.login(
        {
          username: 'username_1',
          password: CryptoJS.AES.encrypt('password_1', process.env.PASSWORD_SECRET_KEY).toString()
        }
      );
      expect(result).to.equal(responseMessage.USER.WRONG_USERNAME_OR_PASSWORD);
    });
  });

  describe('reset password tests', () => {
    it('no user found by email', async () => {
      const result = await UserService.resetPassword('wrong@email.valami');
      expect(result).to.equal(responseMessage.USER.NOT_FOUND);
    });

    it('email is null', async () => {
      const result = await UserService.resetPassword(null);
      expect(result).to.equal(responseMessage.USER.NOT_FOUND);
    });

    it('password reset mail successfully sent', async () => {
      const users = await User.find({}).exec();
      const user = users[0];
      const result = await UserService.resetPassword(user.email);
      expect(result).to.equal(responseMessage.USER.RESET_PASSWORD_EMAIL_SENT);
    });

    it('no password hash found', async () => {
      const result = await UserService.newPassword({ hash: '5f4272144382585e0a974gx5', password: 'password' });
      expect(result).to.equal(responseMessage.COMMON.ERROR);
    });

    it('password hash is null', async () => {
      const result = await UserService.newPassword({ hash: null, password: 'password' });
      expect(result).to.equal(responseMessage.FORGET_PASSWORD.NO_REQUEST_FOUND);
    });

    it('data object is null', async () => {
      const result = await UserService.newPassword(null);
      expect(result).to.equal(responseMessage.COMMON.ERROR);
    });

    it('password reset success', async () => {
      const forgotPasswords = await ForgotPassword.find({}).exec();
      const last = forgotPasswords[forgotPasswords.length - 1];
      const result = await UserService.newPassword({
        hash: last._id,
        password: CryptoJS.AES.encrypt('new_password', process.env.PASSWORD_SECRET_KEY).toString() 
      });
      expect(result).to.equal(responseMessage.USER.RESET_PASSWORD_SUCCESS);
    });

    it('check password hash -> correct hash', async () => {
      const forgotPasswords = await ForgotPassword.find({}).exec();
      const last = forgotPasswords[forgotPasswords.length - 1];
      const result = await UserService.checkPassToken(last._id);
      expect(result).to.equal(responseMessage.USER.HASH_FOUND);
    });

    it('check password hash -> hash is null', async () => {
      const result = await UserService.checkPassToken(null);
      expect(result).to.equal(responseMessage.USER.NO_HASH_FOUND);
    });

    it('check password hash -> wrong hash id', async () => {
      const users = await User.find({}).exec();
      const last = users[users.length - 1];
      const result = await UserService.checkPassToken(last._id);
      expect(result).to.equal(responseMessage.USER.NO_HASH_FOUND);
    });
  });

  describe('confirm email tests', () => {
    it('hash is null => no hash found', async () => {
      const result = await UserService.confirmEmail(null);
      expect(result).to.equal(responseMessage.USER.NO_EMAIL_HASH_FOUND);
    });

    it('correct hash => email confirmed', async () => {
      const emailConfirms = await EmailConfirm.find({}).exec();
      const last = emailConfirms[emailConfirms.length - 1];
      const result = await UserService.confirmEmail(last._id);
      expect(result).to.equal(responseMessage.USER.EMAIL_CONFIRMED);
    });

    it('incorrect hash => no hash found', async () => {
      const emailConfirms = await EmailConfirm.find({}).exec();
      const last = emailConfirms[emailConfirms.length - 1];
      const result = await UserService.confirmEmail(last._id + 'x');
      expect(result).to.equal(responseMessage.USER.NO_EMAIL_HASH_FOUND);
    });
  });

  describe('change password tests', () => {
    it('not existing username => no user found', async () => {
      const result = await UserService.changePassword(
        'no username',
        { oldPassword: 'nothing', newPassword: 'nothing'}
      );
      expect(result).to.equal(responseMessage.USER.NOT_FOUND);
    });

    it('wrong old password => not authenticated', async () => {
      const result = await UserService.changePassword(
        'username',
        { 
          oldPassword: CryptoJS.AES.encrypt('wrong_password', process.env.PASSWORD_SECRET_KEY).toString(),
          newPassword: 'nothing'
        }
      );
      expect(result).to.equal(responseMessage.USER.WRONG_USERNAME_OR_PASSWORD);
    });

    it('correct old password => success password change', async () => {
      const result = await UserService.changePassword(
        'username',
        {
          oldPassword: CryptoJS.AES.encrypt('new_password', process.env.PASSWORD_SECRET_KEY).toString(),
          newPassword: CryptoJS.AES.encrypt('more_new_password', process.env.PASSWORD_SECRET_KEY).toString()
        }
      );
      console.log(result);
      expect(result.hasOwnProperty('token')).to.equal(true);
    });

  });
});
