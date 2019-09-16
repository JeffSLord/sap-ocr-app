var express = require("express");
var router = express.Router();
const {
	promisify
} = require('util');
const hdbext = require("@sap/hdbext");
const {
	createConnection
} = require("@sap/hdbext");
const createConnectionProm = promisify(createConnection);
const xsenv = require("@sap/xsenv");
const services = xsenv.getServices({
	hanaConfig: {
		tag: "hana"
	}
});

// let client = await createConnectionProm(services.hanaConfig);
// let prepareProm = await promisify(client.prepare).bind(client);
// let statement = await prepareProm('INSERT INTO "OCR.LINES" VALUES(?,?,?,?)');
// let execProm = await promisify(statement.exec).bind(statement);
// let rows = await execProm([fileName, pageNum, lineNum, line]);

router.get('/', async(req, res) => {
	try {
		
		res.send("ocr, / called." + req.requestTime + req.authInfo.checkLocalScope('Edit'));
	} catch (e) {
		return e;
	}
});

router.post('/lines', async(req, res, next) => {
	console.log("[INFO] Post to /lines");
	let auth = await req.authInfo.checkLocalScope('Edit');
	if (!auth) {
		res.writeHead(403, {
			'Content-Type': 'application/json'
		});
		console.error('[ERROR] User is not authorized.');
		next('[ERROR] User is not authorized.');
		res.end('{}');
	}
	try {
		let fileName = req.body.fileName;
		let pageNum = req.body.pageNum;
		// var lineNum = req.body.lineNum;
		let lines = JSON.parse(req.body.lines);

		let client = await createConnectionProm(services.hanaConfig);
		let prepareProm = await promisify(client.prepare).bind(client);
		let statement = await prepareProm('INSERT INTO "OCR.LINES" VALUES(?,?,?,?)');
		let execProm = await promisify(statement.exec).bind(statement);
		for (var i = 0; i < Object.keys(lines).length; i++) {
			let row = await execProm([fileName, pageNum, i, lines[i]]);
		}
		// let rows = await execProm([fileName, pageNum, lineNum, line]);
		console.log("[SUCCESS] ", fileName, pageNum);
		res.status(200).send("[INFO] SUCCESS");
	} catch (e) {
		console.error(res.status(500).send("[ERROR] " + e));
	}
});
router.delete('/line', async(req, res, next) => {
	console.log("[INFO] Delete to /line.");
	let auth = await req.authInfo.checkLocalScope('Edit');
	if (!auth) {
		res.writeHead(403, {
			'Content-Type': 'application/json'
		});
		console.error('[ERROR] User is not authorized.');
		next('[ERROR] User is not authorized.');
		res.end('{}');
	} else {
		try {
			let fileName = req.body.fileName;
			let client = await createConnectionProm(services.hanaConfig);
			let prepareProm = await promisify(client.prepare).bind(client);
			let statement = await prepareProm('CALL "SP_DELETE_LINES" (?)');
			let execProm = await promisify(statement.exec).bind(statement);
			execProm({
				IN_FILE: fileName
			});
			res.send("[SUCCESS] Delete lines successful.");
		} catch (e) {
			console.error(res.status(500).send("[ERROR] " + e));
		}
	}
});
router.post('/page', async(req, res, next) => {
	console.log('[INFO] Post to /page');
	var fileName = req.body.fileName;
	var text = req.body.text;
	try {
		var fileName = req.body.fileName;
		var text = req.body.text;
		let client = await createConnectionProm(services.hanaConfig);
		let prepareProm = await promisify(client.prepare).bind(client);

		// // let statement = await prepareProm('CALL "SP_DELETE_PAGE" (?)');
		// let statement2 = await prepareProm(`DELETE FROM "OCR.PAGES" WHERE FILENAME = '${fileName}'`);
		// let execProm2 = await promisify(statement2.exec).bind(statement2);
		// await execProm2();
		// console.log("[INFO] Deletion step complete.");
		// // await execProm({IN_FILE:fileName});

		let statement2 = await prepareProm('DELETE FROM "OCR.PAGES" WHERE FILENAME = ?');
		let execProm2 = await promisify(statement2.exec).bind(statement2);
		await execProm2([fileName]);

		let statement = await prepareProm('INSERT INTO "OCR.PAGES" VALUES(?,?)');
		let execProm = await promisify(statement.exec).bind(statement);
		let rows = await execProm([fileName, text]);
		// client.end();
		console.log(res.status(200).send("[SUCCESS] Posting to /page."));
	} catch (e) {
		console.error(res.status(500).send("[ERROR] " + e));
	}
});

module.exports = router;