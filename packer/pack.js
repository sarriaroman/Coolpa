/**
 * Packer code
 */

 // String prototypes
var S = require('string');
S.extendPrototype();

console.warn('Starting resource compression');
console.warn('This will take a while\n');

var fs = require('fs'),
	packer = require('./packer'),
	functions = require('./functions');

console.info('Ckecking Views directory\n');
if( fs.existsSync('../views/') ) {
	functions.rmDir('../views/');
	//fs.rmdirSync('../views/');
}

fs.mkdirSync('../views/');

/* Pack HTML */
var files = fs.readdirSync('../original_views/');

for( var i = 0 ; i < files.length ; i++ ) {
	console.log("Current: " + files[i]);

	var html_packed = S( fs.readFileSync('../original_views/' + files[i]) ).s;
  			
  	html_packed = html_packed.replace(/(\r\n|\r|\n)/g, '');
  	html_packed = html_packed.replace(/<!--[\s\S]*?-->/g, '');
  	//html_packed = html_packed.replace(/\/\*[\s\S]*?\*\//g, '');
  	html_packed = html_packed.collapseWhitespace();

	fs.writeFileSync('../views/' + files[i], html_packed.s);
}

console.info('Processing CSS');
/* Pack CSS */
//var css_packed = packer.packCSS("send your css content to pack") ;
console.error('Unsupported');

console.info('Processing JS');
/* Pack JS */
//var js_packed = packer.packJS("send your JS content to pack here", "optionnaly send the path of the file for better error reporting");
console.error('Unsupported');