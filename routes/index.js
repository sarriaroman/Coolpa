/*
 * WebPage and Internal Mobile API
 */

// Load factories
var factories = require("./factories");

// Just to try 
exports.widget = function(req, res) {
    var users = new (require('../models/users'))();

    var username = req.params.username;
    console.log(req.params);
    console.log(req.body);

    users.user( username, function(err, data) {
        if( req.session.uid != undefined ) {
            users.user( req.session.uid, function(err, actual) {
                res.jsonp({ 
                    connected: (actual.connections.indexOf(data._id) > -1),
                    connections: data.connections.length
                });
            });
        } else {
            res.jsonp({ 
                connected: false,
                connections: data.connections.length
            });            
        }
    } );
};

exports.index = function(req, res){
    if( req.session.uid == undefined ) {

        res.render('start', {
            user: req.session.uid,
            beta_notification: '',
            auth_notification: (req.session.auth_notification == undefined) ? '' : req.session.auth_notification,
            recover_notification: ''
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
    
    User.auth( req.body.username, req.body.password, function(data) {
        if( data ) {
            req.session.uid = data._id;

            res.cookie('coolpa_session', data._id, { maxAge: null });

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

exports.recovery = function(req, res) {
    var users = new (require('../models/users'))();
    var recover = require('../models/recovery');
    var fs = require('fs');
    var ses = new (require('../classes/ses'))();
    var ejs = require('ejs');

    users.user( req.body.rusername, function(err, data) {
        if( err || data == undefined ) {
            res.render('start', {
                user: req.session.uid,
                beta_notification: '',
                auth_notification: '',
                recover_notification: 'Your email or username not exists.'
            });
        } else {
            var time = (new Date()).getTime();

            var code = users.hashPass( 'Password_' + data.email + '_Recovery_' + time + '_Coolpa' );

            recover.add( {
                user: data._id,
                email: data.email,
                code: code
            }, function(err) {
                fs.readFile('views/recover_template.html', 'UTF-8', function(err, html) {
                    ses.get().send({
                        from: 'Coolpa.net <info@coolpa.net>',
                        to: [data.email],
                        subject: 'Password recovery - Coolpa.net',
                        body: {
                            html: ejs.render(html, {
                                uid: data._id,
                                code: code
                            })
                        }
                    });

                    res.render('start', {
                        user: req.session.uid,
                        beta_notification: '',
                        auth_notification: '',
                        recover_notification: 'We sent you an email to recover your password.'
                    });
                });
            });
        }
    } );
};

exports.password_recovery = function(req, res) {
    var users = new (require('../models/users'))();
    var recover = require('../models/recovery');

    if( req.body.code == undefined ) {
        recover.get( req.params.code, function(err, data) {
            if( err || data == undefined || data == null ) {
                req.session.auth_notification = "Your code doesn't match with our database.";
                res.redirect('/');
            } else {
                res.render('password_recovery', {
                    user: false,
                    code: req.params.code,
                    password_notification: ''
                });
            }
        } );
    } else {
        recover.get( req.body.code, function(err, data) {
            if( err || data == undefined || data == null ) {
                req.session.auth_notification = "Your code doesn't match with our database.";
                res.redirect('/');
            } else {
                if( req.body.password != "" && req.body.password == req.body.repeatpassword ) {
                    users.update( data.user, {
                        password: users.hashPass( req.body.password )
                    }, function() {
                        recover.remove(req.body.code, function(err) {
                            req.session.auth_notification = "Your password has been changed. Please access with the new one.";
                            res.redirect('/');
                        });
                    } );
               } else {
                    res.render('password_recovery', {
                        user: false,
                        code: req.body.code,
                        password_notification: 'The passwords do not match.'
                    });
               }
            }
        } );
    }
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
                auth_notification: '',
                recover_notification: ''
            });
        });
    }
};

exports.mobile_auth = function(req, res) {
    var Users = require('../models/users');
    
    var User = new Users();
    console.log(req.body);
    
    User.auth( req.body.username, req.body.password, function(data) {
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

exports.mobile_newest = function(req, res) {
    factories.mobile_security(req, res, function(request, response){
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
    factories.mobile_security(req, res, function(request, response){
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
            var folder = dirname + 'public/avatars/' + data._id + '/';
            var ffolder = data._id + '/';

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
    var s3 = new (require('../classes/s3'))();

    users.user(req.params.username, function(err, data) {
        if( data == null ) {
            res.end();
        } else {
            var image = "";

            if( req.params.file == 'avatar.original.jpg' ) {
                image = data.images.original;
            } else if( req.params.file == 'avatar.square.jpg' ) {
                image = data.images.square;
            } else {
                image = data.images.top;
            }

            s3.get().get( image ).on('response', function(response){
                res.set(response.headers);
                response.on('data', function(chunk){
                    res.write(chunk);
                });
                response.on('end', function() {
                    res.end();
                });
            }).end();
        }
    });    
};

exports.images = function(req, res) {
    var s3 = new (require('../classes/s3'))();

    s3.get().get('/images/' + req.params.file).on('response', function(response){
        res.set(response.headers);
        response.on('data', function(chunk){
            res.write(chunk);
        });
        response.on('end', function() {
            res.end();
        });
    }).end();
    //res.redirect('https://coolpa.s3.amazonaws.com/images/' + req.params.file );
};

exports.mobile_message = function(req, res) {
    console.log(req.body);
    mobile_security(req, res, function(request, response){

        var s3 = new (require('../classes/s3'))();
        var fs = require('fs');

        var imgs = [];
        if( req.files.image != undefined ) {
            if( req.files.image.length > 0 ) {
                var dirname = __dirname.replace('routes', '');

                var name = (new Date()).getTime().toString(16) + '.jpg';
                console.log(name  );
                imgs.push(name);

                var tmp = dirname + 'public/temp/' + name;
                var easyimg = require('easyimage');

                fs.readFile(req.files.image.path, function (err, data) {
                    if (err) throw err;
                    //console.log( new Buffer( data.toString(), 'base64').toString() );
                    fs.writeFile(tmp, new Buffer( data.toString(), 'base64').toString('binary'), 'binary', function(err) {
                        if (err) throw err;
                        console.log("Saved to: " + tmp );

                        easyimg.convert({
                            src: tmp, 
                            dst: tmp, 
                            quality:80
                        }, function(err, image) {
                            if (err) throw err;

                            s3.get().putFile(tmp, 'images/' + name, { 'x-amz-acl': 'public-read' }, function(err, rs){
                                fs.unlink(tmp, function(){});
                            });
                        });
                    });
                });
            }
        }

        factories.message_factory(request, response,
            {
                uid: req.body.username,
                message: req.body.message,
                public: (req.body.public == 68),
                reply_to: ( req.body.reply_to == undefined || req.body.reply_to == '-1' || req.body.reply_to == "" ) ? -1 : req.body.reply_to,
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

    factories.message_factory(req, res, {
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

// Si o si totalmente ajax
exports.connect = function(req, res) {
    if( req.session.uid == undefined ) {
        req.session.auth_notification = 'You must be logged in to connect with other user.';
        req.session.back = '/connect/' + req.params.username;

        res.redirect('/');
    } else {
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
    }
};

exports.conversation = function(req, res) {
    if( req.session.uid == undefined ) {
        res.redirect('/');
    } else {
        factories.conversation_factory([], req.params.mid, req, res, function(msgs, request, response) {
            var users = new (require('../models/users'))();

            users.user( request.session.uid, function(err, data) {
                response.render('conversation', {
                    user: request.session.uid,
                    username: '', 
                    user_data: data,
                    messages: msgs
                });
            });
        });
    }
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
            var fs = require('fs');
            var ses = new (require('../classes/ses'))();
            var ejs = require('ejs');
            var users = new (require('../models/users'))();
            var messages = new (require('../models/messages'))();
        
            messages.get(req.body.mid, function(err, msg) {
                users.user(msg.sender, function(err, data){
                    if( data != undefined ) {
                        fs.readFile('views/favorite_template.html', 'UTF-8', function(err, html) {
                            ses.get().send({
                                from: 'Coolpa.net <info@coolpa.net>',
                                to: [data.email],
                                subject: req.session.uid + ' favorited on of your messages on Coolpa',
                                body: {
                                    html: ejs.render(html, {
                                        username: data._id, 
                                        uid: req.session.uid,
                                        message: msg.message
                                    })
                                }
                            });
                        });
                    }
                });
            });

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
    var users = new (require('../models/users'))();

    var username = req.params.username;

    users.user( username, function(err, data) {
        if( data == null ) {
            req.session.auth_notification = 'The user not exists';

            res.redirect('/');
        } else if( data.public == false && req.session.uid == undefined ) {
            req.session.auth_notification = 'The user you request is private. Please login to see the user.';
            req.session.back = '/users/' + req.params.username;

            res.redirect('/');
        } else {
            var messages = new (require('../models/messages'))();
    
            messages.find( data._id, [], new Date(), function(err, docs) {
                messages.count(data._id, [], function(err, cnt) {
                    users.user( req.session.uid, function(err, actual) { // Get the actual user!!!
                        // Just for unknown user.
                        if( actual == null ) {
                            actual = {
                                connections : []
                            };
                        }
                        users.connections( data._id, function(err, conns) {
                            res.render('user_view', {
                                user: req.session.uid,
                                username: data._id,
                                data: data,
                                messages: docs,
                                count: cnt,
                                connections: data.connections.length,
                                connecteds: conns.length,
                                mustConnect: (data._id != req.session.uid),
                                isConnected: (actual.connections.indexOf(data._id) > -1)
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

exports.mobile_start = function(req, res) {
    factories.mobile_security(req, res, function(request, response){
        factories.home_factory(request.body.username, function(data){
            response.json(data);
        });
    });
};

exports.start = function(req, res) {
    if( req.session.uid == undefined ) {
        res.redirect('/');
    } else {
        factories.security(req, res, function(req, res) {
            var messages = new (require('../models/messages'))();
            var users = new (require('../models/users'))();

            users.user( req.session.uid, function(err, data) {
                messages.find( req.session.uid, data.connections.slice(0), new Date(), function(err, docs) {
                    messages.count(req.session.uid, [], function(err, cnt) {
                        messages.recommendationsByMessages(function(recommendations) {
                            users.connections( req.session.uid, function(err, conns) {

                                var autocomplete = "[";
                                for( var i = 0 ; i < data.connections.length ; i++ ) {
                                    //var obj = "{'id':'" + data.connections[i] + "', 'name':':" + data.connections[i] + "', 'avatar': '/avatars/" + data.connections[i] + "/avatar.square.jpg" + "', 'icon':'" + "', 'type':'contact'}";
                                    var obj = '"' + data.connections[i] + '"';

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
                                    messages: docs,
                                    count: cnt,
                                    connections: data.connections.length,
                                    connecteds: conns.length,
                                    autocomplete: autocomplete,
                                    recommendations: recommendations,
                                    section: 'start'
                                }); 
                            }); 
                        });
                    } );
                });
            } );
        });
    }
};

exports.mobile_privates = function(req, res) {
    factories.mobile_security(req, res, function(request, response){
        factories.privates_factory(request.body.username, function(data){
            response.json(data);
        });
    });
};

exports.messages = function(req, res) {
    if( req.session.uid == undefined ) {
        res.redirect('/');
    } else {
        factories.security(req, res, function(req, res) {
            var messages = new (require('../models/messages'))();
            var users = new (require('../models/users'))();
        
            users.user( req.session.uid, function(err, data) {
                messages.privates( req.session.uid, new Date(), function(err, docs) {
                    messages.count(req.session.uid, [], function(err, cnt) {
                        users.connections( req.session.uid, function(err, conns) {

                            var autocomplete = "[";
                            for( var i = 0 ; i < data.connections.length ; i++ ) {
                                var obj = "'" + data.connections[i] + "'";

                                if( i < (data.connections.length - 1) ) { obj += ","; }

                                autocomplete += obj;
                            }
                            autocomplete += "]";

                            res.render('privates', {
                                user: req.session.uid,
                                autocomplete: autocomplete,
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
        });
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

exports.mobile_mentions = function(req, res) {
    factories.mobile_security(req, res, function(request, response){
        factories.mentions_factory(request.body.username, function(data){
            response.json(data);
        });
    });
};

exports.mentions = function(req, res) {
    if( req.session.uid == undefined ) {
        res.redirect('/');
    } else {
        factories.security(req, res, function(req, res) {
        var messages = new (require('../models/messages'))();
        var users = new (require('../models/users'))();
        
        users.user( req.session.uid, function(err, data) {
            messages.mentions( req.session.uid, new Date(), function(err, docs) {
                messages.count(req.session.uid, [], function(err, cnt) {
                    users.connections( req.session.uid, function(err, conns) {

                    	var autocomplete = "[";
                    	for( var i = 0 ; i < data.connections.length ; i++ ) {
                    		//var obj = "{'id':'" + data.connections[i] + "', 'name':':" + data.connections[i] + "', 'avatar': '/avatars/" + data.connections[i] + "/avatar.square.jpg" + "', 'icon':'" + "', 'type':'contact'}";
                            var obj = "'" + data.connections[i] + "'";

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
                            recommendations: undefined,
                            section: 'mentions'
                        }); 
                    }); 
                } );
            });
        } );
    });
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
            messages.count(data._id, [], function(err, cnt) {
                users.connections( data._id, function(err, conns) {
                    users.users( data.connections, function(err, reads) {
                        users.user( req.session.uid, function(err, sdata) {
                            res.render('users', {
                                title: 'Reading',
                                user: req.session.uid,
                                user_data: sdata,
                                username: data._id,
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
            messages.count(data._id, [], function(err, cnt) {
                users.connections( data._id, function(err, conns) {
                    users.user( req.session.uid, function(err, sdata) {
                        res.render('users', {
                            title: 'Readers',
                            user: req.session.uid,
                            user_data: sdata,
                            username: data._id,
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
        var invitations = new (require('../models/invitations'))();
        
        var notification = ( req.session.notification == undefined ) ? false : req.session.notification;
        delete req.session.notification;

        users.user( req.session.uid, function(err, data) {
            invitations.getByInviter( data._id, function( err, invites ) {
                res.render('user_profile', {
                    user: req.session.uid,
                    data: data,
                    invites: invites,
                    notification: notification
                });
            });
        });
    }
};

exports.user_data = function(req, res) {
    if( req.session.uid == undefined ) {
        res.redirect('/');
    } else {
        var users = new (require('../models/users'))();

        console.log(req.body);
        
        if( req.body.password != "" && req.body.password == req.body.repeatpassword ) {
            users.update( req.session.uid, {
                name: req.body.name,
                description: req.body.description.substring(0, 139),
                password: users.hashPass( req.body.password ),
                location: req.body.location,
                website: req.body.website,
                public: (req.body.public == undefined) ? false : true,
                email: req.body.email,
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
                location: req.body.location,
                website: req.body.website,
                public: (req.body.public == undefined) ? false : true,
                email: req.body.email,
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
                
                var ffolder = req.session.uid + '/';

                var final_orig = ffolder + (new Date()).getTime() + '_original.jpg';
                var final_square = ffolder + (new Date()).getTime() + '_square.jpg';

                var orig = dirname + 'public/avatars/' + (new Date()).getTime() + '_original.jpg';
                var square = dirname + '/public/avatars/' + (new Date()).getTime() + '_square.jpg';

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
                
                    var ffolder = req.session.uid + '/';

                    var final_orig = ffolder + (new Date()).getTime() + '_top.jpg';

                    var orig = dirname + 'public/avatars/' + (new Date()).getTime() + '_top.jpg';

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
        
        var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

        if( invitations.indexOf(',') == -1 ) {
            if( re.test(invitations) ) {
                emails.push(invitations);
            } else {
                req.session.notification = {
                    type: 'invites',
                    message: 'The email is not valid'
                };
                res.redirect('/profile#invites');
            }
        } else {
            var ems = invitations.split(',');
            console.log(ems);
            for( var i = 0 ; i < ems.length ; i++ ) {
                var email = ems[i].trim();

                if( re.test(email) ) {
                    emails.push(email);
                }
            }
        }

        console.log(emails);
        
        if( emails.length > 0 ) {
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
    }
};

exports.invite_again = function(req, res) {
    var invites = new (require('../models/invitations'))();
    var fs = require('fs');
    var ses = new (require('../classes/ses'))();
    var ejs = require('ejs');

    invites.get( req.params.code, function(err, data) {
        fs.readFile('views/invite_template.html', 'UTF-8', function(err, html) {

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

            req.session.notification = {
                type: 'invite_again',
                message: 'Invitation re-sent to ' + data.email
            };
            res.redirect('/profile#invite_again');
        });
    });
};

exports.invite_remove = function(req, res) {
    var invites = new (require('../models/invitations'))();
    var fs = require('fs');
    var ses = new (require('../classes/ses'))();
    var ejs = require('ejs');

    invites.remove( req.params.code, function(err) {
        res.redirect('/profile#invites');
    });
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
    
    var reg = /^(\w){3,15}$/;
    
    var bdata = req.body;
    var selecteduname = req.body.username.trim();

    console.log("Test " + reg.test(selecteduname) );

    if( reg.test(selecteduname) !== true ) {
        res.render('invitation', {
            user: '',
            data: {
                code: bdata.code,
                email: bdata.email
            },
            username: bdata.username.trim(),
            name: bdata.name,
            notification: {
                type: 'alert-error',
                message: 'The username you select is wrong. A right username must have at least 3 characters, no more than 15 and no spaces.'
            }
        });
    } else if( bdata.password.trim().length == 0 || bdata.repeatpassword.trim().length == 0 || bdata.password != bdata.repeatpassword ) {
        res.render('invitation', {
            user: '',
            data: {
                code: bdata.code,
                email: bdata.email
            },
            username: bdata.username.trim(),
            name: bdata.name,
            notification: {
                type: 'alert-error',
                message: 'The passwords are different'
            }
        });
    } else {
        invites.get(bdata.code, function(err, cdata) {
            if( cdata ) {
                users.find(bdata.username, function(err, usersarray) {
                    if( usersarray.length == 0 )
                    {
                        users.user(cdata.sender, function(error, inviter) {
                            users.create({
                                _id: bdata.username,
                                connections: [],
                                description: '',
                                name: bdata.name,
                                location: '',
                                website: '',
                                public: false,
                                email: bdata.email,
                                notifications: { 
                                    mentions: 1, 
                                    privates: 1, 
                                    readers: 1,
                                    favorites: 1
                                },
                                mobile: {
                                    sessions: [],
                                    devices: []
                                },
                                images : { 
                                    original : bdata.username + '/avatar.original.jpg', 
                                    square : bdata.username + '/avatar.square.jpg', 
                                    top: bdata.username + '/top.jpg' 
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
                                
                                var ffolder = rdt.username + '/';

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
                                                            username: rdt.username,
                                                            password: rdt.password
                                                        })
                                                    }
                                                });

                                                fs.readFile('views/joined_template.html', 'UTF-8', function(err, jhtml) {
                                                    ses.get().send({
                                                        from: 'Coolpa.net <info@coolpa.net>',
                                                        to: [inviter.email],
                                                        subject: rdt.username + ' has joined Coolpa.net',
                                                        body: {
                                                            html: ejs.render(jhtml, {
                                                                username: inviter._id,
                                                                user: rdt.username
                                                            })
                                                        }
                                                    });
                                                });

                                                req.session.uid = rdt.username;

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
                            username: bdata.username,
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
    var messages = new (require('../models/messages'))();
    var users = new (require('../models/users'))();
        
    messages.get(req.params.id, function(err, mdata) {
        var username = mdata.sender;

        if( req.session.uid == undefined ) {
            users.user( username, function(err, data) {
                if( data == null ) {
                    req.session.auth_notification = 'The message not exists.';

                    res.redirect('/');
                } else if( data.public == false ) {
                    req.session.auth_notification = 'The user owner of the message is private. You must be logged in.';
                    req.session.back = '/message/' + req.params.id;
        
                    res.redirect('/');
                } else {
                    res.render('message', {
                        user: req.session.uid,
                        data: mdata
                    }); 
                }
            });
        } else {
            res.render('message', {
                user: req.session.uid,
                data: mdata
            }); 
        }
    });
};

exports.remove_message = function(req, res) {
    if( req.session.uid == undefined ) {
        res.redirect('/');
    } else {
        factories.remove_factory(req.params.id, req.session.uid, req, res, function( deleted, req, res) {
            res.redirect('/');
        });
    }
};

exports.mobile_remove = function(req, res) {
    factories.mobile_security(req, res, function(request, response){
        factories.remove_factory(req.body.id, req.body.username, request, response, function( deleted, req, res) {
            res.json({
                result: deleted
            });
        });
    });
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

/**
*
*/
exports.change_username = function(req, res) {
    // req.session.uid
    // Traer todos lo actual del usuario: usuario, gente que lo tiene, mensajes donde esta mencionado.
    // Copiar usuario
    // Cambiar el sender de sus mensajes
    // Pull y addToSet sobre los usuarios que lo tienen. => disconnect y connect con el nuevo.
    // Mensajes mencionado: replace en el mensaje y cambio de ids. ( actualizar )
    // cambiar req.session.uid

    var username = req.session.uid;
    var new_username = req.body.username;

    var S = require('string');

    var notify = function( percentage, message ) {
        if( GLOBAL.online[username] != undefined ) {
            GLOBAL.online[username].emit('username_change', {
                progress: percentage,
                message: message
            } );
        }
    };

    var messages = new (require('../models/messages'))();
    var users = new (require('../models/users'))();

    users.user( req.session.uid, function(err, user_data) {
        notify(10, 'Processing user...');

        users.connections( user_data._id, function( err, connections ) {
            notify(20, 'Processing connections...');

            messages.allMentions( user_data._id, function(err, mentions) {
                notify(35, 'Processing mentions...');

                for( var i = 0 ; i < mentions.length ; i++ ) {
                    var mention = mentions[i];
                    var mid = mention._id;

                    var ids = mention.ids;
                    ids.splice( mention.ids.indexOf(user_data._id), 1 );
                    ids.push(new_username);

                    messages.update(mid, {
                        message: S(mention.message).replaceAll(':' + user_data._id, ':' + new_username).s,
                        ids : ids
                    }, function(err) {
                        console.log('Updated...');
                    });
                }

                notify(55, 'Processing your messages');
                messages.changeSender(user_data._id, new_username, function(err ) {
                    notify(70, 'Updating to your new username...');

                    for( var c = 0 ; c < connections.length ; c++ ) {
                        console.log('Updating ' + connections[c]._id );
                        users.disconnect( connections[c]._id, user_data._id, function(err) {} );
                        users.connect( connections[c]._id, new_username, function() {} );
                    }

                    notify(90, 'Finishing process...');

                    users.remove(user_data._id, function(err) {
                        notify(92, 'Transfering images (1/3)...');

                        var s3 = new (require('../classes/s3'))();

                        var new_original = user_data.images.original.replace( user_data._id, new_username );
                        var new_square = user_data.images.square.replace( user_data._id, new_username );
                        var new_top = user_data.images.top.replace( user_data._id, new_username );

                        s3.get().copyFile('/' + user_data.images.original, '/' + new_original, function(err, fres) {
                            notify(94, 'Transfering images (2/3)...');

                            s3.get().copyFile('/' + user_data.images.square, '/' + new_square, function(err, fres) {
                                notify(96, 'Transfering images (3/3)...');

                                s3.get().copyFile('/' + user_data.images.top, '/' + new_top, function(err, fres) {
                                    notify(96, 'Transfering images (3/3)...');
                                
                                    s3.get().deleteMultiple([user_data.images.original, user_data.images.square, user_data.images.top], function(err, fres) {
                                        user_data.images.original = new_original;
                                        user_data.images.square = new_square;
                                        user_data.images.top = new_top;

                                        user_data._id = new_username;

                                        users.add(user_data, function(err) {
                                            notify(100, 'Completed');

                                            req.session.uid = new_username;
                                            res.json({
                                                result: true
                                            });
                                        });
                                    });

                                } );    
                            } );        
                        } );
                    })
                });
            } );
        });
    } );
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
                    messages.count(data._id, [], function(err, cnt) {
                        users.connections( data._id, function(err, conns) {
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