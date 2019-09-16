"use strict";

// $.import("xsjs", "session");
// var SESSIONINFO = $.xsjs.session;

function Create(param) {
	console.log("Creating line_service");
	var after = param.afterTableName;
	var selectStmt = param.connection.prepareStatement("select * from \"" + after + "\"");
	var rs = selectStmt.executeQuery();
	// var deleted = false;
	
	
	while(rs.next()){
		var fileName = rs.getString(1);
		var pageNumber = rs.getString(2);
		var lineNumber = rs.getString(3);
		var text = rs.getString(4);
		// console.log(text);
		
		// if(!deleted){
		// 	var deleteStmt = param.connection.prepareStatement("delete from \"OCR.LINES\" where FILENAME = ?");
		// 	deleteStmt.setString(1, fileName);
		// 	deleteStmt.executeQuery();
		// 	deleteStmt.close();
		// 	deleted = true;
		// }
		var insert_string = "insert into \"OCR.LINES\" values (?,?,?,?)";
		var insertStmt = param.connection.prepareStatement(insert_string);
		insertStmt.setString(1, fileName);
		insertStmt.setString(2, pageNumber);
		insertStmt.setString(3, lineNumber);
		insertStmt.setString(4, text);
		insertStmt.executeQuery();
		insertStmt.close();
	}
}
function Delete(param){
	var before = param.beforeTableName;
	var selectStmt = param.connection.prepareStatement("select * from \"" + before + "\"");
	var rs = selectStmt.executeQuery();
	console.log("DELETE: ", rs);
	while(rs.next()){
		var fileName = rs.getString(1);
		var deleteStmt = param.connection.prepareStatement("delete from \"OCR.LINES\" where FILENAME = ?");
		deleteStmt.setString(1, fileName);
		deleteStmt.executeQuery();
		deleteStmt.close();
	}
}
function BeforeCreate(param){
	// console.log("Creating line_service");
	var after = param.afterTableName;
	var selectStmt = param.connection.prepareStatement("select * from \"" + after + "\"");
	var rs = selectStmt.executeQuery();
	// var deleted = false;

	while(rs.next()){
		var fileName = rs.getString(1);
		var pageNumber = rs.getInt(2);
		var lineNumber = rs.getInt(3);
		var text = rs.getString(4);
		var deleteStmt = param.connection.prepareStatement("delete from \"OCR.LINES\" where FILENAME = ? and LINENUMBER >= ?");
		deleteStmt.setString(1, fileName);
		deleteStmt.setInt(2, lineNumber);
		console.log("DELETE STMT: ", deleteStmt);
		console.log(fileName);
		console.log(lineNumber);
		deleteStmt.executeQuery();
		deleteStmt.close();
	}
}