// this is all ui javascript
(function () {

	"use strict";

	var nodeLayer, backgroundLayer, edgeLayer, uiLayer;

	var gridSize = 20;
	var lineDash = [1, gridSize-1];

	var connectionNodeRadius = 3;
	var ioStopX = gridSize - connectionNodeRadius;

	var circuitData, circuitDrawer;

	// can't use a literal b/c we want to use type names from LibCircuit
	var transistor_types = {}

	var deleteMode = false;

	transistor_types[LibCircuit.pmosType] = {
		text_pos: [5, 12],
		pins: [
			[39, 2 ],
			[1, 22 ],
			[39, 42 ],
		],
	}

	transistor_types[LibCircuit.nmosType] = {
		text_pos: [5, 12],
		pins: [
			[39, 2 ],
			[1, 22 ],
			[39, 42 ],
		]
	}

	transistor_types[LibCircuit.vccType] = {
		text_pos: [5, 26],
		pins: [
			[40, 17],
		]
	}

	transistor_types[LibCircuit.gndType] = {
		text_pos: [5, 26],
		pins: [
			[40, 17],
		]
	}

	var gate_types = {};

	gate_types[LibCircuit.andType] = {
		text_pos: [25, 17],
		pins: [
			[1, 8  	],
			[60, 14 ],
			[1, 19 	],
		],
	};

	gate_types[LibCircuit.nandType] = {
		text_pos: [25, 17],
		pins: [
			[1, 8   ],
			[60, 14 ],
			[1, 19  ],
		],
	};

	gate_types[LibCircuit.orType] = {
		text_pos: [25, 17],
		pins: [
			[1, 8   ],
			[60, 14 ],
			[1, 19  ],
		],
	};

	gate_types[LibCircuit.norType] = {
		text_pos: [25, 17],
		pins: [
			[1, 8   ],
			[60, 14 ],
			[1, 19  ],
		],
	};

	gate_types[LibCircuit.xorType] = {
		text_pos: [25, 17],
		pins: [
			[1, 8   ],
			[60, 14 ],
			[1, 19  ],
		],
	};

	gate_types[LibCircuit.xnorType] = {
		text_pos: [25, 17],
		pins: [
			[1, 8   ],
			[60, 14 ],
			[1, 19  ],
		],
	};

	gate_types[LibCircuit.inverterType] = {
		text_pos: [16, 17],
		pins: [
			[1, 13  ],
			[60, 13 ],
		],
	};
	
	var node_types = {};

	for (var id in transistor_types) {
		node_types[id] = transistor_types[id];
	}

	for (var id in gate_types) {
		node_types[id] = gate_types[id];	
	}

	var template_dir = "templates/"

	var window_loaded = false;
	var document_loaded = false;

	$(document).ready(function () {
		document_loaded = true;
		bootstrap();
	});

	$(window).on('load', function() {
		window_loaded = true;
		bootstrap();
	});

	function bootstrap() {
		if (window_loaded && document_loaded) {
			load_doc();
			load_template();
		}
	}

	function load_template() {
		var template = getUrlParameter('template')
		if (template) {
			// sanitize template param so it only contains \w+
			var santizeRegex = /[^A-Za-z0-9_]/
			template = template.replace(santizeRegex, '')

			// make sure we don't have any funny business going on
			var isSantized = /\w+/.test(template)

			if (isSantized) {
				// make an ajax query to get file data
				$.getJSON(template_dir + template + '.json', function (data) {
					if (data.undoStack)
						delete data.undoStack;

					circuitData.clear();
					circuitData.import(data, getBoundingBox);

					if (circuitData.simType == CircuitData.SIM_TYPE_TRANSISTOR) {
						show_transistor_panel();
					} else if (circuitData.simType == CircuitData.SIM_TYPE_GATE) {
						show_gate_panel();
					} else {
						console.warn("Invalid simType in circuitData");
					}
					circuitDrawer.clear();
					circuitDrawer.renderAll(getImageMap());
					
					io_changed();
				});
			}
		}
	}

	// actually loads and draws what needs to be drawn
	function load_doc() {
		nodeLayer = document.getElementById('node-layer');
		edgeLayer = document.getElementById('edge-layer');
		backgroundLayer = document.getElementById('background-layer')
		uiLayer = document.getElementById('ui-layer');

		$(uiLayer).on('click', canvas_click_handler);
		$(uiLayer).on('drop', drop_handler);
		$(uiLayer).on('dragover', dragover_handler);

		circuitData = new CircuitData();
		circuitDrawer = new CircuitDrawer({
			nodeLayer: nodeLayer, 
			edgeLayer: edgeLayer,
			circuitData: circuitData,
			nodeTypes: node_types,
			gridSize: gridSize,
			pinRadius: connectionNodeRadius,
		});

		render_complete_grid();

		load_transistor_panel();
		load_gate_panel();

		show_transistor_panel();

		var disable_io = getUrlParameter('disableIO');
		if (disable_io) {
			$("#io-panel-container").addClass("hidden");
		} else {
			show_input_panel();
		}
	}

	function expose(func, name) {
		window[name] = func;
	}

	function load_transistor_panel() {
		// var tp = $("#transistor-panel-t");
		// tp.empty();
		for (var id in transistor_types) {
			// var typedef = transistor_types[id];
			var ele = $('#'+id);
			ele.on('dragstart', drag_handler);
			// tp.append(ele);
		};
	}

	function load_gate_panel() {
		// var tp = $("#transistor-panel-g");
		// tp.empty();
		for (var id in gate_types) {
			// var typedef = gate_types[id];
			var ele = $('#'+id);
			ele.on('dragstart', drag_handler);
			// tp.append(ele);
		}
	}

	// expose(show_transistor_panel, "show_transistor_panel");
	function show_transistor_panel () {
		// show/hide relevant tabs
		$(".mode-message").addClass("hidden");
		$("#transitor-panel-t-tab").removeClass("hidden");

		$("#transistor-panel-t").removeClass("hidden");
		$("#transistor-panel-g").addClass("hidden");
	}

	// expose(show_gate_panel, "show_gate_panel");
	function show_gate_panel () {
		// show/hide relevant tabs
		$(".mode-message").addClass("hidden");
		$("#transitor-panel-g-tab").removeClass("hidden");

		$("#transistor-panel-t").addClass("hidden");
		$("#transistor-panel-g").removeClass("hidden");
	}

	function add_pin_names(arr, addEventHandler) {
		var ip = $("#io-panel");
		ip.empty();
		for (var i = 0; i < arr.length; i++) {
			var ioTemplate = $('#io-template').clone();
			ioTemplate.removeClass("hidden");
			ioTemplate.find(".io-label").text(arr[i]);
			ip.append(ioTemplate)
		};

		var addTemplate = $('#io-add-template').clone()
		// disable enter submission
		addTemplate.submit(function () {
			return false;
		});

		addTemplate.removeClass("hidden");
		addTemplate.find(".io-submit-btn").click(addEventHandler);
		ip.append(addTemplate)
	}

	expose(show_input_panel, 'show_input_panel');
	function show_input_panel () {
		// console.log("Showing input panel");

		$("#io-panel-tabs li").removeClass("active");
		$("#io-panel-i-tab").addClass("active");

		add_pin_names(circuitData.getInputNames(), add_input_action);
	}

	expose(show_output_panel, 'show_output_panel');
	function show_output_panel() {
		// console.log("Showing output panel");

		$("#io-panel-tabs li").removeClass("active");
		$("#io-panel-o-tab").addClass("active");

		add_pin_names(circuitData.getOutputNames(), add_output_action);
	}

	function add_input_action() {
		var name = $("#addIOPin").val();

		circuitData.addIO(name, true);
		circuitDrawer.renderIO();
		circuitDrawer.renderEdges();

		show_input_panel();
	}

	function add_output_action() {
		var name = $('#addIOPin').val();

		circuitData.addIO(name, false);
		circuitDrawer.renderIO();
		circuitDrawer.renderEdges();

		show_output_panel();
	}

	function show_verify_error(error) {
		$("#error-message").text(error.message);
		$("#error-panel").removeClass("hidden");

		for (var i = error.nids.length - 1; i >= 0; i--) {
			var nid = error.nids[i];
			var node = circuitData.getNode(nid);
			if (node.type == LibCircuit.inputType || node.type == LibCircuit.outputType)
				return;
			var img = document.getElementById(node.type);
			circuitDrawer.deleteNode(node.rect);
			circuitDrawer.renderNode(node, img, node.type != LibCircuit.wireType, true);
		};
	}

	function error_box_kludge() {
		// kludge for removing error boxes
		circuitDrawer.clear();
		circuitDrawer.renderAll(getImageMap());
	}

	expose(confirm_change_mode_action, "confirm_change_mode_action");
	function confirm_change_mode_action() {
		var sim_type;
		if (circuitData.simType == CircuitData.SIM_TYPE_TRANSISTOR) {
			sim_type = CircuitData.SIM_TYPE_GATE;
			show_gate_panel();
		} else if (circuitData.simType == CircuitData.SIM_TYPE_GATE) {
			sim_type = CircuitData.SIM_TYPE_TRANSISTOR;
			show_transistor_panel();
		} else {
			return console.warn("Invalid mode on confirm_change_mode_action().  Please report this error to the web-admin along with a console dump.");
		}

		circuitData.clear();
		circuitDrawer.clear();
		circuitData.simType = sim_type;
		io_changed();

		hide_panel("#change-mode-panel");
	}

	expose(verify_action, 'verify_action');
	function verify_action() {
		$("#error-panel").addClass("hidden");
		$("#success-panel").addClass("hidden");

		error_box_kludge()

		var result;
		if (circuitData.simType == CircuitData.SIM_TYPE_TRANSISTOR) {
			result = LibCircuit.runTransistorChecks(circuitData.graph);
		} else {
			result = LibCircuit.runGateChecks(circuitData.graph);
		}

		if (result) {
			show_verify_error(result);
		} else {
			$("#success-panel").removeClass("hidden");
		}
	}

	expose(simulate_action, 'simulate_action');
	function simulate_action() {
		$("#error-panel").addClass("hidden");
		$("#success-panel").addClass("hidden");

		error_box_kludge();

		var verifyResult;
		if (circuitData.simType == CircuitData.SIM_TYPE_TRANSISTOR) {
			verifyResult = LibCircuit.runTransistorChecks(circuitData.graph);
		} else {
			verifyResult = LibCircuit.runGateChecks(circuitData.graph);
		}
		if (verifyResult) {
			show_verify_error(verifyResult);
			return;
		}

		var result;
		if (circuitData.simType == CircuitData.SIM_TYPE_TRANSISTOR) {
			result = LibCircuit.simulate(circuitData.graph);
		} else {
			result = LibCircuit.simulateGates(circuitData.graph);
		}

		console.log("Simulate result:");
		console.log(result);

		var template = "<td></td>";
		$("#simulate-panel").removeClass("hidden");

		var headerEle = $("#simulate-panel thead tr");
		headerEle.empty();

		function AddHeader(nid) {
			var node = circuitData.getNode(nid);
			var ele = $(template)
			ele.text(node.name);
			headerEle.append(ele);
		}

		result.inputs.forEach(AddHeader);
		result.outputs.forEach(AddHeader);

		var tableEle = $("#simulate-panel tbody");
		tableEle.empty();

		function AddRow(row) {
			var rowEle = $("<tr></tr>");
			row.forEach(function (x) {
				var ele = $(template);
				ele.text(x);
				rowEle.append(ele);
			})
			tableEle.append(rowEle);
		}

		result.rows.forEach(AddRow);
	}

	expose(hide_panel, 'hide_panel');
	function hide_panel(selector) {
		$(selector).addClass("hidden")
	}

	expose(undo_action, 'undo_action');
	function undo_action() {
		if (!circuitData.canUndo()) return;
		var result = circuitData.undo();
		var type = result[0];
		if (type == 'node') {
			circuitDrawer.deleteNode(result[1]);
		} else if (type == 'edge') {
			circuitDrawer.renderEdges();
		} else if (type == 'io') {
			circuitDrawer.renderIO();
			circuitDrawer.renderEdges();
			io_changed();
		} else {
			console.warn("Got unknown undo type back from circuitData");
		}
	}

	function io_changed() {
		if ($("#io-panel-i-tab").hasClass("active")) {
			show_input_panel();
		} else if ($("#io-panel-o-tab").hasClass("active")) {
			show_output_panel();
		} else {
			console.warn("Neither tab is selected.  This should not happen.");
		}
	}

	expose(clear_action, 'clear_action');
	function clear_action() {
		circuitData.clear();
		circuitDrawer.clear();
		io_changed();
		hide_panel("#clear-panel");
	}

	expose(export_action, 'export_action');
	function export_action() {
		var data = circuitData.export();
		// console.log("Exported data to object");
		// console.log(data);
		var serialized = JSON.stringify(data);
		var compressed = LZString.compressToEncodedURIComponent(serialized);
		console.log("Finished compressing export data, compression ratio: " + (serialized.length/compressed.length));
		$("#export-panel").removeClass("hidden");
		$("#export-panel textarea").text(compressed);
	}

	expose(confirm_delete_action, 'confirm_delete_action');
	function confirm_delete_action() {
		$("#delete-confirm-panel").addClass("hidden");
		var rect = circuitData.getNode(deletionNID).rect;
		circuitData.deleteNode(deletionNID);
		circuitDrawer.deleteNode(rect);
		circuitDrawer.renderIO();
		circuitDrawer.renderEdges();
	}

	expose(show_panel, 'show_panel');
	function show_panel(selector) {
		// console.log("Showing panel: "+selector);
		// console.log($(selector));
		$(selector).removeClass("hidden");
	}

	function getImageMap() {
		var imageMap = {};
		var typedefs = node_types;
		for (var type in typedefs) {
			var img = document.getElementById(type);
			imageMap[type] = img;
		}
		return imageMap;
	}

	expose(import_action, 'import_action');
	function import_action() {
		try {
			var data;
			// auto-detect compressed vs uncompressed data
			var serialized = $("#import-panel textarea").val();
			try {
				data = JSON.parse(serialized);
			} catch (e) {
				serialized = LZString.decompressFromEncodedURIComponent(serialized);
				// if it fails here, user hasn't given us valid data
				data = JSON.parse(serialized);
			}
			
			circuitData.clear();
			circuitData.import(data, getBoundingBox);

			if (circuitData.simType == CircuitData.SIM_TYPE_TRANSISTOR) {
				show_transistor_panel();
			} else if (circuitData.simType == CircuitData.SIM_TYPE_GATE) {
				show_gate_panel();
			} else {
				return console.warn("Invalid mode on confirm_change_mode_action().  Please report this error to the web-admin along with a console dump.");
			}

			circuitDrawer.clear();
			circuitDrawer.renderAll(getImageMap());
			
			io_changed();
			$("#import-success-panel").removeClass("hidden");
		} catch (e) {
			$("#import-error-panel").removeClass("hidden");
			$("#import-error-panel .error-message").text(e);
		}
		$("#import-panel textarea").val("");
		$("#import-panel").addClass("hidden");
	}

	function render_complete_grid() {
		var ctx = backgroundLayer.getContext("2d");

		var x = 0;
		var y = 0;
		var width = backgroundLayer.width;
		var height = backgroundLayer.height;

		ctx.save();
		ctx.setLineDash(lineDash);

		// detemine grids lines to re-render
		var startI = Math.floor(x / gridSize)+1;
		var endI = Math.ceil((x + width) / gridSize);
		var startY = Math.floor(y / gridSize) * gridSize;
		var endY = Math.ceil((y + height) / gridSize) * gridSize;
		for (var i = startI; i < endI; i++) {
			var x = i * gridSize;
			ctx.beginPath();
			ctx.moveTo(x, startY);
			ctx.lineTo(x, endY);
			ctx.stroke();
		}

		ctx.restore();
	}

	function window_to_canvas(canvas, x, y) {
		var rect = canvas.getBoundingClientRect();
		return {
			x: Math.floor( (x - rect.left) / (rect.right - rect.left) * canvas.width ),
			y: Math.floor( (y - rect.top) / (rect.bottom - rect.top) * canvas.height ),
		};
	}

	function mouse_to_element(selector, evt) {
		var rect = edgeLayer.getBoundingClientRect();
		var offset = $(selector).offset();
		return {
			x: (evt.pageX - offset.left) / (rect.right - rect.left) * edgeLayer.width,
			y: (evt.pageY - offset.top) / (rect.bottom - rect.top) * edgeLayer.height,
		};
	}

	var mouse_offset = null;

	function drag_handler(evt) {
		mouse_offset = mouse_to_element("#"+evt.target.id, evt);
		evt.originalEvent.dataTransfer.setData("id", evt.target.id);
	}

	function dragover_handler (evt) {
		evt.preventDefault();
		evt.originalEvent.dataTransfer.dropEffect = "copy";
	}

	function snap_to_canvas(pos, width, height) {
		// snap to grid
		// pos.x = Math.round(pos.x / gridSize) * gridSize;
		// pos.y = Math.round(pos.y / gridSize) * gridSize;

		// bound by canvas size
		pos.x = Math.max(pos.x, ioStopX + 2 * connectionNodeRadius + 5);
		pos.y = Math.max(pos.y, 0);
		pos.x = Math.min(pos.x, nodeLayer.width - width);
		pos.y = Math.min(pos.y, nodeLayer.height - height);
		return pos;
	}

	var wireSize = 8;

	function getBoundingBox(typeId, pos) {
		var img = document.getElementById(typeId);
		if (typeId == LibCircuit.gndType || typeId == LibCircuit.vccType) {
			return {
				x: pos.x,
				y: pos.y,
				width: img.naturalWidth,
				height: img.naturalHeight + gridSize/2, // add gridSize/2 for text below wire
			};
		} else  if (img) {
			return {
				x: pos.x,
				y: pos.y,
				width: img.naturalWidth,
				height: img.naturalHeight,
			};
		}
		else if (typeId == LibCircuit.wireType) {
			return {
				x: pos.x - wireSize,
				y: pos.y - wireSize,
				width: 2 * wireSize,
				height: 2 * wireSize,
			};
		} 
		else {
			// circuitDrawer will handle this
			return null;
		}
	}

	function drop_handler (evt) {
		evt.preventDefault();

		var pos = window_to_canvas(nodeLayer, evt.clientX, evt.clientY);
		var typeId = evt.originalEvent.dataTransfer.getData("id");
		var img = document.getElementById(typeId);

		var type;
		if (circuitData.simType == "transistor") {
			type = transistor_types[typeId];
		} else if (circuitData.simType == "gate") {
			type = gate_types[typeId];
		} else {
			return console.warn("Invalid CircuitData.simType in drop_handler().  Please report this to the web-admin along with console dump.");
		}

		// conform pos to offset when started dragging
		pos.x = pos.x - mouse_offset.x + img.width/2; // add half width b/c centers image on mouse
		pos.y = pos.y - mouse_offset.y;

		pos = snap_to_canvas(pos, img.naturalWidth, img.naturalHeight);

		var rect = getBoundingBox(typeId, pos);

		// prevent rendering over another symbol
		if (circuitData.rectIntersects(rect)) {
			console.log("Ignoring drop onto another symbol");
			return;
		}

		var nid = circuitData.addNode(typeId, type, pos, rect);
		circuitDrawer.renderNode(circuitData.getNode(nid), img, true);
	}

	var lastClickedNode = null;
	var clickBox = 10;

	var deletionNID = null;
	var destinationDeletionNode = null;

	function handle_delete(pos) {
		deletionNID = circuitData.closestNode(pos, clickBox);
		if (!deletionNID) {
			console.warn("Could not find closest node");
		} else {
			var node = circuitData.getNode(deletionNID);
			var typeId = node.type
			var img = document.getElementById(typeId);
			circuitDrawer.updateNode(node, img, typeId != LibCircuit.wireType, true);
			show_panel('#delete-confirm-panel');
		}
	}

	expose(enable_delete_mode_action, 'enable_delete_mode_action');
	function enable_delete_mode_action() {
		deleteMode = true;
		show_panel("#delete-panel");
	}

	expose(disable_delete_mode_action, 'disable_delete_mode_action');
	function disable_delete_mode_action() {
		deleteMode = false;
		hide_panel("#delete-panel");
	}

	expose(cancel_delete_action, 'cancel_delete_action');
	function cancel_delete_action() {
		var node = circuitData.getNode(deletionNID);
		var typeId = node.type
		var img = document.getElementById(typeId);
		circuitDrawer.updateNode(node, img, typeId != LibCircuit.wireType, false);
		hide_panel('#delete-confirm-panel');
	}

	function handle_pin_connect(pos) {
		var closest_pin = circuitData.closestPin(pos, clickBox, node_types, gridSize - connectionNodeRadius);

		if (lastClickedNode) {
			uiLayer.getContext("2d").clearRect(0, 0, uiLayer.width, uiLayer.height);
			uiLayer.removeEventListener("mousemove", wire_draw_handler);

			if (closest_pin) {
				circuitData.addEdge(lastClickedNode, closest_pin);
				circuitDrawer.renderEdges();
			}
			else if (!circuitData.pointIntersects(pos)) {
				var nid;
				var result = circuitDrawer.pointIntersects(pos, clickBox);
				if (result) {
					nid = circuitData.addWire(lastClickedNode, result.intersection);
					// splice node into circuitData
					circuitData.deleteEdge(result.from[0], result.from[1], result.to[0], result.to[1]);
					var newEdgePoint = [ nid, 0 ];
					circuitData.addEdge(result.from, newEdgePoint);
					circuitData.addEdge(newEdgePoint, result.to);
				} else {
					nid = circuitData.addWire(lastClickedNode, pos);
				}
				circuitDrawer.renderNode(circuitData.getNode(nid));
				circuitDrawer.renderEdges();
			}

			lastClickedNode = null;
		} else if (!closest_pin) {
			var result = circuitDrawer.pointIntersects(pos, clickBox);
			if (result) {
				// splice node into circuitData
				circuitData.deleteEdge(result.from[0], result.from[1], result.to[0], result.to[1]);
				var nid = circuitData.addWire(result.from, result.intersection);
				circuitDrawer.renderNode(circuitData.getNode(nid));
				lastClickedNode = [ nid, 0 ];
				circuitData.addEdge(lastClickedNode, result.to);
				circuitDrawer.renderEdges();
				uiLayer.addEventListener("mousemove", wire_draw_handler);
			} else {
				console.warn("Could not find closest node or edge");
			}
		} else { // !lastClickedNode && closest_pin
			lastClickedNode = closest_pin
			uiLayer.addEventListener("mousemove", wire_draw_handler);
		}
	}

	function canvas_click_handler (evt) {
		evt.preventDefault();

		var pos = window_to_canvas(edgeLayer, evt.clientX, evt.clientY);

		// console.log("User clicked at: "+pos.x+", "+pos.y);

		if (deleteMode) {
			handle_delete(pos);
		} else {
			handle_pin_connect(pos);
		}
	}

	function wire_draw_handler(evt) {
		// console.log("mouse moved");
		// console.log(evt);

		var pos = window_to_canvas(uiLayer, evt.clientX, evt.clientY);

		if (!lastClickedNode)
			return console.error("Could not get lastClickedNode this should not happen");

		var pin_pos = circuitData.pinPos(lastClickedNode[0], lastClickedNode[1], node_types, gridSize - connectionNodeRadius);

		var ctx = uiLayer.getContext("2d");
		
		ctx.clearRect(0, 0, uiLayer.width, uiLayer.height);
		
		ctx.save();

		ctx.setLineDash([5, 5]);

		ctx.beginPath();
		ctx.moveTo(pin_pos.x, pin_pos.y);
		ctx.lineTo(pos.x, pos.y);
		ctx.stroke();

		ctx.restore();
	}

	// simple URL parsing script courtesy of Sameer Kazi @ http://stackoverflow.com/questions/19491336/get-url-parameter-jquery-or-how-to-get-query-string-values-in-js
	function getUrlParameter(sParam) {
	    var sPageURL = decodeURIComponent(window.location.search.substring(1)),
	        sURLVariables = sPageURL.split('&'),
	        sParameterName,
	        i;

	    for (i = 0; i < sURLVariables.length; i++) {
	        sParameterName = sURLVariables[i].split('=');

	        if (sParameterName[0] === sParam) {
	            return sParameterName[1] === undefined ? true : sParameterName[1];
	        }
	    }
	};

})();