const mailTemplates = require('../common/constants/email-templates');
const Mailgun = require('mailgun-js');
const getTemplate = require('./templateModule');
const mailgun = new Mailgun({ 
    apiKey: process.env.MAILGUN_API_KEY,
    domain: process.env.MAILGUN_DOMAIN,
    host: process.env.MAILGUN_EU_HOST
});

module.exports = async function (userData, mailType) {
  const mailTemplate = mailTemplates[mailTemplates.GET_PRE + mailType]();
  const data = {
    from: mailTemplates.CREDENTIALS.SENDER,
    to: userData.$emailAddress,
    subject: mailTemplate.subject,
    html: getTemplate(mailTemplate.path, userData)
  }

  try {
    await mailgun.messages().send(data);
    return true;
  } catch (err) {
    console.log(err);
    return false;
  }
  // mailgun.messages().send(data, function(err, body) {
  //   if (err) {
  //     result = false;
  //   }
  //   else {
  //     result = true;
  //   }
  // })
  // return result;
}
