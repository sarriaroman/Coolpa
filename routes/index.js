
/*
 * GET home page.
 */

 exports.index = function(req, res){
    if( req.session.uid == undefined ) {

        res.render('start', {
            user: req.session.uid,
            beta_notification: '',
            auth_notification: (req.session.auth_notification == undefined) ? '' : req.session.auth_notification
        });

        if(req.session.auth_notification != undefined) {
            req.session.auth_notification = undefined;
            delete req.session.auth_notification;
        }
        
    } else {
        res.redirect('/start');
    }
};

exports.about = function(req, res) {
    res.render('about', {
        user: req.session.uid
    });
};

exports.terms = function(req, res) {
    res.render('terms', {
        user: req.session.uid
    });
};

exports.auth = function(req, res) {
    var Users = require('../models/users');
    
    var User = new Users();
    
    User.auth( req.body.username.toLowerCase(), req.body.password, function(data) {
        if( data ) {
            req.session.uid = data._id;

            if(req.session.back != undefined) {
                var backUrl = req.session.back;
                
                delete req.session.back;
                
                res.redirect( backUrl );
            } else {
                res.redirect('/start');
            }
        } else {
            req.session.auth_notification = 'Wrong username or password.';
            res.redirect('/');
        }
    } );
};

exports.request_beta = function(req, res) {
    var Beta = new (require('../models/beta'))();

    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

    if( re.test( req.body.email ) ) {
        Beta.add({
            email: req.body.email
        }, function(err) {
            var ses = new (require('../classes/ses'))();
            ses.get().send({
                from: 'Coolpa.net <info@coolpa.net>',
                to: ['rsarria@speryans.com'],
                subject: 'New beta request',
                body: {
                    html: 'New beta request from: ' + req.body.email
                }
            });

            res.render('start', {
                user: req.session.uid,
                beta_notification: 'Thanks for your insterest. You will be notified soon.',
                auth_notification: ''
            });
        });
    }
};

exports.mobile_auth = function(req, res) {
    var Users = require('../models/users');
    
    var User = new Users();
    console.log(req.body);
    
    User.auth( req.body.username.toLowerCase(), req.body.password, function(data) {
        console.log(data);
        if( data ) {
            var session_id = (new Date().getTime()).toString(16);

            User.addMobileSession(data._id, session_id, function(sid) {
                console.log(sid);
                res.json({
                    result: true,
                    session: sid
                });
            });
        } else {
            res.json({
                result: false
            });
        }
    } );
};

exports.mobile_push = function(req, res) {
    mobile_security(req, res, function(request, response){
        var users = new (require('../models/users'))();

        users.addPushDevice(request.body.username, {
            type: request.body.type,
            name: request.body.name,
            pid: request.body.pid
        }, function(rpid){
            console.log("Registered: " + rpid);
        });

        res.json({
            result: true
        });
    });
};

