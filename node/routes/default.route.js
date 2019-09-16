var express = require("express");
var router = express.Router();
var request = require('request');

// Handle get at path '/'
router.get("/", (req, res) => {
	console.log(req);
	if(!req.authInfo.checkLocalScope('Read')){
		res.writeHead(403,{'Content-Type':'application/json'});
		console.error('[ERROR] User is not authorized.');
		res.end('{}');
	}
	// console.log(req.authInfo.hasAttributes('FILENAME'));
	// req.authInfo.listAttributes();
	res.send(`Welcome to my application, ${req.user.id}.`);
	// res.send(`Welcome to node_ocr`);
});

router.get("/ip", (req, res) => {
	request("http://httpbin.org/ip", (err, res2, body) => {
		res.write(`Current IP address is: \n`);
		res.write(body);
		res.end();
	});
});

module.exports = router;