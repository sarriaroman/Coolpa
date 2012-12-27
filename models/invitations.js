var invitations = (function( ) {
    function invitations() {
        var db = require('../classes/db');
        
        this.database = new db();
    }
    
    invitations.prototype.add = function( data, callback ) {
        data.creationDate = new Date();
        
        this.database.connection().collection('Invitations').insert(data, callback);
    };
    
    invitations.prototype.check = function( data, callback ) {
        this.database.connection().collection('Invitations').findItems({email: data.email}, function(err, rows) {
            callback(rows, data);
        });
    };
    
    invitations.prototype.get = function( code, callback ) {
        return this.database.connection().collection('Invitations').findOne({code: code}, callback);
    };

    invitations.prototype.getByInviter = function( inviter, callback ) {
        return this.database.connection().collection('Invitations').findItems({sender: inviter}, callback);
    };
    
    invitations.prototype.remove = function( code, callback ) {
        return this.database.connection().collection('Invitations').remove({code: code}, callback);
    };
    
    return invitations;
})();
    


module.exports = invitations;