/**
 * Packer code
 */

 // String prototypes
var S = require('string');
S.extendPrototype();

// Check
var proto_test = ' Trim proto ';
console.log( proto_test.trim() );

var fs = require('fs'),
	packer = require('./packer');

var type = process.env.TYPE.toLowerCase();
if( type == 'html' ) {
	/* Pack HTML */
	fs.readdir('../views/', function(err, files){
		console.log(files);
		for( var i = 0 ; i < files.length ; i++ ) {
			console.log("Current: " + files[i]);

			var html_packed = S( fs.readFileSync('../views/' + files[i]) ).s;
  			
  			html_packed = html_packed.replace(/(\r\n|\r|\n)/g, "<br />");
  			html_packed = html_packed.collapseWhitespace();

  			console.log(html_packed.s);

			fs.writeFileSync('../views/' + files[i], html_packed.s);
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