"use strict";

// $.import("xsjs", "session");
// var SESSIONINFO = $.xsjs.session;

function Create(param) {
	var after = param.afterTableName;
	var selectStmt = param.connection.prepareStatement("select * from \"" + after + "\"");
	var rs = selectStmt.executeQuery();
	// var deleted = false;

	while (rs.next()) {
		var fileName = rs.getString(1);
		var text = rs.getString(2);
		// if (!deleted) {
		// 	var deleteStmt = param.connection.prepareStatement("delete from \"OCR.PAGES\" where FILENAME = ?");
		// 	deleteStmt.setString(1, fileName);
		// 	deleteStmt.executeQuery();
		// 	deleteStmt.close();
		// 	deleted = true;
		// }
		var insert_string = "insert into \"OCR.PAGES\" values (?,?)";
		var insertStmt = param.connection.prepareStatement(insert_string);
		insertStmt.setString(1, fileName);
		insertStmt.setString(2, text);
		insertStmt.executeQuery();
		insertStmt.close();
	}

	// var insertStmt = param.connection.prepareStatement(insert_string);
	// var rs = insertStmt.executeQuery();
	// console.log(rs);
}
function BeforeCreate(param){
	var after = param.afterTableName;
	var selectStmt = param.connection.prepareStatement("select * from \"" + after + "\"");
	var rs = selectStmt.executeQuery();
	console.log(rs);
	while(rs.next()){
		var fileName = rs.getString(1);
		var deleteStmt = param.connection.prepareStatement("delete from \"OCR.PAGES\" where FILENAME = ?");
		deleteStmt.setString(1, fileName);
		deleteStmt.executeQuery();
		deleteStmt.close();
	}
}