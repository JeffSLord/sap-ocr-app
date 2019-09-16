sap.ui.define(["sap/ui/core/mvc/Controller"], function (Controller) {
	"use strict";
	return Controller.extend("ocr.ui5.controller.View1", {
		/**
		 *@memberOf sandbox.ui5.controller.View1
		 */
		onInit: function () {
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
			var oModel = new sap.ui.model.odata.v2.ODataModel("/xsodata/ocr.xsodata/");
			this.getView().setModel(oModel, "lineModel");
			var oTable = this.getView().byId("sTable");
			oTable.setModel(oModel);
			var oTable2 = this.getView().byId("sTable2");
			oTable2.setModel(oModel);
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
			console.log("Test button pressed.");
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

			let app_process = async() => {
				try {
					await this.init_load();

					await this.get_csrf();
					console.log(`[INFO] csrf call successful.`);
					await this.post_ocr();
					console.log(`[INFO] post_ocr call successful.`);
					await this.clean_ocr_text();
					console.log(`[INFO] ocr text clean successful.`);
					await this.delete_lines();
					console.log(`[INFO] delete_lines call successful.`);
					await this.post_page();
					console.log(`[INFO] post_page call successful.`);
					await this.post_lines();
					console.log(`[INFO] post_lines call successful.`);

					await this.refresh_models();
					await this.end_load();
					return;
				} catch (e) {
					console.error(e);
				}
			};
			app_process();
		},
		refresh_models: async function () {
			try {
				var oModel = this.getView().getModel("currentFileModel");
				this.getView().getModel('lineModel').refresh();
				this.getView().byId("ocrOutput").setValue(oModel.getProperty('/cleanText'));
				// oGlobalBusyDialog.close();
				return;
			} catch (e) {
				console.error(e);
			}
		},
		init_load: async function () {
			try {
				var oModel = this.getView().getModel("currentFileModel");
				oModel.getProperty('/busyDialog').open();
			} catch (e) {
				console.error(e);
			}
		},
		end_load: async function () {
			try {
				var oModel = this.getView().getModel("currentFileModel");
				oModel.getProperty('/busyDialog').close();
			} catch (e) {
				console.error(e);
			}
		},
		post_ocr: async function () {
			try {
				var oModel = this.getView().getModel("currentFileModel");
				let res_data = await $.ajax({
					url: 'https://sandbox.api.sap.com/ml/ocr/ocr/',
					timeout: 360000,
					headers: {
						'apiKey': 'QEkc0UduJQtxhBA3oVAdbpzCda0qFPSe',
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
		get_csrf: async function () {
			try {
				var oModel = this.getView().getModel("currentFileModel");
				let csrf_token = null;
				await $.ajax({
					headers: {
						"X-CSRF-Token": "Fetch"
					},
					url: '/node/ocr/',
					type: 'get',
					success: (res, status, xhr) => {
						csrf_token = xhr.getResponseHeader('x-csrf-token');
						oModel.setProperty('/csrf_token', csrf_token);
						return csrf_token;
					}
				});
				return;
			} catch (e) {
				console.error(e);
			}
		},
		clean_ocr_text: async function () {
			try {
				var oModel = this.getView().getModel("currentFileModel");
				var textRes = oModel.getProperty('/predictions')['predictions'][0];
				oModel.setProperty('/text', textRes);
				var lines = textRes.split("\n");
				// Push empty and filled lines
				for (var i = 0; i < lines.length; i++) {
					oModel.getProperty('/lines').push(lines[i]);
				}
				let cleanedArr = await this.clean_text(lines);
				// console.log('CLEANED ARRAY ', cleanedArr);
				oModel.setProperty('/cleanedArr', cleanedArr);
				var cleanString = "";
				// Push only non-empty lines
				for (var i = 0; i < cleanedArr.length; i++) {
					cleanString += cleanedArr[i] + '\n';
					oModel.getProperty('/cleanLines').push(cleanedArr[i]);
				}
				oModel.setProperty('/cleanText', cleanString);
				this.getView().getModel('lineModel').refresh();
				return;
			} catch (e) {
				console.error(e);
			}
		},
		clean_text: async function (lines) {
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
		post_page: async function () {
			console.log("[INFO] Inserting page to table...");
			try {
				var oModel = this.getView().getModel("currentFileModel");
				// Insert to Page table (Filename, text)
				await $.ajax({
					url: '/node/ocr/page/',
					type: 'post',
					headers: {
						'x-csrf-token': oModel.getProperty('/csrf_token')
					},
					data: {
						fileName: oModel.getProperty('/fileName'),
						text: oModel.getProperty('/cleanText')
					}
				});
			} catch (e) {
				console.error(e);
			}
		},
		post_lines: async function () {
			try {
				var oModel = this.getView().getModel("currentFileModel");
				$.ajax({
					url: '/node/ocr/lines/',
					timeout: 3600,
					type: 'post',
					headers: {
						'x-csrf-token': oModel.getProperty('/csrf_token')
					},
					data: {
						fileName: oModel.getProperty('/fileName'),
						pageNum: '1',
						// lineNum: i,
						lines: JSON.stringify(oModel.getProperty('/cleanedArr'))
					}
				});
				return;
			} catch (e) {
				console.error(e);
			}
		},
		delete_lines: async function () {
			try {
				var oModel = this.getView().getModel("currentFileModel");
				console.log("To delete ", oModel.getProperty('/fileName'));
				await $.ajax({
					headers: {
						'x-csrf-token': oModel.getProperty('/csrf_token')
					},
					url: '/node/ocr/line/',
					timeout: 360000,
					type: 'delete',
					data: {
						fileName: oModel.getProperty('/fileName')
					}
				});
				return;
			} catch (e) {
				console.error(e);
			}
		}

	});
});