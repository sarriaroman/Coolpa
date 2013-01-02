/*
 * Working factories
 */

exports.message_factory = function(req, res, information, callback) {
    var Messages = require('../models/messages');
    var users = new (require('../models/users'))();
    var fs = require('fs');
    var ses = new (require('../classes/ses'))();
    var ejs = require('ejs');
    
    var Message = new Messages();
    
    var msg = information.message;
    
    if( msg.trim() == '' ) {
        callback(req, res, information);
        return;
    }

    // Protect the platform from HTML injection
    msg = msg.replace(/<\s*br\/*>/gi, " ");
    msg = msg.replace(/<\s*a.*href="(.*?)".*>(.*?)<\/a>/gi, " $1 "); //" $2 (Link->$1) "
    msg = msg.replace(/<\s*\/*.+?>/ig, " ");
    msg = msg.replace(/ {2,}/gi, " ");
    msg = msg.replace(/\n+\s*/gi, " ");
    
    var ids = new Array();
    msg.replace(/[:]+[A-Za-z0-9-_]+/g, function(u) {
        var uname = u.replace(':', '').toLowerCase();
        
        if( uname.length > 2 ) {
            if(ids.indexOf(uname) == -1) {
                ids.push( uname );
            }
        }
    });

    // Process image and add to image array.
    
    Message.add({
        message: msg,
        ids: ids,
        sender: information.uid,
        public: information.public,
        reply_to: information.reply_to,
        author: information.author,
        original_id: information.original_id,
        hidden: false,
        from: information.from,
        images: information.images
    }, function(msg, err) {
        if( msg.public === true ) {
            fs.readFile('views/email_template.html', 'UTF-8', function(err, html) {
                // Prepare push message
                var GCM = require('gcm').GCM;

                var gcm = new GCM('AIzaSyBolUX8ziVmOUzK2wTA2lmR9MzdkPRjot8');

                var gcm_message = {
                    collapse_key: 'New Mentions', 
                    'data.title': ':' + msg.sender + ' is talking about you on Coolpa',
                    'data.message': msg.message
                };

                for( var i = 0 ; i < ids.length ; i++ ) {
                    var uid = ids[i];
                    console.log(uid);

                    users.user(uid, function(err, data){
                        if( data != undefined ) {
                            // Mail Notifications
                            if( data.notifications.mentions == 1 ) {
                            ses.get().send({
                                from: 'Coolpa.net <info@coolpa.net>',
                                to: [data.email],
                                subject: 'You have new mentions on Coolpa',
                                body: {
                                    html: ejs.render(html, {
                                        username: data._id, 
                                        uid: msg.sender
                                    })
                                }
                            });
                            console.log('Email sent to ' + data._id);
                            }
                            
                            // Push notifications

                            for( var di = 0 ; di < data.mobile.devices.length ; di++ ) {
                                var dev = data.mobile.devices[di];

                                if( dev.type == "Android" ) {
                                    gcm_message.registration_id = dev.pid;

                                    gcm.send(gcm_message, function(err, messageId){
                                        if (err) {
                                            console.log("Something has gone wrong! " + err);
                                        } else {
                                            console.log("Sent with message ID: ", messageId);
                                        }
                                    });
                                }
                            }
                        }
                    });
                }

            });
        } else {
            fs.readFile('views/private_template.html', 'UTF-8', function(err, html) {
                // Prepare push message
                var GCM = require('gcm').GCM;

                var gcm = new GCM('AIzaSyBolUX8ziVmOUzK2wTA2lmR9MzdkPRjot8');

                var gcm_message = {
                    collapse_key: 'New Privates', 
                    'data.title': ':' + msg.sender + ' sent you a new private message on Coolpa',
                    'data.message': msg.message
                };

                for( var i = 0 ; i < ids.length ; i++ ) {
                    var uid = ids[i];
                    console.log(uid);
                
                    users.user(uid, function(err, data){
                        if( data != undefined ) {
                            if( data.notifications.privates == 1 ) {
                            ses.get().send({
                                from: 'Coolpa.net <info@coolpa.net>',
                                to: [data.email],
                                subject: 'You have new private messages on Coolpa',
                                body: {
                                    html: ejs.render(html, {
                                        username: data._id, 
                                        uid: msg.sender
                                    })
                                }
                            });
                            }
                    
                            // Push notifications

                            for( var di = 0 ; di < data.mobile.devices.length ; di++ ) {
                                var dev = data.mobile.devices[di];

                                if( dev.type == "Android" ) {
                                    gcm_message.registration_id = dev.pid;

                                    gcm.send(gcm_message, function(err, messageId){
                                        if (err) {
                                            console.log("Something has gone wrong! " + err);
                                        } else {
                                            console.log("Sent with message ID: ", messageId);
                                        }
                                    });
                                }
                            }
                        }
                    });
                }

            });
        }

    callback(req, res, information);

});

};

