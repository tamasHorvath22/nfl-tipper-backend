const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

let Schema = mongoose.Schema;

let userSchema = new Schema({
    username: { type : String, required: true, unique: true, dropDups: true },
    password: { type : String, required: true },
    email: { type : String, unique: true, required: true },
    leagues: []
}, { timestamps: true });

userSchema.pre('save', function (next) {
    var user = this;
    if (!user.isModified('password')) { return next() };
    bcrypt.hash(user.password, 10)
        .then((hashedPassword) => {
            user.password = hashedPassword;
            next();
    })
}, function (err) {
    next(err)
})

userSchema.methods.comparePassword = function(candidatePassword, next) {
    bcrypt.compare(candidatePassword, this.password, function (err, isMatch) {
        if(err) return next(err);
        next(null, isMatch)
    })
}

module.exports = mongoose.model('User', userSchema);
