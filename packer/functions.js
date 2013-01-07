exports.rmDir = function(dirPath) {
	var fs = require('fs');

	try { var files = fs.readdirSync(dirPath); }
	catch(e) { 
		console.trace(e);
		return; 
	}
	if (files.length > 0)
		for (var i = 0; i < files.length; i++) {
			var filePath = dirPath + '/' + files[i];
			if (fs.statSync(filePath).isFile())
				fs.unlinkSync(filePath);
			else
				rmDir(filePath);
		}
		fs.rmdirSync(dirPath);
};