exports.conversation_factory = function(msgs, id, request, response, callback) {
    var message = new (require('../models/messages'))();

    message.get(id, function(err, data) {
        msgs.push( data );

        if( data.reply_to == '' || data.reply_to == -1 ) {
            callback(msgs, request, response);
        } else {
            exports.conversation_factory(msgs, data.reply_to, request, response, callback);
        }
    });
};

exports.security = function(req, res, callback) {
    if( req.session.uid == undefined ) {
        res.redirect('/');
    } else {
        var users = new (require('../models/users'))();

        users.user( req.session.uid, function(err, data) {
            if(data == null || data == undefined || err ) {
                req.session.uid = undefined;
                delete req.session.uid;

                res.redirect('/');
            } else {
                callback(req, res);
            }
        });
    }
};

exports.mobile_security = function(req, res, callback) {
    var users = new (require('../models/users'))();

    if( req.body == null ) {
        res.json({
            result: false,
            message: 'Unauthorized'
        });
    } else {
        users.user( req.body.username, function(err, data) {
            if( data.mobile.sessions.indexOf( req.body.token ) != -1 ) {
                callback(req, res);
            } else {
                res.json({
                    result: false,
                    message: 'Unauthorized'
                });
            }
        });
    }
};

exports.home_factory = function(session_uid, callback) {
    var messages = new (require('../models/messages'))();
    var users = new (require('../models/users'))();

    users.user( session_uid, function(err, data) {
        messages.find( session_uid, data.connections.slice(0), new Date(), function(err, docs) {
            messages.count( session_uid, [], function(err, cnt) {
                users.connections( session_uid, function(err, conns) {

                    var autocomplete = "[";
                    for( var i = 0 ; i < data.connections.length ; i++ ) {
                        var obj = "{'id':'" + data.connections[i] + "', 'name':':" + data.connections[i] + "', 'avatar': '/avatars/" + data.connections[i] + "/avatar.square.jpg" + "', 'icon':'" + "', 'type':'contact'}";

                        if( i < (data.connections.length - 1) ) {
                            obj += ",";
                        }

                        autocomplete += obj;
                    }
                    autocomplete += "]";

                    callback({
                        user: data._id,
                        username: '',
                        messages: docs,
                        count: cnt,
                        connections: data.connections.length,
                        connecteds: conns.length,
                        autocomplete: autocomplete,
                        section: 'start'
                    });
                }); 
            } );
        });
    } );
};

exports.privates_factory = function(session_uid, callback) {
    var messages = new (require('../models/messages'))();
    var users = new (require('../models/users'))();

    users.user( session_uid, function(err, data) {
        messages.privates( session_uid, new Date(), function(err, docs) {
            messages.count(session_uid, [], function(err, cnt) {
                users.connections( session_uid, function(err, conns) {

                    callback({
                        user: session_uid,
                        username: '',
                        messages: docs, // Reversing array
                        count: cnt,
                        connections: data.connections.length,
                        connecteds: conns.length,
                        section: 'privates'
                    });
                }); 
            } );
        });
    } );
};

exports.mentions_factory = function(session_uid, callback) {
    var messages = new (require('../models/messages'))();
    var users = new (require('../models/users'))();

    users.user( session_uid, function(err, data) {
        messages.mentions( session_uid, new Date(), function(err, docs) {
            messages.count( session_uid, [], function(err, cnt) {
                users.connections( session_uid, function(err, conns) {

                    var autocomplete = "[";
                    for( var i = 0 ; i < data.connections.length ; i++ ) {
                        var obj = "{'id':'" + data.connections[i] + "', 'name':':" + data.connections[i] + "', 'avatar': '/avatars/" + data.connections[i] + "/avatar.square.jpg" + "', 'icon':'" + "', 'type':'contact'}";

                        if( i < (data.connections.length - 1) ) {
                            obj += ",";
                        }

                        autocomplete += obj;
                    }
                    autocomplete += "]";
                    
                    callback({
                        user: session_uid,
                        username: '',
                            messages: docs, // Reversing array
                            count: cnt,
                            connections: data.connections.length,
                            connecteds: conns.length,
                            autocomplete: autocomplete,
                            section: 'mentions'
                        });
                }); 
            } );
        });
    } );
};

exports.remove_factory = function(mid, uid, req, res, callback) {
    var messages = new (require('../models/messages'))();
        
    messages.get(mid, function(err, data) {
        if( data.sender == uid ) {
            messages.remove(mid, function(err) {
                callback(true, req, res);
            });
        } else {
            callback(false, req, res);
        }
    });
};