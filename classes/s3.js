var s3 = (function() {
    function s3() {
        var knox = require('knox');
        this.client = knox.createClient({
    		key: 'AKIAJ5EWXPYOF3OCUUBA', 
    		secret: '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', 
    		bucket: 'coolpa'
		});
    };
    
    s3.prototype.get = function(id) {
        return this.client;
    }
    
    return s3;
})();

module.exports = s3;