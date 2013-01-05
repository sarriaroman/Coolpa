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