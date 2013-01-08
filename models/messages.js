var messages = (function( ) {
    function messages() {
        var db = require('../classes/db');
        
        this.database = new db();
    }
    
    messages.prototype.add = function( data, callback ) {
        data.creationDate = new Date();
        
        this.database.connection().collection('Messages').insert(data, function(err){
            callback(data, err);
        });
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

    messages.prototype.find = function( uid, connections, date, callback ) {
        connections.push( uid );
        
        return this.database.connection().collection('Messages').findItems({sender: { $in: connections }, creationDate: { $lt : date }, public: true },{sort: { creationDate: -1 }, limit: 20 }, callback);
    };

    messages.prototype.newest = function( uid, connections, date, callback ) {
        connections.push( uid );
        
        return this.database.connection().collection('Messages').findItems({sender: { $in: connections }, creationDate: { $gt : date }, public: true },{sort: { creationDate: -1 } }, callback);
    };

    messages.prototype.privates = function( uid, date, callback ) {
        return this.database.connection().collection('Messages').findItems({ $or: [{ ids: uid }, { sender: uid }], creationDate: { $lt : date }, public: false },{sort: { creationDate: -1 }, limit: 20 }, callback);
    };
    
    messages.prototype.mentions = function( uid, date, callback ) {
        return this.database.connection().collection('Messages').findItems({ids: uid, creationDate: { $lt : date }, public: true}, { sort: { creationDate : -1 }, limit : 20 }, callback);
    };
    
    messages.prototype.get = function( _id, callback ) {
        return this.database.connection().collection('Messages').findOne({_id: this.database.getObjectID(_id)}, callback);
    };
    
    messages.prototype.messagesIn = function( uid, messages_in, callback ) {
        var arr_c = [];
        for( var indx in messages_in ) {
            arr_c.push( this.database.getObjectID( messages_in[indx] ) );
        }
        return this.database.connection().collection('Messages').findItems({ _id: { $in: arr_c }, public: true },{sort: { creationDate: -1 } }, callback);
    };

    messages.prototype.count = function( uid, connections, callback ) {
        connections.push( uid );
        
        return this.database.connection().collection('Messages').count({sender: { $in: connections }, public: true}, callback);
    };
    
    messages.prototype.search = function( search, callback ) {
        return this.database.connection().collection('Messages').findItems({ $or : { message: { $regex: search, $options: 'i' }, sender : search }, public: true, hidden: false}, {limit: 0}, callback);
    };

    messages.prototype.recommendationsByMessages = function( fcallback ) {
        return this.database.connection().collection('Messages').group(["sender"], {}, {"count": 0}, "function(obj, prev) { prev.count++; }", true, function(err, recommendations) {
            var async = require('async');

            async.sortBy(recommendations, function(reco, callback){
                callback(null, reco.count);
            }, function(err, results){
                fcallback( results.reverse() );
            });
        });
    };
    
    return messages;
})();
    
module.exports = messages;