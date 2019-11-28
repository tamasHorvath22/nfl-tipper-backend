class MailService {

    constructor(nodemailer, fs, mailTemplates) {
        this.nodemailer = nodemailer,
        this.fs = fs,
        this.mailTemplates = mailTemplates,
        this.data = { username: 'New Tibor', crazy: 'Crazzzy!!!' };
        this.template = '<div><h3>Welcome to NFL tipper!</h3><div>Dear {{ username }}! We are so glad you registered to NFL tipper! {{ crazy }}</div></div>'
    };

    /**
     * 
     * @param {*} userData 
     * @param {*} emailData 
     */
    sendEmail(userData, emailData) {
        let transporter = this.nodemailer.createTransport({
            host: process.env.AMAZON_SMTP_SERVER,
            port: process.env.AMAZON_SMTP_PORT,
            auth: {
                user: process.env.AMAZON_SMTP_USERNAME,
                pass: process.env.AMAZON_SMTP_PASSWORD
            }
        });

        const mailOptions = {
            from: this.mailTemplates.CREDENTIALS.SENDER,
            to: userData.email,
            subject: this.mailTemplates.REGISTRATION.SUBJECT,
            html: this.fillVariablesIprepare(this.getTempalteAsOneLiner(this.mailTemplates.GET_REGISTRATION_TEMPLATE_PATH()), userData)
        }
        
        transporter.sendMail(mailOptions, (err, info) => {
            if(err) {
                console.log(err);
                throw err;
            }
            console.log("Info: ", info);
        });
    }

    fillVariablesIprepare(template, data) {
        const keys = Object.keys(data);
        keys.forEach(key => {
            template = template.replace(key, data[key]);
        })
        template = this.removeBrackets(template)
        return template;
    }

    getTempalteAsOneLiner(templatePath) {
        const fileUrl = new URL(this.getBasePath(templatePath));
        const rawFile = this.fs.readFileSync(fileUrl, 'utf8').toString();
        let result = rawFile.replace(/(\r\n|\n|\r)/gm, ""); //removes break lines
        while (result.includes('    ')) {
            result = result.replace('    ', '');
        }
        return result;
    }

    getBasePath(filePath) {
        const fileBase = 'file:///' + __dirname.replace(/\\/g, '/').slice(0, -8);
        return fileBase + filePath;
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
