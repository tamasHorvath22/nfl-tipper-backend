const User = require('../models/userModel');
const EmailConfirm = require('../models/confirmEmailModel');
const ForgotPassword = require('../models/forgotPasswordModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config');
const responseMessage = require('../common/constants/api-response-messages');
const mailType = require('../common/constants/email-type');
const schemas = require('../common/constants/schemas');
const MailService = require('../services/mailService');
const Transaction = require('mongoose-transactions');
const UserDoc = require('../persistence/user-doc');

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
  let user;
  try {
    user = await UserDoc.getUserByUsername(userDto.username);
  } catch {
    return responseMessage.USER.ERROR;
  }
  if (!user) {
    return responseMessage.USER.WRONG_USERNAME_OR_PASSWORD;
  }
  if (!user.isEmailConfirmed) {
    return responseMessage.USER.EMAIL_NOT_CONFIRMED;
  }
  let authenticated;
  try {
    authenticated = await bcrypt.compare(userDto.password, user.password);
  } catch (err) {
    console.log(err);
    return responseMessage.USER.AUTHENTICATION_ERROR;
  }
  if (authenticated) {
    try {
      return { token: jwt.sign(getUserToToken(user), config.getJwtPrivateKey()) };
    } catch (err) {
      console.log(err);
      return responseMessage.USER.TOKEN_CREATE_ERROR;
    }
  } else {
    return responseMessage.USER.WRONG_USERNAME_OR_PASSWORD;
  }
}

async function register(userDto) {
  if (userDto.username[0] === '$') {
    return responseMessage.USER.USERNAME_TAKEN;
  }
  const user = User({
    username: userDto.username,
    password: userDto.password,
    email: userDto.email,
    leagues: [],
    invitations: [],
    avatarUrl: null,
    isEmailConfirmed: false
  });

  const emailConfirm = EmailConfirm({
    email: userDto.email,
    userId: user._id
  })
  const transaction = new Transaction(true);
  transaction.insert(schemas.CONFIRM_EMAIL, emailConfirm);
  transaction.insert(schemas.USER, user);

  try {
    await transaction.run();
  } catch (err)  {
    console.log(err);
    transaction.rollback();
    let source;
    if (err.error.keyPattern.hasOwnProperty('username')) {
      source = responseMessage.USER.USERNAME_TAKEN;
    } else if (err.error.keyPattern.hasOwnProperty('email')) {
      source = responseMessage.USER.EMAIL_TAKEN;
    } else {
      source = responseMessage.USER.UNSUCCESSFUL_REGISTRATION;
    }
    return source;
  };
  const userEmilData = {
    $emailAddress: user.email,
    $username: user.username,
    $url: `${process.env.UI_BASE_URL}${process.env.CONFIRM_EMAIL_URL}/${emailConfirm._id}`
  }
  await MailService.send(userEmilData, mailType.EMAIL_CONFIRM); // EZ A JÓ EMAIL KÜLDŐ!!!!!!!!
  return responseMessage.USER.SUCCESSFUL_REGISTRATION;
}

async function resetPassword(email) {
  let user;
  try {
    user = await UserDoc.getUserByEmail(email);
    if (!user) {
      return responseMessage.USER.NOT_FOUND;
    }
  } catch (err) {
    console.log(err);
    return responseMessage.USER.NOT_FOUND;
  }
  const forgotPassword = ForgotPassword({
    email: email
  })
  
  const transaction = new Transaction(true);
  transaction.insert(schemas.FORGOT_PASSWORD, forgotPassword);
  try {
    await transaction.run();
    const userEmailData = {
      $emailAddress: email,
      $username: user.username,
      $url: `${process.env.UI_BASE_URL}${process.env.RESET_PASSWORD_URL}/${forgotPassword._id}`
    }

    // await MailService.send(userEmailData, mailType.FORGOT_PASSWORD); // EZ A JÓ EMAIL KÜLDŐ!!!!!!!!

    return responseMessage.USER.RESET_PASSWORD_EMAIL_SENT;
  } catch (err)  {
    console.log(err);
    transaction.rollback();
    return responseMessage.USER.RESET_PASSWORD_EMAIL_FAIL;
  };
}

