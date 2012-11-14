var messages = (function( ) {
    function messages() {
        var db = require('../classes/db');
        
        this.database = new db();
    }
    
    messages.prototype.add = function( data, callback ) {
        data.creationDate = new Date();
        
        this.database.connection().collection('Messages').insert(data, callback);
    };
    
    messages.prototype.remove = function( id, callback ) {
        return this.database.connection().collection('Messages').removeById(this.database.getObjectID(id), callback);
    };
    
    messages.prototype.hide = function( id, callback ) {
        return this.database.connection().collection('Messages').updateById(this.database.getObjectID(id),{$set: { hidden: true }}, callback);
    };
    
    messages.prototype.unhide = function( id, callback ) {
        return this.database.connection().collection('Messages').updateById(this.database.getObjectID(id),{$set: { hidden: false }}, callback);
    };

    messages.prototype.find = function( uid, connections, callback ) {
        connections.push( uid );
        
        return this.database.connection().collection('Messages').findItems({sender: { $in: connections }},{sort: { creationDate: 1 }}, callback);
    };
    
    messages.prototype.mentions = function( uid, callback ) {
        return this.database.connection().collection('Messages').findItems({ids: uid}, callback);
    };
    
    messages.prototype.get = function( _id, callback ) {
        return this.database.connection().collection('Messages').findOne({_id: this.database.getObjectID(_id)}, callback);
    };
    
    messages.prototype.count = function( uid, connections, callback ) {
        connections.push( uid );
        
        return this.database.connection().collection('Messages').count({sender: { $in: connections }}, callback);
    };
    
    messages.prototype.search = function( search, callback ) {
        return this.database.connection().collection('Messages').findItems({message: { $regex: search, $options: 'i' }}, callback);
    };
    
    return messages;
})();
    
module.exports = messages;