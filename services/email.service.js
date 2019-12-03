class MailService {

    constructor(mailgun, fs, mailTemplates) {
        this.mailgun = mailgun,
        this.fs = fs,
        this.mailTemplates = mailTemplates
    };

    sendEmail(userData, mailType) {
        const mailTemplate = this.mailTemplates[this.mailTemplates.GET_PRE + mailType]();
        const data = {
            from: this.mailTemplates.CREDENTIALS.SENDER,
            to: userData.email,
            subject: mailTemplate.subject,
            html: this._fillVariablesIprepare(this._getTempalteAsOneLiner(mailTemplate.path), userData)
        }

        this.mailgun.messages().send(data, function(err, body) {
            if (err) { throw err }
            else {
                console.log(body);
            }
        })
    }

    _fillVariablesIprepare(template, data) {
        const keys = Object.keys(data);
        keys.forEach(key => {
            template = template.replace(key, data[key]);
        })
        template = this._removeBrackets(template)
        return template;
    }

    _getTempalteAsOneLiner(templatePath) {
        const fileUrl = new URL(this._getBasePath(templatePath));
        const rawFile = this.fs.readFileSync(fileUrl, 'utf8').toString();
        let result = rawFile.replace(/(\r\n|\n|\r)/gm, ""); //removes break lines
        while (result.includes('    ')) {
            result = result.replace('    ', '');
        }
        return result;
    }

    _getBasePath(filePath) {
        const fileBase = 'file:///' + __dirname.replace(/\\/g, '/').slice(0, -8);
        return fileBase + filePath;
    }

    _removeBrackets(template) {
        const brackets = ['{{ ', ' }}'];
        brackets.forEach(bracket => {
            while (template.includes(bracket)) {
                template = template.replace(bracket, '');
            }
        });
        return template;
    }
}

module.exports = MailService;
