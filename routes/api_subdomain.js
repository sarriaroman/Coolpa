exports.index = function(req, res) {
	console.log(req.session);
    res.end('Hello World');
};