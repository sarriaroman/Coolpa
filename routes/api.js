/*
 * API
 */

// Load factories
var factories = require("./factories");

exports.widget = function(req, res) {
    console.log(req.cookies);
    console.log(req.session);
    res.jsonp( {cookie: req.cookies.coolpa_session } );
};

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
            console.info(docs);
            // Pre-process results
            for( var i = 0 ; i < udocs.length ; i++ ) {
                // Remove non public users.
                var object = {
                    username : udocs[i]._id,
                    name: udocs[i].name,
                    description: udocs[i].description,
                    location : udocs[i].location,
                    website: udocs[i].website,
                    images : {
                        original: 'http://coolpa.net/avatars/' + udocs[i]._id + '/avatar.original.jpg',
                        square: 'http://coolpa.net/avatars/' + udocs[i]._id + '/avatar.square.jpg',
                        top: 'http://coolpa.net/avatars/' + udocs[i]._id + '/top.jpg',
                    },
                    created: udocs[i].createdDate,
                    updated: udocs[i].updatedDate
                };
                
                udocs[i] = object;
            }

            for( i = 0 ; i < docs.length ; i++ ) {
                var object = {
                    id: docs[i]._id,
                    sender: docs[i].sender,
                    message: docs[i].message,
                    reply_to: docs[i].reply_to,
                    created: docs[i].creationDate,
                    republish : {
                        author: docs[i].author,
                        original_id: docs[i].original_id
                    }
                };

                docs[i] = object;
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