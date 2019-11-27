module.exports = Object.freeze({
    BASE_TEMPLATE_PATH: '../common/constants/templates/',
    CREDENTIALS: {
        SENDER: 'no-reply@nfl.tipper.com'
    },
    REGISTRATION: {
        SUBJECT: 'Welcome to NFL tipper!',
        TEMPLATE_PATH: 'registration-mail-template.html',
        GET_TEMPLATE_PATH: function() {
            console.log(this.BASE_TEMPLATE_PATH);
            return this.BASE_TEMPLATE_PATH + this.REGISTRATION.TEMPLATE_PATH;
        }
    }
})