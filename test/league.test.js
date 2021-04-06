const expect = require('chai').expect;
const LeagueService = require('../services/league.service');
const responseMessage = require('../common/constants/api-response-messages');
const CryptoJS = require('crypto-js');
const mongoose = require('mongoose');
const config = require('../config');
const User = require('../models/user.model');
const League = require('../models/league.model');
const ForgotPassword = require('../models/forgotpassword.model');
const EmailConfirm = require('../models/confirmemail.model');
const jwt = require('jsonwebtoken');


describe('League service tests', () => {
  mongoose.connect(config.getTestDbConnectionString(),{ useUnifiedTopology: true, useNewUrlParser: true });

  describe('create a new league', () => {
    it('create league success => league created, appears in user league list', async () => {
      const users = await User.find({}).exec();
      const last = users[users.length - 1];
      const leagueName = Math.random().toString(36).substring(7);
      const result = await LeagueService.createLeague({ userId: last._id } , { name: leagueName });
      const newLeagueOfUser = result.leagues.find(l => l.name === leagueName);
      const league = await League.findById(newLeagueOfUser.leagueId).exec();
      expect(league.name).to.equal(leagueName);
      expect(newLeagueOfUser.name).to.equal(leagueName);
    });

  });

});
