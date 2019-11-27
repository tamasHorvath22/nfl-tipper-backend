class MailService {

    constructor(nodemailer, fs, mailTemplates) {
        this.nodemailer = nodemailer,
        this.fs = fs,
        this.mailTemplates = mailTemplates,
        this.data = { username: 'New Tibor', crazy: 'Crazzzy!!!' };
        this.template = '<div><h3>Welcome to NFL tipper!</h3><div>Dear {{ username }}! We are so glad you registered to NFL tipper! {{ crazy }}</div></div>'
    };


    sendRegistrationEmail(toEmail) {
        let transporter = this.nodemailer.createTransport({
            host: process.env.AMAZON_SMTP_SERVER,
            port: process.env.AMAZON_SMTP_PORT,
            auth: {
                user: process.env.AMAZON_SMTP_USERNAME,
                pass: process.env.AMAZON_SMTP_PASSWORD
            }
        });

        const userData = { username: 'Békési Tivadar', crazy: 'Ezaz, működik bakker!!!'} // this object will contain the value which goes to template, it may comes as a parameter

        const mailOptions = {
            from: this.mailTemplates.CREDENTIALS.SENDER,
            to: toEmail,
            subject: this.mailTemplates.REGISTRATION.SUBJECT,
            html: this.prepareTemplateToSend(this.makeTempalteOneLiner(this.mailTemplates.BASE_TEMPLATE_PATH + this.mailTemplates.REGISTRATION.TEMPLATE_PATH, userData))
        }

        transporter.sendMail(mailOptions, (err, info) => {
            if(err) throw err
            console.log("Info: ", info);
        });
    }

    prepareTemplateToSend(template, data) {
        const keys = Object.keys(data);
        keys.forEach(key => {
            template = this.changeVariableToData(template, data, key);
        })
        template = this.removeBrackets(template)
        return template;
    }

    makeTempalteOneLiner(templatePath) {
        const rawFile = this.fs.readFileSync('./common/constants/templates/registration-mail-template.html').toString();
        let result = rawFile.replace(/(\r\n|\n|\r)/gm, "");
        while (result.includes('    ')) {
            result = result.replace('    ', '');
        }
        return result;
    }

    changeVariableToData(template, data, key) {
        return template.replace(key, data[key]);
        // console.log(template.replace(key, data[key]));
    }

    removeBrackets(template) {
        const brackets = ['{{ ', ' }}'];
        brackets.forEach(bracket => {
            while (template.includes(bracket)) {
                template = template.replace(bracket, '');
            }
        });
        return template;
    }

    // sendRegistrationEmail(toEmail) {
    //     const data = {
    //         from: this.mailTemplates.CREDENTIALS.SENDER,
    //         to: toEmail,
    //         subject: 'Welcome to NFL tipper!',
    //         html: 'Na, kinek sikerült megoldania az email küldést? :)'
    //     }

    //     this.mailgun.messages().send(data, function(err, body) {
    //         if (err) { throw err }
    //         else {
    //             console.log('body:');
    //             console.log(body);
    //         }
    //     })
    // }
}

module.exports = MailService;
