// user schema

var mongoose = require('mongoose')
, Schema = mongoose.Schema
, crypto = require('crypto')
, ObjectId = mongoose.Schema.Types.ObjectId
, db = mongoose.createConnection('localhost', 'coolpa');

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
  console.log("Connection opened");
});

var UserSchema = mongoose.Schema({
    _id: String,
    name: String, 
    lastname: String, 
    description: String, 
    email: String, 
    password: String, 
    invites: Number, 
    connections: Array, 
    createdDate: Date, 
    updatedDate: Date
});

// validations
var validatePresenceOf = function (value) {
    return value && value.length
}

// the below 4 validations only apply if you are signing up traditionally


// pre save hooks
UserSchema.pre('save', function(next) {
    this.password = this.encryptPassword( this.password ); 
  
    if (!this.isNew) return next()

    if (!validatePresenceOf(this.password))
        next(new Error('Invalid password'))
    else
        next()
})

// methods
UserSchema.method('authenticate', function(plainText) {
    return this.encryptPassword(plainText) === this.password
})

UserSchema.method('encryptPassword', function(password) {
    var md5sum = crypto.createHash('md5');
    md5sum.update( password );
    return md5sum.digest('hex');
})

module.exports = db.model('Users', UserSchema);