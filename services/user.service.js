const User = require('../models/user.model');
const EmailConfirm = require('../models/confirmemail.model');
const ForgotPassword = require('../models/forgotpassword.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config');
const responseMessage = require('../common/constants/api-response-messages');
const mailType = require('../common/constants/email-type');
const MailService = require('./mail.service');
const UserDoc = require('../persistence/user.doc');
const CryptoJS = require('crypto-js');
const DbTransactions = require('../persistence/user.transactions');
const LeagueDoc = require('../persistence/league.doc');

module.exports = {
  login: login,
  register: register,
  resetPassword: resetPassword,
  newPassword: newPassword,
  checkPassToken: checkPassToken,
  confirmEmail: confirmEmail,
  changePassword :changePassword,
  getUser: getUser,
  changeUserData: changeUserData
}

async function login(userDto) {
  const user = await UserDoc.getUserByUsername(userDto.username);
  if (!user) {
    return responseMessage.USER.WRONG_USERNAME_OR_PASSWORD;
  }
  if (user === responseMessage.DATABASE.ERROR) {
    return responseMessage.USER.ERROR;
  }

  if (!user.isEmailConfirmed) {
    return responseMessage.USER.EMAIL_NOT_CONFIRMED;
  }
  let authenticated;
  try {
    authenticated = await bcrypt.compare(decryptPassword(userDto.password), user.password);
  } catch (err) {
    console.error(err);
    return responseMessage.USER.AUTHENTICATION_ERROR;
  }
  if (authenticated) {
    try {
      return { token: jwt.sign(getUserToToken(user), config.getJwtPrivateKey()) };
    } catch (err) {
      console.error(err);
      return responseMessage.USER.TOKEN_CREATE_ERROR;
    }
  } else {
    return responseMessage.USER.WRONG_USERNAME_OR_PASSWORD;
  }
}

