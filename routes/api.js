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
                var username = udocs[i]._id;
                udocs[i].username = username;
                delete udocs[i].connections;
                delete udocs[i].favorites;
                delete udocs[i].password;
                delete udocs[i].invites;
                delete udocs[i].mobile;
                delete udocs[i].notifications;
                delete udocs[i].email;
                delete udocs[i].favorites;
                delete udocs[i]._id;
                delete udocs[i].lastname;

                udocs[i].images = {
                    original: 'http://coolpa.net/avatars/' + username + '/avatar.original.jpg',
                    square: 'http://coolpa.net/avatars/' + username + '/avatar.square.jpg',
                    top: 'http://coolpa.net/avatars/' + username + '/top.jpg',
                };
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