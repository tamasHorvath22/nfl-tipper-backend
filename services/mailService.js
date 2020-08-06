const mailTemplates = require('../common/constants/email-templates');
const Mailgun = require('mailgun-js');
const getTemplate = require('../modules/templateModule');
const responseMessage = require('../common/constants/api-response-messages');
const mailgun = new Mailgun({ 
    apiKey: process.env.MAILGUN_API_KEY,
    domain: process.env.MAILGUN_DOMAIN,
    host: process.env.MAILGUN_EU_HOST
});

module.exports = {
  send: send,
  validateEmailAddress: validateEmailAddress
}

async function send(userData, mailType) {
  const mailTemplate = mailTemplates[mailTemplates.GET_PRE + mailType]();
  const data = {
    from: mailTemplates.CREDENTIALS.SENDER,
    to: userData.$emailAddress,
    subject: mailTemplate.subject,
    html: getTemplate(mailTemplate.path, userData)
  }

  try {
    await mailgun.messages().send(data);
  } catch (err) {
    console.log(err);
    return responseMessage.EMAIL.SEND_FAIL;
  }
}

async function validateEmailAddress(email) {
  mailgun.validate(email, function (err, body) {
    if(body && body.is_valid) {
      return true;
    }
    return false;
  });
}
