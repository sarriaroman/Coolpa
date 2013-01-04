/**
 * Packer code
 */

 // String prototypes
var S = require('string');
S.extendPrototype();

var fs = require('fs'),
	packer = require('./packer');

var type = process.env.TYPE.toLowerCase();
if( type == 'html' ) {
	/* Pack HTML */
	fs.readdir('../views/', function(err, files){
		for( var i = 0 ; i < files.length ; i++ ) {
			fs.readFile('../views/' + files[i], function (err, data) {
  				if (err) throw err;
  				var html_packed = packer.packHTML(data);

				fs.writeFile('../views/' + files[i], html_packed, function() {
					if (err) throw err;
  					console.log('It\'s saved!');
				});
			});
		}
	});
} else if( type == 'css' ) {
	/* Pack CSS */
	//var css_packed = packer.packCSS("send your css content to pack") ;
	console.error('Unsupported');
} else if( type == 'js' ) {
	/* Pack JS */
	//var js_packed = packer.packJS("send your JS content to pack here", "optionnaly send the path of the file for better error reporting");
	console.error('Unsupported');
}