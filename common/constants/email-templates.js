module.exports = Object.freeze({
  BASE_TEMPLATE_PATH: 'common/constants/templates/',
  GET_PRE: 'GET_',
  CREDENTIALS: {
    SENDER: 'info@nfl-tipper-game.com'
  },
  REGISTRATION: {
    SUBJECT: 'Welcome to NFL tipper!',
    TEMPLATE_PATH: 'registration-mail-template.html' 
  },
  GET_REGISTRATION: function() {
    return {
      path: this.BASE_TEMPLATE_PATH + this.REGISTRATION.TEMPLATE_PATH,
      subject: this.REGISTRATION.SUBJECT
    };
  },
  EMAIL_CONFIRM: {
    SUBJECT: 'Welcome to NFL tipper!',
    TEMPLATE_PATH: 'confirm-email-template.html' 
  },
  GET_EMAIL_CONFIRM: function() {
    return {
      path: this.BASE_TEMPLATE_PATH + this.EMAIL_CONFIRM.TEMPLATE_PATH,
      subject: this.EMAIL_CONFIRM.SUBJECT
    };
  },
  FORGOT_PASSWORD: {
    SUBJECT: 'Reset yout password',
    TEMPLATE_PATH: 'forgot-password-template.html' 
  },
  GET_FORGOT_PASSWORD: function() {
    return {
      path: this.BASE_TEMPLATE_PATH + this.FORGOT_PASSWORD.TEMPLATE_PATH,
      subject: this.FORGOT_PASSWORD.SUBJECT
    };
  },
  LEAGUE_INVITE: {
    SUBJECT: 'League invitation',
    TEMPLATE_PATH: 'league-invitation-template.html' 
  },
  GET_LEAGUE_INVITE: function() {
    return {
      path: this.BASE_TEMPLATE_PATH + this.LEAGUE_INVITE.TEMPLATE_PATH,
      subject: this.LEAGUE_INVITE.SUBJECT
    };
  }
})
