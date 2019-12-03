const mailTemplates = require('../common/constants/email-templates');
const Mailgun = require('mailgun-js');
const getTemplate = require('./templateModule');
const mailgun = new Mailgun({ 
    apiKey: process.env.MAILGUN_API_KEY,
    domain: process.env.MAILGUN_DOMAIN,
    host: process.env.MAILGUN_EU_HOST 
});

module.exports = function(userData, mailType) {
    const mailTemplate = mailTemplates[mailTemplates.GET_PRE + mailType]();
    const data = {
        from: mailTemplates.CREDENTIALS.SENDER,
        to: userData.email,
        subject: mailTemplate.subject,
        html: getTemplate(mailTemplate.path, userData)
    }

    mailgun.messages().send(data, function(err, body) {
        if (err) { throw err }
        else {
            console.log(body);
        }
    })
}
