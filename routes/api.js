/*
 * API
 */

// Load factories
var factories = require("./factories");

// Search API
exports.search = function(req, res) {
    var messages = new (require('../models/messages'))();
    var users = new (require('../models/users'))();
        
    var search = req.body.search;
    if( search == undefined ) {
        search = req.params.token;
    }

    messages.search( search, function(err, docs) {
        users.search( search, function( err, udocs ) {

            // Pre-process results
            for( var i = 0 ; i < udocs.length ; i++ ) {
                // Remove non public users.
                var object = {
                    username : udocs[i]._id,
                    name: udocs[i].name,
                    description: udocs[i].description,
                    location : udocs[i].location,
                    website: udocs[i].website,
                    images = {
                        original: 'http://coolpa.net/avatars/' + username + '/avatar.original.jpg',
                        square: 'http://coolpa.net/avatars/' + username + '/avatar.square.jpg',
                        top: 'http://coolpa.net/avatars/' + username + '/top.jpg',
                    },
                    created: udocs[i].createdDate,
                    updated: udocs[i].updatedDate
                };
                
                udocs[i] = object;
            }

            for( i = 0 ; i < docs.length ; i++ ) {
                delete docs[i].public;
                delete docs[i].hidden;
                delete docs[i].images;
                delete docs[i].ids;
                delete docs[i].from;
            }

            res.json({
                results: parseInt(docs.length) + parseInt(udocs.length),
                date: new Date().getTime(),
                search: search,
                users: udocs,
                messages: docs
            });
        }); 
    });
};