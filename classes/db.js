var db = (function() {
    function db() {
        this.mongo = require('mongoskin');
    
        this.ObjectID = this.mongo.ObjectID;
    };
    
    db.prototype.getObjectID = function(id) {
        return this.ObjectID.createFromHexString(id);
    }
    
    db.prototype.connection = function() {
        return this.mongo.db('localhost:27017/coolpa?auto_reconnect=true', {safe: true, fsync: true});
    };
    
    return db;
})();

module.exports = db;