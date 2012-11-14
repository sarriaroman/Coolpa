var ses = (function() {
    function ses() {
        var AmazonSES = require('amazon-ses');
        this.ses = new AmazonSES('AKIAJ5EWXPYOF3OCUUBA', '1gIlCAfkheaOym+fXeu4pM51Ea8Pv7obDpXQxKXj');
    };
    
    ses.prototype.get = function(id) {
        return this.ses;
    }
    
    return ses;
})();

module.exports = ses;