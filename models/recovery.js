var recovery = (function( ) {
    function recovery() {
        var db = require('../classes/db');
        
        this.table = 'PasswordRecovery';
        this.database = new db();
    }
    
    recovery.prototype.add = function( data, callback ) {
        data.creationDate = new Date();
        
        this.database.connection().collection(this.table).insert(data, callback);
    };
    
    recovery.prototype.check = function( data, callback ) {
        this.database.connection().collection(this.table).findItems({email: data.email}, function(err, rows) {
            callback(rows, data);
        });
    };
    
    recovery.prototype.get = function( code, callback ) {
        return this.database.connection().collection(this.table).findOne({code: code}, callback);
    };
    
    recovery.prototype.remove = function( code, callback ) {
        return this.database.connection().collection(this.table).remove({code: code}, callback);
    };
    
    return recovery;
})();
    


module.exports = (new recovery());