var message_factory = function(req, res, information, callback) {
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

exports.mobile_newest = function(req, res) {
    mobile_security(req, res, function(request, response){
        var users = new (require('../models/users'))();
        var messages = new (require('../models/messages'))();

        users.user( request.body.username, function(err, data) {
            messages.newest( data._id, data.connections.slice(0), new Date(req.body.lastdate), function(err, docs) {
                res.json({
                    result: true,
                    messages: docs
                });
            });
        });
    });
};

exports.mobile_more = function(req, res) {
    mobile_security(req, res, function(request, response){
        var users = new (require('../models/users'))();
        var messages = new (require('../models/messages'))();

        users.user( request.body.username, function(err, data) {
            messages.find( data._id, data.connections.slice(0), new Date(req.body.lastdate), function(err, docs) {
                res.json({
                    result: true,
                    messages: docs
                });
            });
        });
    });
};

exports.upload_picture = function(req, res){
    // Solo una imagen y por separado
    // Imagen asociada a mensaje en el mensaje.

};

exports.create_images = function(req, res) {
    var users = new (require('../models/users'))();
    var s3 = new (require('../classes/s3'))();

    var dirname = __dirname.replace('routes', '');

    users.all( function(err, users_data) {
        users_data.forEach( function(data) {
            var folder = dirname + 'public/avatars/' + data._id.toLowerCase() + '/';
            var ffolder = data._id.toLowerCase() + '/';

            var orig = 'avatar.original.jpg';
            var final_orig = (new Date()).getTime() + '_original.jpg';
            var square = 'avatar.square.jpg';
            var final_square = (new Date()).getTime() + '_square.jpg';
            var top = 'top.jpg'
            var final_top = (new Date()).getTime() + '_top.jpg';

            s3.get().putFile( folder + orig, ffolder + final_orig, { 'x-amz-acl': 'public-read' }, function(err, rs){
                console.log(rs);
            });
            s3.get().putFile( folder + square, ffolder + final_square, { 'x-amz-acl': 'public-read' }, function(err, rs){
                console.log(rs);
            });

            s3.get().putFile( dirname + '/public/images/top-header.jpg', ffolder + final_top, { 'x-amz-acl': 'public-read' }, function(err, rs){
                console.log(rs);
            });

            users.update( data._id, {
                'images.original' : ffolder + final_orig,
                'images.square' : ffolder + final_square,
                'images.top' : ffolder + final_top
            }, function(err){});
        });
    } );
};

exports.avatars = function(req, res) {
    var users = new (require('../models/users'))();

    users.user(req.params.username, function(err, data) {
        if( req.params.file == 'avatar.original.jpg' ) {
            res.redirect('https://coolpa.s3.amazonaws.com/' + data.images.original );
        } else if( req.params.file == 'avatar.square.jpg' ) {
            res.redirect('https://coolpa.s3.amazonaws.com/' + data.images.square );
        } else {
            res.redirect('https://coolpa.s3.amazonaws.com/' + data.images.top );
        }
    });    
};

exports.images = function(req, res) {
    res.redirect('https://coolpa.s3.amazonaws.com/images/' + req.params.file );
};

exports.mobile_message = function(req, res) {
    mobile_security(req, res, function(request, response){

        var s3 = new (require('../classes/s3'))();
        var fs = require('fs');

        var imgs = [];
        if( req.files ) {
            if( req.files.image.length > 0 ) {
                var dirname = __dirname.replace('routes', '');

                var name = (new Date()).getTime().toString(16);
                console.log(name + '.jpg' );
                imgs.push(name + '.jpg' );

                var tmp = dirname + 'public/temp/' + name;
                var easyimg = require('easyimage');

                fs.readFile(req.files.image.path, 'base64', function (err, data) {
                    if (err) throw err;
                    console.log(data.toString("UTF-8"));
                    fs.writeFile(tmp + '_mobile.jpg', data.toString('binary'), function(err) {
                        easyimg.convert({
                            src: tmp + '_mobile.jpg', 
                            dst: tmp + '.jpg', 
                            quality:80
                        }, function(err, image) {
                            if (err) throw err;

                            s3.get().putFile(tmp + '.jpg', 'images/' + name, { 'x-amz-acl': 'public-read' }, function(err, rs){
                                fs.unlink(tmp + '.jpg', function(){});
                            });
                        });
                    });
                });
            }
        }

        message_factory(request, response,
            {
                uid: req.body.username,
                message: req.body.message,
                public: (req.body.public == 68),
                reply_to: ( req.body.reply_to == undefined || req.body.reply_to == '-1' ) ? -1 : req.body.reply_to,
                author: '',
                original_id: '',
                from: 'Mobile application',
                images: imgs
            }, 
            function(req, res, information) {
                if( information.message.trim() == '' ) {
                    res.json({
                        result: false
                    });
                } else {
                    var users = new (require('../models/users'))();
                    var messages = new (require('../models/messages'))();

                    users.user( information.uid, function(err, data) {
                        messages.newest( data._id, data.connections.slice(0), new Date(req.body.lastdate), function(err, docs) {
                            res.json({
                                result: true,
                                messages: docs
                            })
                        });
                    });
                }
            }
        );
    });
};

exports.message = function(req, res) {
    security(req, res);

    var s3 = new (require('../classes/s3'))();
    var fs = require('fs');

    var imgs = [];
    console.log(req.files);
    if( req.files ) {
        if( req.files.image.length > 0 ) {
            var dirname = __dirname.replace('routes', '');

            var name = (new Date()).getTime().toString(16) + '.jpg';

            imgs.push(name);

            var tmp = dirname + 'public/temp/' + name;
            var easyimg = require('easyimage');

            easyimg.convert({
                src: req.files.image.path, 
                dst: tmp, 
                quality:80
            }, function(err, image) {
                if (err) throw err;

                s3.get().putFile( tmp, 'images/' + name, { 'x-amz-acl': 'public-read' }, function(err, rs){
                    fs.unlink(tmp, function(){});
                });
            });
        }
    }

    message_factory(req, res, {
            uid: req.session.uid,
            message: req.body.message,
            public: (req.body.public == 55),
            reply_to: req.body.reply_to,
            author: req.body.author,
            original_id: req.body.original_id,
            from: 'Web',
            images: imgs
    }, function(req, res, information) {
        if( information.public === true ) {
            res.redirect('/');
        } else {
            res.redirect('/privates');
        }
    });
};

exports.signout = function(req, res) {
    security(req, res);
    
    req.session.uid = undefined;
    res.redirect('/');
};

exports.connect = function(req, res) {
    security( req, res );
    var users = new (require('../models/users'))();
    
    users.connect(req.session.uid, req.params.username, function(err, data) {
        var fs = require('fs');
        var ses = new (require('../classes/ses'))();
        var ejs = require('ejs');
        
        users.user(req.params.username, function(err, data){
            if( data != undefined ) {
                fs.readFile('views/reading_template.html', 'UTF-8', function(err, html) {
                    ses.get().send({
                        from: 'Coolpa.net <info@coolpa.net>',
                        to: [data.email],
                        subject: 'You have new readers on Coolpa',
                        body: {
                            html: ejs.render(html, {
                                username: data._id, 
                                uid: req.session.uid
                            })
                        }
                    });
                    console.log('Email sent to ' + data._id);
                });
            }
        });
        
        res.redirect('/users/' + req.params.username); 
    });
};

exports.favorites = function(req, res) {
    var messages = new (require('../models/messages'))();
    var users = new (require('../models/users'))();

    users.user( req.session.uid, function(err, data) {
        messages.messagesIn( req.session.uid, data.favorites, function(err, docs) {
            users.connections( req.session.uid, function(err, conns) {
                console.log(data.favorites);
                console.log(docs);
                res.render('index', {
                    user: req.session.uid,
                    user_data: data,
                    username: '',
                    messages: docs,
                    connections: data.connections.length,
                    connecteds: conns.length,
                    autocomplete: '' ,
                    section: 'favorites'
                }); 
            }); 
        });
    } );
};

exports.favorite = function(req, res) {
    if( req.session.uid == undefined ) {
        res.json({result: false});
    } else {
        var users = new (require('../models/users'))();
        
        users.addFavorite(req.session.uid, req.body.mid, function(err) {
            res.json({result: true});
        }); 
    }
};

exports.unfavorite = function(req, res) {
    if( req.session.uid == undefined ) {
        res.json({result: false});
    } else {
        var users = new (require('../models/users'))();
        
        users.removeFavorite(req.session.uid, req.body.mid, function(err) {
            res.json({result: true});
        }); 
    }
};

exports.disconnect = function(req, res) {
    security( req, res );
    var users = new (require('../models/users'))();
    
    users.disconnect(req.session.uid, req.params.username, function(err, data) {
        res.redirect('/users/' + req.params.username); 
    });
};

exports.user = function(req, res) {
    var messages = new (require('../models/messages'))();
    var users = new (require('../models/users'))();

    var username = req.params.username;
    
    users.user( username, function(err, data) { // Get the search user!
        if( data == null ) {
            res.redirect('/');
        } else {
            messages.find( username, [], new Date(), function(err, docs) {
                messages.count(username, [], function(err, cnt) {
                    users.user( req.session.uid, function(err, actual) { // Get the actual user!!!

                        users.connections( username, function(err, conns) {
                            res.render('user_view', {
                                user: req.session.uid,
                                username: username,
                                data: data,
                                messages: docs, // Reversing array
                                count: cnt,
                                connections: data.connections.length,
                                connecteds: conns.length,
                                mustConnect: (username != req.session.uid),
                                isConnected: (actual.connections.indexOf(username) > -1)
                            }); 
                        });
                    });
                } );
            });
}
} );
};

var mobile_security = function(req, res, callback) {
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

var date_sort_desc = function (date1, date2) {
  // This is a comparison function that will result in dates being sorted in
  // DESCENDING order.
  if (date1 > date2) return -1;
  if (date1 < date2) return 1;
  return 0;
};

var home_factory = function(session_uid, callback) {
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

exports.mobile_start = function(req, res) {
    mobile_security(req, res, function(request, response){
        home_factory(request.body.username, function(data){
            response.json(data);
        });
    });
};

exports.start = function(req, res) {
    if( req.session.uid == undefined ) {
        res.redirect('/');
    } else {
        var messages = new (require('../models/messages'))();
        var users = new (require('../models/users'))();
        
        users.user( req.session.uid, function(err, data) {
            messages.find( req.session.uid, data.connections.slice(0), new Date(), function(err, docs) {
                messages.count(req.session.uid, [], function(err, cnt) {
                    users.connections( req.session.uid, function(err, conns) {
                    	
                    	var autocomplete = "[";
                    	for( var i = 0 ; i < data.connections.length ; i++ ) {
                    		var obj = "{'id':'" + data.connections[i] + "', 'name':':" + data.connections[i] + "', 'avatar': '/avatars/" + data.connections[i] + "/avatar.square.jpg" + "', 'icon':'" + "', 'type':'contact'}";

                         if( i < (data.connections.length - 1) ) {
                            obj += ",";
                        }

                        autocomplete += obj;
                    }
                    autocomplete += "]";

                    res.render('index', {
                        user: req.session.uid,
                        user_data: data,
                        username: '',
                        messages: docs, // Reversing array
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
    }
};

var privates_factory = function(session_uid, callback) {
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

exports.mobile_privates = function(req, res) {
    mobile_security(req, res, function(request, response){
        privates_factory(request.body.username, function(data){
            response.json(data);
        });
    });
};

exports.messages = function(req, res) {
    if( req.session.uid == undefined ) {
        res.redirect('/');
    } else {
        var messages = new (require('../models/messages'))();
        var users = new (require('../models/users'))();
        
        users.user( req.session.uid, function(err, data) {
            messages.privates( req.session.uid, new Date(), function(err, docs) {
                messages.count(req.session.uid, [], function(err, cnt) {
                    users.connections( req.session.uid, function(err, conns) {

                        res.render('privates', {
                            user: req.session.uid,
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
    }
};

exports.more = function(req, res) {
    var messages = new (require('../models/messages'))();
    var users = new (require('../models/users'))();

    var uid = req.session.uid;
    var date = req.body.date;

    if( req.body.section == 'mentions' ) {
        users.user( uid, function(err, data) {
            users.user( req.session.uid, function(err, udata) {
                messages.mentions( uid, new Date( date ), function(err, docs) {
                    res.render('more', {
                        user: req.session.uid,
                        user_data: udata,
                        messages: docs
                    }); 
                });
            });
        } );    
    } else if( req.body.section == 'privates' ) {
        users.user( uid, function(err, data) {
            messages.privates( uid, new Date( date ), function(err, docs) {
                res.render('more_privates', {
                    user: req.session.uid,
                    messages: docs
                }); 
            });
        } );
    } else {
        users.user( uid, function(err, data) {
            users.user( req.session.uid, function(err, udata) {
                messages.find( uid, data.connections.slice(0), new Date( date ), function(err, docs) {
                    res.render('more', {
                        user: req.session.uid,
                        user_data: udata,
                        messages: docs
                    }); 
                });
            });
        } );
    }
};

var mentions_factory = function(session_uid, callback) {
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

exports.mobile_mentions = function(req, res) {
    mobile_security(req, res, function(request, response){
        mentions_factory(request.body.username, function(data){
            response.json(data);
        });
    });
};

exports.mentions = function(req, res) {
    if( req.session.uid == undefined ) {
        res.redirect('/');
    } else {
        var messages = new (require('../models/messages'))();
        var users = new (require('../models/users'))();
        
        users.user( req.session.uid, function(err, data) {
            messages.mentions( req.session.uid, new Date(), function(err, docs) {
                messages.count(req.session.uid, [], function(err, cnt) {
                    users.connections( req.session.uid, function(err, conns) {

                    	var autocomplete = "[";
                    	for( var i = 0 ; i < data.connections.length ; i++ ) {
                    		var obj = "{'id':'" + data.connections[i] + "', 'name':':" + data.connections[i] + "', 'avatar': '/avatars/" + data.connections[i] + "/avatar.square.jpg" + "', 'icon':'" + "', 'type':'contact'}";

                         if( i < (data.connections.length - 1) ) {
                            obj += ",";
                        }

                        autocomplete += obj;
                    }
                    autocomplete += "]";
                    
                    res.render('index', {
                        user: req.session.uid,
                        user_data: data,
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
    }
};

exports.reading = function(req, res) {
    if( req.session.uid == undefined ) {
        res.redirect('/');
    } else {
        var messages = new (require('../models/messages'))();
        var users = new (require('../models/users'))();
        
        console.log(req.params);
        var username = ( req.params.username == 'me' ) ? req.session.uid : req.params.username;
        
        users.user( username, function(err, data) {
            messages.count(username, [], function(err, cnt) {
                users.connections( username, function(err, conns) {
                    users.users( data.connections, function(err, reads) {
                        users.user( req.session.uid, function(err, sdata) {
                            res.render('users', {
                                title: 'Reading',
                                user: req.session.uid,
                                user_data: sdata,
                                username: username,
                                users: reads,
                                count: cnt,
                                connections: data.connections.length,
                                connecteds: conns.length
                            }); 
                        } ); 
                    });
                }); 
            } );
        } );
    }
};

exports.readers = function(req, res) {
    if( req.session.uid == undefined ) {
        res.redirect('/');
    } else {
        var messages = new (require('../models/messages'))();
        var users = new (require('../models/users'))();
        
        var username = ( req.params.username == 'me' ) ? req.session.uid : req.params.username;
        
        users.user( username, function(err, data) {
            messages.count(username, [], function(err, cnt) {
                users.connections( username, function(err, conns) {
                    users.user( req.session.uid, function(err, sdata) {
                        res.render('users', {
                            title: 'Readers',
                            user: req.session.uid,
                            user_data: sdata,
                            username: username,
                            users: conns,
                            count: cnt,
                            connections: data.connections.length,
                            connecteds: conns.length
                        }); 
                    }); 
                });
            } );
        } );
    }
};

exports.profile = function(req, res) {
    if( req.session.uid == undefined ) {
        res.redirect('/');
    } else {
        var users = new (require('../models/users'))();
        
        var notification = ( req.session.notification == undefined ) ? false : req.session.notification;
        delete req.session.notification;

        users.user( req.session.uid, function(err, data) {
            res.render('user_profile', {
                user: req.session.uid,
                data: data,
                notification: notification
            }); 
        });
    }
};

exports.user_data = function(req, res) {
    if( req.session.uid == undefined ) {
        res.redirect('/');
    } else {
        // Si el Username es modificado se deben modificar todas las referencias en la base de datos
        // Mensajes
        // - Texto
        // - ids
        // Lectores
        
        var users = new (require('../models/users'))();

        console.log(req.body);
        
        if( req.body.password != "" && req.body.password == req.body.repeatpassword ) {
            users.update( req.session.uid, {
                name: req.body.name,
                description: req.body.description.substring(0, 139),
                password: users.hashPass( req.body.password ),
                notifications: {
                    mentions: (req.body.mentions == undefined) ? 0 : 1,
                    privates: (req.body.privates == undefined) ? 0 : 1,
                    readers: 1
                }
            }, function() {

                req.session.notification = {
                    type: 'data',
                    message: 'Your information was updated. You changed your password... please remember it the next time!'
                };

                res.redirect('/profile');
            } );
        } else {
            users.update( req.session.uid, {
                name: req.body.name,
                description: req.body.description.substring(0, 139),
                notifications: {
                    mentions: (req.body.mentions == undefined) ? 0 : 1,
                    privates: (req.body.privates == undefined) ? 0 : 1,
                    readers: 1
                }
            }, function() {
                req.session.notification = {
                    type: 'data',
                    message: 'Your information was updated'
                };
                
                res.redirect('/profile');
            } );
        }
    }
};

exports.upload_avatar = function(req, res) {
    if( req.session.uid == undefined ) {
        res.redirect('/');
    } else {
        if( req.files.avatar ) {
            if( req.files.avatar.length > 0 ) {
                var easyimg = require('easyimage');
                var fs = require('fs');
                var s3 = new (require('../classes/s3'))();
                var users = new (require('../models/users'))();
                
                var avatar = req.files.avatar;
                
                var dirname = __dirname.replace('routes', '');
                
                var orig = dirname + 'public/avatars/' + req.session.uid + '/avatar.original.jpg';
                var square = dirname + '/public/avatars/' + req.session.uid + '/avatar.square.jpg';
                
                var ffolder = req.session.uid + '/';

                var final_orig = ffolder + (new Date()).getTime() + '_original.jpg';
                var final_square = ffolder + (new Date()).getTime() + '_square.jpg';

                users.user(req.session.uid, function(err, data) {
                    /*fs.exists(orig, function(oexists) {
                    if( oexists ) {
                        fs.unlink( orig, function() {
                            fs.exists(square, function(sexists) {
                                if( sexists ) {
                                    fs.unlink( square, function() {
                                        
                                    } );
                                } else {
                                    res.redirect('/profile#user_avatar');
                                }
                            });
                        } );
                    } else {
                        res.redirect('/profile#user_avatar');
                    }
                });*/

                    easyimg.convert({
                                            src:avatar.path, 
                                            dst:orig, 
                                            quality:80
                                        }, function(err, image) {
                                            if (err) throw err;
                                            console.log('Converted');

                                            easyimg.thumbnail({
                                                src:orig, 
                                                dst:square, 
                                                width:150, 
                                                height:150
                                            },
                                            function(err, image) {
                                                if (err) throw err;
                                                console.log('Thumbnail created');

                                                s3.get().deleteFile('/'+data.images.original, function(err, rs){
                                                    s3.get().deleteFile('/'+data.images.square, function(err, rs){
                                                        s3.get().putFile( orig, final_orig, { 'x-amz-acl': 'public-read' }, function(err, rs){
                                                            s3.get().putFile( square, final_square, { 'x-amz-acl': 'public-read' }, function(err, rs){
                                                                fs.unlink(orig, function(){
                                                                    fs.unlink(square, function(){
                                                                        users.update( req.session.uid, {
                                                                            'images.original' : final_orig,
                                                                            'images.square' : final_square
                                                                        }, function(err) {
                                                                        req.session.notification = {
                                                                            type: 'avatar',
                                                                            message: 'Your avatar was changed succesfully. If not appear, wait because maybe take a while to be updated.'
                                                                        };

                                                                        res.redirect('/profile#user_avatar');
                                                                        } );
                                                                    });
                                                                });
                                                            });
                                                        });
                                                    });
                                                });
                                            });
                                        });
                });

            } else {
                res.redirect('/profile#user_avatar');
            }
        } else {
            res.redirect('/profile#user_avatar');
        }
    }
};

exports.upload_top = function(req, res) {
    if( req.session.uid == undefined ) {
        res.redirect('/');
    } else {
        if( req.files.top ) {
            if( req.files.top.length > 0 ) {
                var easyimg = require('easyimage');
                var fs = require('fs');
                var s3 = new (require('../classes/s3'))();
                var users = new (require('../models/users'))();
                
                var top = req.files.top;

                if( top.size > ( (8 * 100) * 1024 ) ) {
                    req.session.notification = {
                        message: 'Your top image is too big.'
                    };

                    res.redirect('/profile#user_top');
                } else {
                    var dirname = __dirname.replace('routes', '');
                
                    var orig = dirname + 'public/avatars/' + req.session.uid + '/top.jpg';
                
                    var ffolder = req.session.uid + '/';

                    var final_orig = ffolder + (new Date()).getTime() + '_top.jpg';

                    users.user(req.session.uid, function(err, data) {

                    easyimg.convert({
                        src:top.path, 
                        dst:orig, 
                        quality:90
                    }, function(err, image) {
                        if (err) throw err;
                        console.log('Converted');

                        s3.get().deleteFile('/'+data.images.top, function(err, rs){
                            s3.get().putFile( orig, final_orig, { 'x-amz-acl': 'public-read' }, function(err, rs){
                                fs.unlink(orig, function(){
                                    users.update( req.session.uid, {
                                        'images.top' : final_orig,
                                    }, function(err) {
                                        req.session.notification = {
                                            type: 'top',
                                            message: 'Your top image was changed succesfully. If not appear, wait because maybe take a while to be updated.'
                                        };

                                        res.redirect('/profile#user_top');
                                    } );
                                });
                            });
                        });                        
                    });
                });

            }

            } else {
                res.redirect('/profile#user_top');
            }
        } else {
            res.redirect('/profile#user_top');
        }
    }
};

exports.invite = function(req, res) {
    if( req.session.uid == undefined ) {
        res.redirect('/');
    } else {
        // Separa por comas y envia invitación
        // Te muestra todo el array de invitaciones que enviaste.
        // Cuando un usuario se registra te muestra al lado que username tiene
        // chequeando por el email.
        var users = new (require('../models/users'))();
        var invites = new (require('../models/invitations'))();
        
        var fs = require('fs');
        var ses = new (require('../classes/ses'))();
        var ejs = require('ejs');

        var invitations = req.body.invitations;
        var emails = new Array();
        
        if( invitations.indexOf(',') == -1 ) {
            emails.push(invitations);
        } else {
            var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
            
            var ems = invitations.split(',');
            
            for( var email in ems ) {
                if( re.test(email) ) {
                    emails.push(email);
                }
            }
        }
        
        fs.readFile('views/invite_template.html', 'UTF-8', function(err, html) {
            for( var i = 0 ; i < emails.length ; i++ ) {
                var invitation = emails[i];
                var time = (new Date()).getTime();

                var code = users.hashPass( invitation + time );

                invites.check({
                    code: code,
                    email: invitation,
                    sender: req.session.uid
                }, function( rows, data ) {
                    if(rows.length == 0) {
                        invites.add(data, function(err, dt) {
                            ses.get().send({
                                from: 'Coolpa.net <info@coolpa.net>',
                                to: [data.email],
                                subject: 'You have been invited to Coolpa.net',
                                body: {
                                    html: ejs.render(html, {
                                        uid: req.session.uid,
                                        code: data.code
                                    })
                                }
                            });
                        } );
                    }
                });
            }
            
            req.session.notification = {
                type: 'invites',
                message: 'Your invitations were sent.'
            };
            res.redirect('/profile#invites');
        });
}
};

exports.invitation = function(req, res) {
    var invites = new (require('../models/invitations'))();
    
    invites.get(req.params.code, function(err, data) {
        if( data === null ) {
            res.redirect('/');
        } else {
            res.render('invitation', {
                user: '',
                data: data,
                username: '',
                name: '',
                notification: false
            });
        }
    });
};

 exports.invitation_data = function(req, res) {
    var users = new (require('../models/users'))();
    var invites = new (require('../models/invitations'))();
    var s3 = new (require('../classes/s3'))();

    var fs = require('fs');
    var ses = new (require('../classes/ses'))();
    var ejs = require('ejs');
    
    var reg = /[A-Za-z0-9-_]+/g;
    
    var bdata = req.body;
    var selecteduname = req.body.username.toLowerCase();
    
    if( selecteduname.length < 3 || !reg.test(selecteduname) ) {
        res.render('invitation', {
            user: '',
            data: {
                code: bdata.code,
                email: bdata.email
            },
            username: bdata.username.toLowerCase(),
            name: bdata.name,
            notification: {
                type: 'alert-error',
                message: 'The username you select is wrong. A right username must have at least 3 characters.'
            }
        });
    } else if( bdata.password != bdata.repeatpassword ) {
        res.render('invitation', {
            user: '',
            data: {
                code: bdata.code,
                email: bdata.email
            },
            username: bdata.username.toLowerCase(),
            name: bdata.name,
            notification: {
                type: 'alert-error',
                message: 'The passwords are different'
            }
        });
    } else {
        invites.get(bdata.code, function(err, cdata) {
            if( cdata ) {
                users.find(bdata.username.toLowerCase(), function(err, usersarray) {
                    if( usersarray.length == 0 )
                    {
                        users.user(cdata.sender, function(error, inviter) {
                            users.create({
                                _id: bdata.username.toLowerCase(),
                                connections: [],
                                description: '',
                                name: bdata.name,
                                email: bdata.email,
                                notifications: { 
                                    mentions: 1, 
                                    privates: 1, 
                                    readers: 1 
                                },
                                mobile: {
                                    sessions: [],
                                    devices: []
                                },
                                images : { 
                                    original : bdata.username.toLowerCase() + '/avatar.original.jpg', 
                                    square : bdata.username.toLowerCase() + '/avatar.square.jpg', 
                                    top: bdata.username.toLowerCase() + '/top.jpg' 
                                },
                                favorites: [],
                                invites: 2,
                                password: users.hashPass( bdata.password )
                            }, bdata, function( dt, rdt ) {
                                // Create folders for avatars
                                var dirname = __dirname.replace('routes', '');

                                var orig = 'avatar.original.jpg';
                                var square = 'avatar.square.jpg';
                                var top = 'top.jpg'
                                
                                var ffolder = rdt.username.toLowerCase() + '/';

                                s3.get().putFile( dirname + 'public/avatars/avatar.jpg', ffolder + orig, { 'x-amz-acl': 'public-read' }, function(err, rs){
                                    s3.get().putFile( dirname + 'public/avatars/avatar.jpg', ffolder + square, { 'x-amz-acl': 'public-read' }, function(err, rs){
                                        s3.get().putFile( dirname + '/public/images/top-header.jpg', ffolder + top, { 'x-amz-acl': 'public-read' }, function(err, rs){
                                            fs.readFile('views/welcome_template.html', 'UTF-8', function(err, html) {
                                                ses.get().send({
                                                    from: 'Coolpa.net <info@coolpa.net>',
                                                    to: [rdt.email],
                                                    subject: 'You are succesfully registered on Coolpa.net',
                                                    body: {
                                                        html: ejs.render(html, {
                                                            username: rdt.username.toLowerCase(),
                                                            password: rdt.password
                                                        })
                                                    }
                                                });

                                                fs.readFile('views/joined_template.html', 'UTF-8', function(err, jhtml) {
                                                    ses.get().send({
                                                        from: 'Coolpa.net <info@coolpa.net>',
                                                        to: [inviter.email],
                                                        subject: rdt.username.toLowerCase() + ' has joined Coolpa.net',
                                                        body: {
                                                            html: ejs.render(jhtml, {
                                                                username: inviter._id,
                                                                user: rdt.username.toLowerCase()
                                                            })
                                                        }
                                                    });
                                                });

                                                req.session.uid = rdt.username.toLowerCase();

                                                res.redirect('/');

                                                invites.remove(bdata.code, function(err, cd) {});
                                            });
                                        });
                                    });
                                });

                            });
                        });
                    } else {
                        var not = {
                            type: 'alert-error',
                            message: 'The username you choose is already taken.'
                        };

                        res.render('invitation', {
                            user: '',
                            data: cdata,
                            username: bdata.username.toLowerCase(),
                            name: bdata.name,
                            notification: not
                        });
                    }
                });
            }
        });
    }
};

exports.showmessage = function(req, res) {
    if( req.session.uid == undefined ) {
        req.session.back = '/message/' + req.params.id;
        
        res.redirect('/');
    } else {
        var messages = new (require('../models/messages'))();
        
        messages.get(req.params.id, function(err, data) {
            res.render('message', {
                user: req.session.uid,
                data: data
            }); 
        });
    }
};

exports.remove_message = function(req, res) {
    if( req.session.uid == undefined ) {
        res.redirect('/');
    } else {
        var messages = new (require('../models/messages'))();
        
        messages.get(req.params.id, function(err, data) {
            if( data.sender == req.session.uid ) {
            	messages.remove(req.params.id, function(err) {
            		res.redirect('/');
            	});
            } else {
            	res.redirect('/');
            }
        });
    }
};

exports.hide_message = function(req, res) {
    if( req.session.uid == undefined ) {
        res.redirect('/');
    } else {
        var messages = new (require('../models/messages'))();
        
        messages.get(req.params.id, function(err, data) {
            if( data.sender == req.session.uid ) {
            	messages.hide(req.params.id, function(err) {
            		res.redirect('/');
            	});
            } else {
            	res.redirect('/');
            }
        });
    }
};

exports.unhide_message = function(req, res) {
    if( req.session.uid == undefined ) {
        res.redirect('/');
    } else {
        var messages = new (require('../models/messages'))();
        
        messages.get(req.params.id, function(err, data) {
            if( data.sender == req.session.uid ) {
            	messages.unhide(req.params.id, function(err) {
            		res.redirect('/');
            	});
            } else {
            	res.redirect('/');
            }
        });
    }
};

exports.search = function(req, res) {
    if( req.session.uid == undefined ) {
        req.session.back = '/message/' + req.params.id;
        
        res.redirect('/');
    } else {
        var messages = new (require('../models/messages'))();
        var users = new (require('../models/users'))();
        
        var username = req.session.uid;
        
        var search = req.body.search;
        if( search == undefined ) {
            search = req.params.token;
        }

        users.user( username, function(err, data) {
            messages.search( search, function(err, docs) {
                users.search( search, function( err, userssearch ) {
                    messages.count(username, [], function(err, cnt) {
                        users.connections( username, function(err, conns) {
                            users.user( req.session.uid, function(err, sdata) {
                                res.render('search', {
                                    user: req.session.uid,
                                    user_data: sdata,
                                    search: search,
                                    username: '',
                                    users: userssearch,
                                    messages: docs,
                                    count: cnt,
                                    connections: data.connections.length,
                                    connecteds: conns.length
                                }); 
                            });
                        }); 
                    } ); 
                });
            });
} );
    }
};

var security = function(req, res) {
    if( req.session.uid == undefined ) {
        res.redirect('/');
    }
};