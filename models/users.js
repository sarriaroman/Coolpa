var users = (function( ) {
    function users() {
        var db = require('../classes/db');
        
        this.database = new db();
    }
    
    users.prototype.auth = function( username, password, callback ) {
        this.database.connection().collection('Users').findOne({
            $or: [ { _id: username }, { email: username } ],
            password: this.hashPass(password)
        }, function(err, data){
            callback(data);
        });
    };

    users.prototype.hashPass = function(password) {
        var crypto = require('crypto');
        
        var md5sum = crypto.createHash('md5');
        md5sum.update( password );
        return md5sum.digest('hex');
    };
    
    users.prototype.user = function(username, callback) {
        this.database.connection().collection('Users').findOne( { $or : [ { _id : username }, { email : username }] }, callback);
    };
    
    users.prototype.users = function(usernames, callback) {
        this.database.connection().collection('Users').findItems({_id: { $in: usernames }}, callback);
    };
    
    users.prototype.connections = function(username, callback) {
        this.database.connection().collection('Users').findItems({connections: username}, {limit : 0}, callback);
    };
    
    users.prototype.connect = function(current, conn, callback) {
        this.database.connection().collection('Users').updateById(current, { $push: { connections: conn }}, callback);
    };
    
    users.prototype.disconnect = function(current, conn, callback) {
        this.database.connection().collection('Users').updateById(current, { $pull: { connections: conn }}, callback);
    };
    
    users.prototype.update = function(current, data, callback) {
        delete data.connections;
        delete data.invites;
        
        data.updatedDate = new Date();
        
        this.database.connection().collection('Users').updateById(current, { $set: data }, callback);
    };

    users.prototype.addMobileSession = function(current, sid, callback) {
        this.database.connection().collection('Users').updateById(current, { $addToSet: { "mobile.sessions": sid.toString() } }, function(err){
            callback( sid );
        });
    };

    users.prototype.addPushDevice = function(current, device, callback) {
        this.database.connection().collection('Users').updateById(current, { $addToSet: { "mobile.devices": device } }, function(err){
            callback( device );
        });
    };

    users.prototype.addFavorite = function(current, mid, callback) {
        this.database.connection().collection('Users').updateById(current, { $addToSet: { "favorites": mid } }, callback);
    };

    users.prototype.removeFavorite = function(current, mid, callback) {
        this.database.connection().collection('Users').updateById(current, { $pull: { favorites: mid }}, callback);
    };

    users.prototype.create = function(data, rdata, callback) {
        data.createdDate = new Date();
        data.updatedDate = new Date();
        
        this.database.connection().collection('Users').insert(data, function(err, dt) {
            callback( data, rdata );
        });
    };

    users.prototype.copy = function(username, new_username, callback) {
        var dbconnection = this.database.connection();

        dbconnection.collection('Users').findOne( { _id : username }, function(err, data) {
            var old_id = data._id;
            data._id = new_username;

            dbconnection.collection('Users').removeById(this.database.getObjectID(old_id), function(err) {
                dbconnection.collection('Users').insert( data, callback );
            });
        });
    };
    
    users.prototype.find = function(username, callback) {
        this.database.connection().collection('Users').findItems({_id: username}, callback);
    };
    
    users.prototype.search = function(search, callback) {
        this.database.connection().collection('Users').findItems({ $or: [{_id: search}, {name: { $regex: search, $options: 'i' } }]}, callback);
    };

    users.prototype.all = function(callback) {
        this.database.connection().collection('Users').findItems({}, callback);
    };
    
    return users;
})();
    


module.exports = users;