async function newPassword(data) {
  let user;
  let forgotPassword;
  try {
    forgotPassword = await ForgotPassword.findById(data.hash).exec();
    if (!forgotPassword) {
      return responseMessage.FORGET_PASSWORD.NO_REQUEST_FOUND;
    }
  } catch (err) {
    console.log(err);
    return responseMessage.COMMON.ERROR;
  }
  try {
    user = await UserDoc.getUserByEmail(forgotPassword.email);
  } catch (err) {
    console.log(err);
    return responseMessage.USER.NOT_FOUND;
  }
  user.password = data.password;
  const transaction = new Transaction(true);
  transaction.insert(schemas.USER, user);
  transaction.remove(schemas.FORGOT_PASSWORD, forgotPassword)
  
  try {
    await transaction.run();
    return responseMessage.USER.RESET_PASSWORD_SUCCESS;
  } catch (err)  {
    console.log(err);
    transaction.rollback();
    return responseMessage.USER.RESET_PASSWORD_FAIL;
  };
}

async function checkPassToken(hash) {
  let forgotPassword;
  try {
    forgotPassword = await ForgotPassword.findById(hash).exec();
    if (!forgotPassword) {
      return responseMessage.USER.NO_HASH_FOUND;
    }
    return responseMessage.USER.HASH_FOUND;
  } catch (err) {
    console.log(err);
    return responseMessage.USER.NO_HASH_FOUND;
  }
}

async function confirmEmail(hash) {
  let confirmModel;
  try {
    confirmModel = await EmailConfirm.findById(hash).exec();
    if (!confirmModel) {
      return responseMessage.USER.NO_EMAIL_HASH_FOUND;
    }
  } catch (err) {
    console.log(err);
    return responseMessage.USER.NO_EMAIL_HASH_FOUND;
  }

  let user = null
  try {
    user = await UserDoc.getUserById(confirmModel.userId);
    if (!user) {
      return responseMessage.USER.NOT_FOUND;
    }
    user.isEmailConfirmed = true
  } catch (err) {
    console.log(err);
    return responseMessage.USER.NOT_FOUND;
  }
  
  const transaction = new Transaction(true);
  transaction.remove(schemas.CONFIRM_EMAIL, confirmModel)
  transaction.insert(schemas.USER, user);

  try {
    await transaction.run();
    return responseMessage.USER.EMAIL_CONFIRMED;
  } catch (err)  {
    console.log(err);
    transaction.rollback();
    return responseMessage.USER.EMAIL_CONFIRM_FAIL;
  };
}

async function changePassword(username, passwords) {
  let user;
  try {
    user = await UserDoc.getUserByUsername(username);
    if (!user) {
      return responseMessage.USER.NOT_FOUND;
    }
    let authenticated;
    try {
      authenticated = await bcrypt.compare(passwords.oldPassword, user.password);
    } catch (err) {
      console.log(err);
      return responseMessage.USER.AUTHENTICATION_ERROR;
    }
    if (authenticated) {
      user.password = passwords.newPassword
      const transaction = new Transaction(true);
      transaction.insert(schemas.USER, user);

      try {
        await transaction.run();
        try {
          return { token: jwt.sign(getUserToToken(user), config.getJwtPrivateKey()) };
        } catch (err) {
          console.log(err);
          return responseMessage.USER.TOKEN_CREATE_ERROR;
        }
      } catch (err)  {
        console.log(err);
        transaction.rollback();
        return responseMessage.USER.RESET_PASSWORD_FAIL;
      };
    } else {
      return responseMessage.USER.WRONG_USERNAME_OR_PASSWORD;
    }
  } catch (err) {
    console.log(err);
    return responseMessage.USER.NOT_FOUND;
  }
}

async function getUser(username) {
  let user;
  try {
    user = await UserDoc.getUserByUsername(username);
    if (!user) {
      return responseMessage.USER.NOT_FOUND;
    }
    return user;
  } catch (err) {
    console.log(err);
    return responseMessage.USER.NOT_FOUND;
  }
}

async function changeUserData(userId, avatarUrl) {
  let user;
  try {
    user = await UserDoc.getUserById(userId);
    if (!user) {
      return responseMessage.USER.NOT_FOUND;
    }
  } catch (err) {
    console.log(err);
    return responseMessage.USER.NOT_FOUND;
  }

  user.avatarUrl = avatarUrl;
  const transaction = new Transaction(true);
  transaction.insert(schemas.USER, user);

  try {
    await transaction.run();
    return user;
  } catch (err)  {
    console.log(err);
    transaction.rollback();
    return responseMessage.USER.MODIFY_FAIL;
  };

}

function getUserToToken(user) {
  return {
    username: user.username,
    userId: user._id,
    userEmail: user.email
  }
}
