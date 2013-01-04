/*
* Packer
*/

var htmlPacker = require('html-minifier').minify,
    jsParser = require("uglify-js").parser,
    jsPacker = require("uglify-js").uglify,
    cssPacker = require('uglifycss') ;

(function (exports) {
    if (typeof module !== "undefined" && typeof module.exports !== "undefined") {
        module.exports = exports;
    } else {
        window.packer = exports;
    }
}(function () {
      var exports = {};

    /* Pack CSS content */
    exports.packCSS = function(content) {
        return cssPacker.processString(content) ;
    } ;

    /* Pack HTML content  */
    exports.packHTML = function(content) {
        return htmlPacker(content, { 
            removeComments: true, 
            collapseWhitespace: false, 
            removeEmptyAttributes: true 
        }) ;
    } ;

    /* Pack JS content */
    exports.packJS = function(content, itemPath) {

        /* Try to parse content */
        try {
            var ast = jsParser.parse(content); /* parse code and get the initial AST */
            ast = jsPacker.ast_mangle(ast); /* get a new AST with mangled names */
            ast = jsPacker.ast_squeeze(ast); /* get an AST with compression optimizations */
        } 

        /* Report error */
        catch(e) {     

            /* Set a compile error flag */
            this.compileError = true ;

            /* Output error */
            console.log('-------------------------') ;
            if ( itemPath ) {
                console.log(" /* Path : "+itemPath+" */ ");
            }
            console.log(content.split("\n").slice(e.line-10, e.line-1).join("\n")) ;
            console.log(" /******** "+e.line+" >> "+e.message+" ********/") ;
            console.log((content.split("\n").slice(e.line-1, e.line).join("\n"))) ;
            console.log(" /***********************************************************/") ;
            console.log(content.split("\n").slice(e.line, e.line+10).join("\n")) ;

            /* Say something (designed for OSX) */
            try {
                require('child_process').exec('say -v Alex -r 200 "Houston ? Yeah a problem in code..."') ;    
            } catch(e) {}
        } 

        return jsPacker.gen_code(ast); // compressed code here

    } ;

      return exports;
}()));