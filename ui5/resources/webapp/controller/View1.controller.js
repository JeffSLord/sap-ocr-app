sap.ui.define(["sap/ui/core/mvc/Controller"], function (Controller) {
	"use strict";
	return Controller.extend("ocr.ui5.controller.View1", {
		/**
		 *@memberOf sandbox.ui5.controller.View1
		 */
		onInit: function () {
			var oModel = this.getOwnerComponent().getModel("ocrModel");
			// var oModel = new sap.ui.model.odata.v2.ODataModel({
			// 	serviceUrl: "/xsodata/ocr.xsodata/",
			// 	defaultUpdateMethod: "sap.ui.model.odata.UpdateMethod.Put"
			// 		// synchronizationMode : "None"
			// 		// "useBatch" : false
			// });
			this.getView().setModel(oModel, "ocrModel");

			console.log("INITING");
			var oModel = new sap.ui.model.json.JSONModel();
			oModel.setData({
				appName: "Demo OCR Application",
				test2: "application"
			});
			this.getView().setModel(oModel, "appModel");
			// This model 
			var oModel = new sap.ui.model.json.JSONModel();
			oModel.setData({
				fileName: "",
				text: "",
				cleanText: "",
				lines: [],
				cleanLines: []
			});
			this.getView().setModel(oModel, "currentFileModel");
			// var oModel = new sap.ui.model.odata.v2.ODataModel("/xsodata/ocr.xsodata/");
			// this.getView().setModel(oModel, "lineModel");
			var oTable = this.getView().byId("sTable");
			oTable.setModel(this.getView().getModel("ocrModel"));
			var oTable2 = this.getView().byId("sTable2");
			oTable2.setModel(this.getView().getModel("ocrModel"));
		},
		onAfterRendering: function () {
			console.log("done rendering.");
		},
		onDataReceived: function () {
			var oTable = this.byId("sTable");
		},
		action: function (oEvent) {
			var that = this;
			var actionParameters = JSON.parse(oEvent.getSource().data("wiring").replace(/'/g, "\""));
			var eventType = oEvent.getId();
			var aTargets = actionParameters[eventType].targets || [];
			aTargets.forEach(function (oTarget) {
				var oControl = that.byId(oTarget.id);
				if (oControl) {
					var oParams = {};
					for (var prop in oTarget.parameters) {
						oParams[prop] = oEvent.getParameter(oTarget.parameters[prop]);
					}
					oControl[oTarget.action](oParams);
				}
			});
			var oNavigation = actionParameters[eventType].navigation;
			if (oNavigation) {
				var oParams = {};
				(oNavigation.keys || []).forEach(function (prop) {
					oParams[prop.name] = encodeURIComponent(JSON.stringify({
						value: oEvent.getSource().getBindingContext(oNavigation.model).getProperty(prop.name),
						type: prop.type
					}));
				});
				if (Object.getOwnPropertyNames(oParams).length !== 0) {
					this.getOwnerComponent().getRouter().navTo(oNavigation.routeName, oParams);
				} else {
					this.getOwnerComponent().getRouter().navTo(oNavigation.routeName);
				}
			}
		},
		/**
		 *@memberOf sandbox.ui5.controller.View1
		 */
		testButton: function () {
			// var oModel = this.getView().getModel("ocrModel");
			// var entry = oModel.getData("/Pages('sample-Copy-Copy.pdf')");
			// console.log(entry);
			// console.log("Test button pressed.");
			var oGlobalBusyDialog = new sap.m.BusyDialog({
				text: "Processing..."
			});
			oGlobalBusyDialog.open();
			$.ajax({
				headers: {
					"X-CSRF-Token": "Fetch"
				},
				url: '/node/ocr/',
				type: 'get',
				success: (res, status, xhr) => {
					var csrf_token = xhr.getResponseHeader('x-csrf-token');
					var taText = this.getView().byId("taArea").getValue();
					var taConfig = this.getView().byId("taSelect").getSelectedKey();
					$.ajax({
						headers: {
							"X-CSRF-Token": csrf_token
						},
						url: '/node/ta/analyze',
						type: 'post',
						data: {
							text: taText,
							config: taConfig
						},
						success: (data) => {
							console.log(data);
							this.getView().byId("taArea2").setValue(JSON.stringify(data));
							oGlobalBusyDialog.close();
						},
						error: (err) => {
							console.log(err);
							oGlobalBusyDialog.close();
						}
					});
				}
			});
		},
		testButton2: function () {
			// var oModel = this.getView().getModel("ocrModel");
			// var entry = oModel.getData("/Pages('sample-Copy-Copy.pdf')");
			// console.log(entry);
			// var fileModel = this.getView().getModel("currentFileModel");
			var fileName = "TEST_FILE";
			var text = "TEST TEXT";
			var oData = {
				FILENAME: fileName,
				TEXT: text
			};
			var oModel = this.getView().getModel("ocrModel");
			var request = `/Pages('${fileName}')`;
			console.log(request);

			oModel.update(request, oData, {
				success: (res) => {
					console.log("[INFO] Inserting page", res);
				},
				error: (err) => {
					console.error("[ERROR] Inserting page", err);
				}
			});
		},
		copyButton: function () {
			// var txt = this.getView().byId("ocrText").getText();
			var txt = this.getView().byId("ocrOutput").getValue();
			navigator.clipboard.writeText(txt).then(function () {
				console.log('Async: Copying to clipboard was successful!');
				sap.m.MessageToast.show("Text copied to clipboard.", {});
			}, function (err) {
				console.error('Async: Could not copy text: ', err);
			});
		},
		uploadFile: function (oEvent) {
			var oDataLine = {};
			var oDataPage = {};

			var oGlobalBusyDialog = new sap.m.BusyDialog({
				text: "Processing..."
			});
			var oModel = this.getView().getModel("currentFileModel");
			oModel.setProperty('/busyDialog', oGlobalBusyDialog);

			// Collect input data
			var fileUploader = this.getView().byId("fileUploader");
			var txtButton = this.getView().byId("txtButton");
			var xmlButton = this.getView().byId("xmlButton");
			var pageSegModeBox = this.getView().byId("pageSegModeBox");
			var modelTypeBox = this.getView().byId("modelTypeBox");
			var output_type;
			var ocrOutput = this.getView().byId("ocrOutput");
			if (txtButton.getSelected()) {
				output_type = "txt";
			} else {
				output_type = "xml";
			}
			if (!fileUploader.getValue()) {
				sap.m.MessageToast.show("Choose a file first");
				return;
			}
			var that = this;

			//Create options as per api
			var options = {
				"lang": "en",
				"outputType": output_type,
				"pageSegMode": pageSegModeBox.getSelectedKey(),
				"modelType": modelTypeBox.getSelectedKey()
			};
			var optionsStringy = JSON.stringify(options);
			// Collect uploaded file
			var domRef = fileUploader.getFocusDomRef();
			var file = domRef.files[0];
			var fileName = file.name;
			fileName = fileName.replace(/\s+/g, '');
			// Add to the currentFileModel
			oModel.setProperty('/fileName', fileName);
			oModel.refresh();
			// Create FormData and append required data
			var formData = new FormData();
			formData.append("files", file, fileName);
			formData.append("options", optionsStringy);
			oModel.setProperty('/formData', formData);
			ocrOutput.setValue("");
			console.log("[INFO] Calling OCR API with custom options...");

			let appProcess = async() => {
				try {
					console.log("[STEP 1] Starting...");
					await this.initLoad();

					console.log("[STEP 2] Starting...");
					await this.postOcr();

					console.log("[STEP 3] Starting...");
					await this.cleanOcrText();

					// console.log("[STEP 4] 4");
					// await this.postPage();
					// console.log("[STEP] 5");
					// await this.postLines();
					console.log("[STEP 4 & 5] Starting...");
					await Promise.all([this.postPage(), this.postLines()]);

					console.log("[STEP 6] Starting...");
					await this.refreshModels();

					console.log("[STEP 7] Starting...");
					await this.endLoad();

					return;
				} catch (e) {
					console.error(e);
				}
			};
			appProcess();
		},
		refreshModels: async function () {
			try {
				//
				this.getView().getModel("ocrModel").refresh();
				//
				var oModel = this.getView().getModel("currentFileModel");
				// this.getView().getModel('lineModel').refresh();
				this.getView().byId("ocrOutput").setValue(oModel.getProperty('/cleanText'));
				// oGlobalBusyDialog.close();
				return;
			} catch (e) {
				console.error(e);
			}
		},
		initLoad: async function () {
			try {
				var oModel = this.getView().getModel("currentFileModel");
				oModel.getProperty('/busyDialog').open();
			} catch (e) {
				console.error(e);
			}
		},
		endLoad: async function () {
			try {
				var oModel = this.getView().getModel("currentFileModel");
				oModel.getProperty('/busyDialog').close();
			} catch (e) {
				console.error(e);
			}
		},
		postOcr: async function () {
			try {
				//
				// var oModel = this.getView().getModel("ocrModel");
				//
				var oModel = this.getView().getModel("currentFileModel");
				let key = await $.ajax({
					url: '/xsjs/credential.xsjs',
					type: 'get'
				});
				let res_data = await $.ajax({
					url: 'https://sandbox.api.sap.com/ml/ocr/ocr/',
					timeout: 360000,
					headers: {
						'apiKey': key,
						'Accept': 'application/json'
					},
					'Accept': 'application/json',
					type: 'post',
					contentType: false,
					processData: false,
					// formData:form,
					data: oModel.getProperty('/formData')
				});
				// console.log(`[INFO] AJAX DATA FOR ASYNC`, res_data);
				oModel.setProperty('/predictions', res_data);
				return res_data;
			} catch (e) {
				return (console.error(`[ERROR] `, e));
			}
		},
		cleanOcrText: async function () {
			try {
				var oModel = this.getView().getModel("currentFileModel");
				var textRes = oModel.getProperty('/predictions')['predictions'][0];
				oModel.setProperty('/text', textRes);
				var lines = textRes.split("\n");
				// Push empty and filled lines
				for (var i = 0; i < lines.length; i++) {
					oModel.getProperty('/lines').push(lines[i]);
				}
				let cleanedArr = await this.cleanText(lines);
				// console.log('CLEANED ARRAY ', cleanedArr);
				oModel.setProperty('/cleanedArr', cleanedArr);
				var cleanString = "";
				// Push only non-empty lines
				for (var i = 0; i < cleanedArr.length; i++) {
					cleanString += cleanedArr[i] + '\n';
					oModel.getProperty('/cleanLines').push(cleanedArr[i]);
				}
				oModel.setProperty('/cleanText', cleanString);
				// this.getView().getModel('lineModel').refresh();
				return;
			} catch (e) {
				console.error(e);
			}
		},
		cleanText: async function (lines) {
			try {
				// console.log("LINES", lines);
				// var cleaned = "";
				var cleaned = [];
				for (var i = 0; i < lines.length; i++) {
					if (lines[i].replace(/\s/g, "").length > 0) {
						cleaned.push(lines[i]);
					}
				}
				return cleaned;
			} catch (e) {
				return console.error(e);
			}
		},
		postPage: async function () {
			var prom1 = new Promise((resolve, reject) => {
				try {
					// odata test
					var fileModel = this.getView().getModel("currentFileModel");
					// console.log("[INFO] File Model", fileModel);
					var fileName = fileModel.getProperty('/fileName');
					var oData = {
						FILENAME: fileName,
						TEXT: fileModel.getProperty('/cleanText')
					};
					var oModel = this.getView().getModel("ocrModel");
					// var request = `/Pages('${fileName}')`;
					// console.log("[INFO] Request:", request);
					oModel.create("/Pages", oData, {
						success: (oCreatedEntry) => {
							// console.log("[INFO] Inserting page", oCreatedEntry);
							return resolve(oCreatedEntry);
						},
						error: (oError) => {
							// console.log("[ERROR] Inserting page", oError);
							return reject(oError);
						}
					});
				} catch (e) {
					console.error(e);
				}
			});
			let res = await prom1;
			console.log(res);
		},
		postLines: async function () {
			var prom1 = new Promise((resolve, reject) => {
				try {
					//
					var fileModel = this.getView().getModel("currentFileModel");
					var oModel = this.getView().getModel("ocrModel");
					var lineArr = fileModel.getProperty('/cleanedArr');
					var i = 0;
					var insertArr = [];
					for (i; i < lineArr.length; i++) {
						var oData = {
							FILENAME: fileModel.getProperty('/fileName'),
							PAGENUMBER: '1',
							LINENUMBER: i,
							TEXT: lineArr[i]
						};
						insertArr.push(oData);
						oModel.create("/Lines", oData, {
							success: (oCreatedEntry) => {
								// console.log(oCreatedEntry); 
							},
							error: (oError) => {
								console.error(oError);
								return reject(oError);
							}
						});
						if (i === lineArr.length - 1) {
							console.log("[INFO] i reached max iteration.");
							return resolve();
						}
					}
					console.log(insertArr);
				} catch (e) {
					console.error(e);
				}
			});
			let res = await prom1;
			console.log(res);
		}
	});
});
// get_csrf: async function () {
// 	try {
// 		var oModel = this.getView().getModel("currentFileModel");
// 		let csrf_token = null;
// 		await $.ajax({
// 			headers: {
// 				"X-CSRF-Token": "Fetch"
// 			},
// 			url: '/node/ocr/',
// 			type: 'get',
// 			success: (res, status, xhr) => {
// 				csrf_token = xhr.getResponseHeader('x-csrf-token');
// 				oModel.setProperty('/csrf_token', csrf_token);
// 				return csrf_token;
// 			}
// 		});
// 		return;
// 	} catch (e) {
// 		console.error(e);
// 	}
// },
// delete_lines: async function () {
// 	try {
// 		//
// 		var fileModel = this.getView().getModel("currentFileModel");
// 		var oModel = this.getView().getModel("ocrModel");
// 		await oModel.remove(`/Lines('${fileModel.getProperty('/fileName')}')`, {
// 			success: (oCreatedEntry) => {
// 				console.log(oCreatedEntry);
// 			},
// 			error: (oError) => {
// 				console.error(oError);
// 			}
// 		});
// 		//
// 		// var oModel = this.getView().getModel("currentFileModel");
// 		// console.log("To delete ", oModel.getProperty('/fileName'));
// 		// await $.ajax({
// 		// 	headers: {
// 		// 		'x-csrf-token': oModel.getProperty('/csrf_token')
// 		// 	},
// 		// 	url: '/node/ocr/line/',
// 		// 	timeout: 360000,
// 		// 	type: 'delete',
// 		// 	data: {
// 		// 		fileName: oModel.getProperty('/fileName')
// 		// 	}
// 		// });
// 		return;
// 	} catch (e) {
// 		console.error(e);
// 	}
// },

// delete_page: async function () {
// 	try {
// 		var fileModel = this.getView().getModel("currentFileModel");
// 		var oModel = this.getView().getModel("ocrModel");
// 		var request = `/Pages('${fileModel.getProperty('/fileName')}')`;
// 		console.log(request);
// 		await oModel.read(request, {
// 			success: (res, response) => {
// 				console.log("Length of Read:", Object.keys(res).length);
// 				if (Object.keys(res).length > 0) {
// 					oModel.remove(request, {
// 						success: () => {
// 							console.log("[INFO] Removed page.");
// 						},
// 						error: (oError) => {
// 							console.error("[ERROR] Removing page: ", oError);
// 						}
// 					});
// 				}
// 			},
// 			error: (err) => {
// 				console.error(err);
// 			}
// 		});
// 	} catch (e) {
// 		console.error(e);
// 	}
// }