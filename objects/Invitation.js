class Invitation extends User {

    constructor(username, email, leagueName, inviter, applyLink) {
        super(username, email);
        this.leagueName = leagueName,
        this.inviter = inviter,
        this.applyLink = applyLink
    }
}