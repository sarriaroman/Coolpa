
/**
 * Module dependencies.
 * 
 * sudo iptables -A PREROUTING -t nat -i eth0 -p tcp --dport 80 -j REDIRECT --to-port 3000
 */

var express = require('express')
, routes = require('./routes')
, api = require('./routes/api_subdomain')
, http = require('http')
, path = require('path')
, MongoStore = require('express-session-mongo');

var app = express();

var server = http.createServer(app),
    io = require('socket.io').listen(server);

io.set('browser client minification', true);
io.set('browser client etag', true);

app.engine('html', require('ejs').renderFile);

app.configure(function(){
    app.use(express.compress());
    app.set('port', process.env.PORT || 3000);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'html');
    app.use(express.favicon(__dirname + '/favicon.ico'));
    app.use(express.logger('dev'));
    app.disable('x-powered-by');
    app.use(express.bodyParser({
        keepExtensions: true
    }));
    app.use(express.methodOverride());
    app.use(express.cookieParser('741b09105b235f2f8fa0511a1229f48e'));
    app.use(express.session({
    	store: new MongoStore({
    		db: 'coolpa-sessions'
    	})
    }));
    app.use(app.router);
    app.use(express.static(path.join(__dirname, 'public')));
});

// Subdomain processor.
app.all('*', function(req, res, next){
    if(req.headers.host.indexOf('www') != -1) {
        res.redirect('coolpa.net');

        return;
    }

    if(req.headers.host == 'api.coolpa.net' || req.headers.host == 'api.coolpa.net:3001')
        req.url = '/api_subdomain' + req.url;
    
    next(); 
}); 

app.configure('development', function(){
    app.use(express.errorHandler({ 
        dumpExceptions: true, 
        showStack: true 
    }));
});

app.configure('production', function () {
    app.use(express.errorHandler()); 
});

String.prototype.parseURL = function() {
	return this.replace(/[A-Za-z]+:\/\/[A-Za-z0-9-_]+\.[A-Za-z0-9-_:%&~\?\/.=]+/g, function(url) {
		return '<a href="' + url + '" target="_BLANK">' + url + '</a>'; //url.link(url);
	});
};

String.prototype.parseUsername = function() {
    return this.replace(/[:]+[A-Za-z0-9-_]+/g, function(u) {
        var username = u.replace(":","").toLowerCase();
        if( username.length >= 3 ) {
        	return u.link("http://coolpa.net/users/"+username);
        } else {
        	return u;
        }
    });
};

String.prototype.parseSearches = function() {
    return this.replace(/[#]+[A-Za-z0-9-_]+/g, function(u) {
        var username = u.replace("#","").toLowerCase();
        
        return u.link("http://coolpa.net/search/"+username);
    });
};

String.prototype.trimString = function() {
    return this.replace(/^\s+/g,'', function(u) {
        return u.replace(/\s+$/g,'');
    });
};

GLOBAL.online = new Array();

io.sockets.on('connection', function (socket) {
    socket.on('username', function(username) {
        GLOBAL.online[username] = socket;
    });
});

// GET
app.get('/', routes.index);
app.get('/about', routes.about);
app.get('/terms', routes.terms);
app.get('/start', routes.start);
app.get('/mentions', routes.mentions);
app.get('/privates', routes.messages);
app.get('/conversation/:mid', routes.conversation);
app.get('/reading/:username', routes.reading);
app.get('/readers/:username', routes.readers);
app.get('/message/:id', routes.showmessage);
app.get('/profile', routes.profile);
app.get('/signout', routes.signout);
app.get('/favorites', routes.favorites);
app.get('/users/:username', routes.user);
app.get('/connect/:username', routes.connect);
app.get('/disconnect/:username', routes.disconnect);
app.get('/invitation/:code', routes.invitation);
app.get('/remove/:id', routes.remove_message);
app.get('/hide/:id', routes.hide_message);
app.get('/unhide/:id', routes.unhide_message);
app.get('/search/:token', routes.search);
app.get('/avatars/:username/:file', routes.avatars);
app.get('/i/:file', routes.images);
app.get('/invite_again/:code', routes.invite_again);
app.get('/invite_remove/:code', routes.invite_remove);

// POST
app.post('/auth', routes.auth);
app.post('/request_beta', routes.request_beta);
app.post('/message', routes.message);
app.post('/more', routes.more);
app.post('/upload_avatar', routes.upload_avatar);
app.post('/upload_top', routes.upload_top);
app.post('/user_data', routes.user_data);
app.post('/invite', routes.invite);
app.post('/invitation', routes.invitation_data);
app.post('/search', routes.search);
app.post('/favorite', routes.favorite);
app.post('/unfavorite', routes.unfavorite);


// Temporal
//app.get('/update_users', routes.create_images);

// API's
app.post('/api/login', routes.mobile_auth);
app.post('/api/start', routes.mobile_start);
app.post('/api/mentions', routes.mobile_mentions);
app.post('/api/privates', routes.mobile_privates);
app.post('/api/message', routes.mobile_message);
app.post('/api/newest', routes.mobile_newest);
app.post('/api/remove', routes.mobile_remove);
app.post('/api/more', routes.mobile_more);
app.post('/api/push', routes.mobile_push);

// api_subdomain
app.get('/api_subdomain/', api.index);

server.listen(app.get('port'), function(){
    console.log("Express server listening on port " + app.get('port'));
});

// Exception Handling
process.on('uncaughtException', function (err) {
	console.trace(err);
	
    process.exit(0);
});