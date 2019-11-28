module.exports = Object.freeze({
    BASE_TEMPLATE_PATH: 'common/constants/templates/',
    CREDENTIALS: {
        SENDER: 'horvathtamas22@gmail.com'
    },
    REGISTRATION: {
        SUBJECT: 'Welcome to NFL tipper!',
        TEMPLATE_PATH: 'registration-mail-template.html'      
    },
    GET_REGISTRATION_TEMPLATE_PATH: function() {
        return this.BASE_TEMPLATE_PATH + this.REGISTRATION.TEMPLATE_PATH;
    }
})