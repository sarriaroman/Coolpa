var beta = (function( ) {
    function beta() {
        var db = require('../classes/db');
        
        this.database = new db();
    }
    
    beta.prototype.add = function( data, callback ) {
        data.creationDate = new Date();
        
        this.database.connection().collection('Beta').insert(data, callback);
    };
    
    beta.prototype.get = function( id, callback ) {
        return this.database.connection().collection('Beta').findOne({_id: id}, callback);
    };
    
    beta.prototype.remove = function( id, callback ) {
        return this.database.connection().collection('Beta').remove({_id: id}, callback);
    };
    
    return beta;
})();
    


module.exports = beta;