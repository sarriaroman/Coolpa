
/**
 * Module dependencies.
 * 
 * sudo iptables -A PREROUTING -t nat -i eth0 -p tcp --dport 80 -j REDIRECT --to-port 3000
 */

var express = require('express')
, routes = require('./routes')
, http = require('http')
, path = require('path')
, MongoStore = require('express-session-mongo');

var app = express();

app.engine('html', require('ejs').renderFile);

app.configure(function(){
    app.set('port', process.env.PORT || 3000);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'html');
    app.use(express.favicon());
    app.use(express.logger('dev'));
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
	app.use(express.compress());
});

app.configure('development', function(){
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
        	return username;
        }
    });
};

String.prototype.parseSearches = function() {
    return this.replace(/[#]+[A-Za-z0-9-_]+/g, function(u) {
        var username = u.replace("#","").toLowerCase();
        
        return u.link("http://coolpa.net/search/"+username);
    });
};

// GET
app.get('/', routes.index);
app.get('/start', routes.start);
app.get('/mentions', routes.mentions);
app.get('/privates', routes.messages);
app.get('/reading/:username', routes.reading);
app.get('/readers/:username', routes.readers);
app.get('/message/:id', routes.showmessage);
app.get('/profile', routes.profile);
app.get('/signout', routes.signout);
app.get('/users/:username', routes.user);
app.get('/connect/:username', routes.connect);
app.get('/disconnect/:username', routes.disconnect);
app.get('/invitation/:code', routes.invitation);
app.get('/remove/:id', routes.remove_message);
app.get('/hide/:id', routes.hide_message);
app.get('/unhide/:id', routes.unhide_message);
app.get('/search/:token', routes.search);

// POST
app.post('/auth', routes.auth);
app.post('/message', routes.message);
app.post('/more', routes.more);
app.post('/upload_image', routes.upload_image);
app.post('/user_data', routes.user_data);
app.post('/invite', routes.invite);
app.post('/invitation', routes.invitation_data);
app.post('/search', routes.search);

// API's
app.post('/api/login', routes.mobile_auth);

http.createServer(app).listen(app.get('port'), function(){
    console.log("Express server listening on port " + app.get('port'));
});

// Exception Handling
process.on('uncaughtException', function (err) {
	console.log(err);
	var ses = new (require('./classes/ses'))();
	
	ses.get().send({
		from: 'Coolpa.net <info@coolpa.net>',
		to: ['agustin478@gmail.com'],
		subject: 'Important: Error at ' + (new Date()).toUTCString(),
		body: {
			text: err.toString()
		}
	});
	
    process.exit(0);
});