function decryptPassword(hash) {
  const bytes = CryptoJS.AES.decrypt(hash, process.env.PASSWORD_SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

async function register(userDto) {
  if (userDto.username[0] === '$') {
    return responseMessage.USER.USERNAME_STARTS_WITH_$;
  }
  const user = User({
    username: userDto.username,
    password: decryptPassword(userDto.password),
    email: userDto.email,
    leagues: [],
    invitations: [],
    avatarUrl: null,
    isEmailConfirmed: false,
    isAdmin: false
  });
  const emailConfirm = EmailConfirm({
    email: userDto.email,
    userId: user._id
  })
  const dbResponse = await DbTransactions.saveNewUserToDb(user, emailConfirm);
  if (dbResponse !== responseMessage.USER.SUCCESSFUL_REGISTRATION) {
    return dbResponse;
  }
  const userEmailData = {
    $emailAddress: user.email,
    $username: user.username,
    $url: `${process.env.UI_BASE_URL}${process.env.CONFIRM_EMAIL_URL}/${emailConfirm._id}`
  }
  await MailService.send(userEmailData, mailType.EMAIL_CONFIRM);
  return responseMessage.USER.SUCCESSFUL_REGISTRATION;
}

async function resetPassword(email) {
  const user = await UserDoc.getUserByEmail(email);
  if (!user) {
    return responseMessage.USER.NOT_FOUND;
  }
  if (user === responseMessage.DATABASE.ERROR) {
    return responseMessage.DATABASE.ERROR;
  }
  const forgotPassword = ForgotPassword({
    email: email
  })
  const isResetPasswordSuccess = await DbTransactions.createPasswordReset(forgotPassword);
  if (isResetPasswordSuccess) {
    const userEmailData = {
      $emailAddress: email,
      $username: user.username,
      $url: `${process.env.UI_BASE_URL}${process.env.RESET_PASSWORD_URL}/${forgotPassword._id}`
    }
    await MailService.send(userEmailData, mailType.FORGOT_PASSWORD);
    return responseMessage.USER.RESET_PASSWORD_EMAIL_SENT;
  } else {
    return responseMessage.USER.RESET_PASSWORD_EMAIL_FAIL;
  }
}

async function newPassword(data) {
  if (!data) {
    return responseMessage.COMMON.ERROR;
  }
  const forgotPassword = await UserDoc.getForgotPasswordById(data.hash);
  if (!forgotPassword || forgotPassword === responseMessage.DATABASE.ERROR) {
    return responseMessage.DATABASE.ERROR
  }
  const user = await UserDoc.getUserByEmail(forgotPassword.email);
  if (!user) {
    return responseMessage.USER.NOT_FOUND;
  }
  if (user === responseMessage.DATABASE.ERROR) {
    return responseMessage.USER.NOT_FOUND;
  }

  user.password = decryptPassword(data.password);
  return await DbTransactions.createNewPassword(user, forgotPassword);
}

async function checkPassToken(hash) {
  const forgotPassword = await UserDoc.getForgotPasswordById(hash);
  if (!forgotPassword || forgotPassword === responseMessage.DATABASE.ERROR) {
    return responseMessage.USER.NO_HASH_FOUND;
  }
  return responseMessage.USER.HASH_FOUND;
}

async function confirmEmail(hash) {
  const emailConfirm = await UserDoc.getEmailConfirmById(hash);
  if (!emailConfirm || emailConfirm === responseMessage.DATABASE.ERROR) {
    return responseMessage.USER.NO_EMAIL_HASH_FOUND;
  }
  const user = await UserDoc.getUserById(emailConfirm.userId);
  if (!user) {
    return responseMessage.USER.NOT_FOUND;
  }
  if (user === responseMessage.DATABASE.ERROR) {
    return responseMessage.USER.NOT_FOUND;
  }
  user.isEmailConfirmed = true;
  return DbTransactions.confirmEmail(user, emailConfirm);
}

async function changePassword(username, passwords) {
  const user = await UserDoc.getUserByUsername(username);
  if (!user) {
    return responseMessage.USER.NOT_FOUND;
  }
  if (user === responseMessage.DATABASE.ERROR) {
    return responseMessage.DATABASE.ERROR;
  }
  let authenticated;
  try {
    authenticated = await bcrypt.compare(
      decryptPassword(passwords.oldPassword),
      user.password
    );
  } catch (err) {
    console.error(err);
    return responseMessage.USER.AUTHENTICATION_ERROR;
  }
  if (authenticated) {
    user.password = decryptPassword(passwords.newPassword)
    const userSaveResult = await DbTransactions.changePassword(user);
    if (userSaveResult) {
      try {
        return { token: jwt.sign(getUserToToken(user), config.getJwtPrivateKey()) };
      } catch (err) {
        console.error(err);
        return responseMessage.USER.TOKEN_CREATE_ERROR;
      }
    }
    return responseMessage.USER.RESET_PASSWORD_FAIL;
  } else {
    return responseMessage.USER.WRONG_USERNAME_OR_PASSWORD;
  }
}

async function getUser(username) {
  const user = await UserDoc.getUserByUsername(username);
  if (!user) {
    return responseMessage.USER.NOT_FOUND;
  }
  if (user === responseMessage.DATABASE.ERROR) {
    return responseMessage.USER.NOT_FOUND;
  }
  return user;
}

async function changeUserData(userId, avatarUrl) {
  const user = await UserDoc.getUserById(userId);
  if (!user) {
    return responseMessage.USER.NOT_FOUND;
  }
  if (user === responseMessage.DATABASE.ERROR) {
    return responseMessage.DATABASE.ERROR;
  }

  user.avatarUrl = avatarUrl;
  let leagues;
  if (user.leagues.length) {
    let leagueIds = [];
    user.leagues.forEach(league => {
      leagueIds.push(league.leagueId);
    })
    leagues = await LeagueDoc.getLeaguesByIds(leagueIds);
    if (!leagues) {
      return responseMessage.LEAGUE.LEAGUES_NOT_FOUND;
    }
    if (leagues === responseMessage.DATABASE.ERROR) {
      return responseMessage.DATABASE.ERROR;
    }
    leagues.forEach(league => {
      league.players.find(player => user._id.equals(player.id)).avatar = user.avatarUrl;
    })
  }
  return await DbTransactions.changeUserData(user, leagues);
}

function getUserToToken(user) {
  return {
    username: user.username,
    userId: user._id,
    userEmail: user.email,
    isAdmin: user.isAdmin
  }
}
