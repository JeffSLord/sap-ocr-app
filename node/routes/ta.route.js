var express = require("express");
var router = express.Router();
const {
	promisify
} = require('util');
const hdbext = require("@sap/hdbext");
const {
	createConnection
} = require("@sap/hdbext");
const ta = require("@sap/textanalysis");
const createConnectionProm = promisify(createConnection);
const xsenv = require("@sap/xsenv");
const services = xsenv.getServices({
	hanaConfig: {
		tag: "hana"
	}
});

router.get('/', async(req, res) => {
	res.send("worked.");
});

router.post('/analyze', async(req, res, next) => {
	console.log("[INFO] Post to /analyze");
	// let auth = await req.authInfo.checkLocalScope('Edit');
	// if (!auth) {
	// 	res.writeHead(403, {
	// 		'Content-Type': 'application/json'
	// 	});
	// 	console.error('[ERROR] User is not authorized.');
	// 	next('[ERROR] User is not authorized.');
	// 	res.end('{}');
	// }
	// try {
	// let client = await createConnectionProm(services.hanaConfig);
	// 	const values = {
	// 		DOCUMENT_BINARY: null,
	// 		DOCUMENT_TEXT: "This is a test. I love text analysis.",
	// 		LANGUAGE_CODE: "EN",
	// 		MIME_TYPE: null,
	// 		TOKEN_SEPARATORS: null,
	// 		LANGUAGE_DETECTION: null,
	// 		CONFIGURATION_SCHEMA_NAME: null,
	// 		CONFIGURATION: "EXTRACTION_CORE_VOICEOFCUSTOMER",
	// 		RETURN_PLAINTEXT: 0
	// 	};
	// 	let analyzeProm = await promisify(ta.analyze);
	// 	let analyze = await analyzeProm(values, client);
	// 	console.log(analyze);
	// } catch (e) {
	// 	console.error(res.status(500).send("[ERROR] " + e));
	// }
	var config = "EXTRACTION_CORE_VOICEOFCUSTOMER";
	const values = {
		DOCUMENT_BINARY: null,
		DOCUMENT_TEXT: req.body.text,
		LANGUAGE_CODE: "EN",
		MIME_TYPE: null,
		TOKEN_SEPARATORS: null,
		LANGUAGE_DETECTION: null,
		CONFIGURATION_SCHEMA_NAME: null,
		CONFIGURATION: req.body.config,
		RETURN_PLAINTEXT: 0
	};

	hdbext.createConnection(services.hanaConfig, (err, client) => {
		if (err) {
			console.error(err);
			res.status(500).send("[ERROR] ", err);
		}
		ta.analyze(values, client, (err, params, rows) => {
			if (err) {
				return console.error("Error with Text Analysis");
			} else {
				res.status(200).send(rows);
			}
		});
	});

});
module.exports = router;