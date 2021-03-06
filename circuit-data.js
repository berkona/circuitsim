(function () {

	"use strict";

	//polyfill for getting LibCircuit on node vs browser
	var LibCircuit;
	if (typeof window === 'undefined') {
		LibCircuit = require("./libcircuit");
	} else {
		LibCircuit = window.LibCircuit;
	}

	// handles data book-keeping for Circuits, can be exported to json-able file
	function CircuitData(simType) {
		// for compatibility with legacy code
		if (simType === undefined)
			simType = CircuitData.SIM_TYPE_TRANSISTOR;

		this.undoStack = [];
		this.graph = {};
		this.inputPins = [];
		this.outputPins = [];
		this.nNodes = 0;
		this.simType = simType;
	}

	CircuitData.SIM_TYPE_TRANSISTOR = "transistor";
	CircuitData.SIM_TYPE_GATE = "gate";

	CircuitData.prototype.getInputNames = function() {
		return this.inputPins.map(function (x) {
			return x.name;
		});
	}

	CircuitData.prototype.getOutputNames = function() {
		return this.outputPins.map(function (x) {
			return x.name;
		});
	}

	CircuitData.prototype.deleteEdge = function(fromNID, fromPID, toNID, toPID) {
		var self = this;

		function removeEdge(nid, pid, target_nid, target_pid) {
			var adj = self.adjPins(nid, pid);
			var toIdx = -1;
			for (var i = adj.length - 1; i >= 0; i--) {
				if (target_nid == adj[i][0] && target_pid == adj[i][1]) {
					toIdx = i;
					break;
				}
			}

			if (toIdx != -1) {
				adj.splice(toIdx, 1);
			} else {
				console.warn("Could not find edge for deletion, did it exist in graph?");
			}

			var undoIdx = -1;
			for (var i = self.undoStack.length - 1; i >= 0; i--) {
				var data = self.undoStack[i];
				if (data.undoType == 'edge' 
					&& data.fromId == nid 
					&& data.fromPin == pid 
					&& data.toId == target_nid
					&& data.toPin == target_pid) {
					undoIdx = i;
					break;
				}
			};

			if (undoIdx !== -1)
				self.undoStack.splice(undoIdx, 1);
		}

		removeEdge(fromNID, fromPID, toNID, toPID);
		removeEdge(toNID, toPID, fromNID, fromPID);
	}

	CircuitData.prototype.deleteNode = function(nid) {
		var type = this.graph[nid].type;
		
		// a bit of special handling for deleting io pins
		// if (type == LibCircuit.inputType || type == LibCircuit.outputType) {
		// 	var idx;
		// 	var io_lists = [ this.inputPins, this.outputPins ]
		// 	for (var i = io_lists.length - 1; i >= 0; i--) {
		// 		idx = io_lists[i].map(function (x) {
		// 			return x.nid;
		// 		}).indexOf(nid);

		// 		if (idx != -1) {
		// 			io_lists[i].splice(idx, 1);
		// 			break;
		// 		}
		// 	};
		// 	if (idx == -1)
		// 		console.warn("Could not delete io pin "+nid+" from inputPins/outputPins");
		// }

		delete this.graph[nid];

		// TODO figure out better way to perform edge deletion
		var edgesToDelete = [];
		for (var toNID in this.graph) {
			var node = this.graph[toNID];
			for (var i = node.pins.length - 1; i >= 0; i--) {
				var pin = node.pins[i];
				for (var j = pin.adj.length - 1; j >= 0; j--) {
					if (pin.adj[j][0] == nid)
						edgesToDelete.push([toNID, i, j]);
				}
			}
		}

		for (var i = edgesToDelete.length - 1; i >= 0; i--) {
			var tuple = edgesToDelete[i];
			var toNID = tuple[0];
			var toPID = tuple[1];
			var adjIdx = tuple[2];
			this.adjPins(toNID, toPID).splice(adjIdx, 1);
		};

		// see if we need to delete from undo stack
		var idx = -1;
		for (var i = this.undoStack.length - 1; i >= 0; i--) {
			var data = this.undoStack[i];
			if (data.undoType == 'node' && data.nid == nid) {
				idx = i;
				break;
			}
		};

		if (idx != -1)
			this.undoStack.splice(idx, 1);
	}

	CircuitData.prototype.addIOName = function(name, isInput) {
		var type, pins;
		if (isInput) {
			type = LibCircuit.inputType;
			pins = this.inputPins;
		} else { // is an output pin
			type = LibCircuit.outputType;
			pins = this.outputPins;
		}

		pins.push({
			name: name
		});
	}

	// special handling for IO b/c we don't have images/typedefs for them
	CircuitData.prototype.addIO = function (name, pos, rect, isInput) {
		var type;
		if (isInput) {
			type = LibCircuit.inputType;
			// pins = this.inputPins;
		} else { // is an output pin
			type = LibCircuit.outputType;
			// pins = this.outputPins;
		}

		var nid = String(this.nNodes++);

		// var rect = {
		// 	x: pos.x,
		// 	y: pos.y,
		// 	width: wireSize + 2 * wireSize,
		// 	height: 2 * wireSize + 2,
		// };

		// for compatiblity with export add to graph
		var node = {
			nid: nid,
			type: type,
			name: name,
			pos: pos,
			rect: rect,
			pins: [{
				adj: [],
			}]
		}

		this.graph[nid] = node;

		// pins.push({
		// 	name: name,
		// 	nid: nid,
		// })

		this.undoStack.push({
			undoType: 'node',
			nid: nid,
		});

		return nid;
	}
	/**
	 * Take two existing edges aTuple->bTuple & cTuple->dTuple and add a new wire connecting the two at posAB, posCD
	 */
	CircuitData.prototype.splice4 = function(aTuple, bTuple, posAB, cTuple, dTuple, posCD) {
		var nidAB = String(this.nNodes++);
		var nodeAB = createWireNode(nidAB, posAB);
		this.graph[nidAB] = nodeAB;

		var nidCD = String(this.nNodes++);
		var nodeCD = createWireNode(nidCD, posCD);
		this.graph[nidCD] = nodeCD;

		this.deleteEdge(aTuple[0], aTuple[1], bTuple[0], bTuple[1]);
		this.deleteEdge(cTuple[0], cTuple[1], dTuple[0], dTuple[1]);

		this.addEdge(aTuple, [nidAB, 0], true);
		this.addEdge([nidAB, 0], bTuple, true);

		this.addEdge(cTuple, [nidCD, 0], true);
		this.addEdge([nidCD, 0], dTuple, true);

		this.addEdge([nidAB, 0], [nidCD, 0], true);

		this.undoStack.push({
			undoType: 'splice4',
			wireAB: nidAB,
			wireCD: nidCD,
			a: aTuple,
			b: bTuple,
			c: cTuple,
			d: dTuple,
		});

		return [ nidAB, nidCD ];
	}

	/**
	 * Take an existing edge fromTuple->toTuple and insert a new wire node at pos,
	 * Then add an edge from wire node to targetTuple
	 */
	CircuitData.prototype.splice3 = function(fromTuple, toTuple, targetTuple, pos) {
		// create new wire
		var nid = String(this.nNodes++);
		var node = createWireNode(nid, pos);
		this.graph[nid] = node;

		// remove edge from->to
		this.deleteEdge(fromTuple[0], fromTuple[1], toTuple[0], toTuple[1]);

		// add edge from->new
		this.addEdge(fromTuple, [nid, 0], true);

		// add edge new->to
		this.addEdge([ nid, 0], toTuple, true);
 		
 		// add edge new->target
		this.addEdge([nid, 0], targetTuple, true);

		// add to undo stack
		this.undoStack.push({
			undoType: 'splice3',
			wire: nid,
			from: fromTuple,
			to: toTuple,
			target: targetTuple,
		});

		return nid;
	}

	var wireSize = 8;
	
	function createWireNode(nid, pos) {
		return {
			nid: nid,
			type: LibCircuit.wireType,
			pos: pos,
			rect: {
				x: pos.x - wireSize,
				y: pos.y - wireSize,
				width: 2 * wireSize,
				height: 2 * wireSize,
			},
			pins: [{
				adj: [],
			}],
		};
	}

	/**
	 * Add a wire w/o a connecting edge
	 */
	CircuitData.prototype.addWireBare = function(pos) {
		var nid = String(this.nNodes++);
		var node = createWireNode(nid, pos);
		this.graph[nid] = node;
		
		this.undoStack.push({
			undoType: 'node',
			nid: nid,
		});

		return nid;
	}

	CircuitData.prototype.addWire = function(fromTuple, pos) {
		var nid = String(this.nNodes++);
		var node = createWireNode(nid, pos);

		this.undoStack.push({
			undoType: 'node',
			nid: nid,
		});

		this.graph[nid] = node;

		this.addEdge(fromTuple, [nid, 0]);

		return nid;
	}

	CircuitData.prototype.addNode = function(tid, type, pos, rect) {
		var nid = String(this.nNodes++);
		
		var node = {
			nid: nid,
			type: tid,
			pos: pos,
			rect: rect,
			pins: [],
		}

		for (var i = 0; i < type.pins.length; i++) {
			var pin = {
				adj: [],
			};

			node.pins.push(pin);
		};


		this.undoStack.push({
			undoType: 'node',
			nid: nid,
		});

		this.graph[nid] = node;

		return nid;
	};

	CircuitData.prototype.moveNode = function(nid, pos, rect, noUndo) {
		var node = this.graph[nid];
		var oldPos = node.pos;
		var oldRect = node.rect;

		node.pos = pos;
		node.rect = rect;

		if (!noUndo) {
			this.undoStack.push({
				undoType: 'move',
				nid: nid,
				pos: oldPos,
				rect: oldRect,
			});
		}
	}

	CircuitData.prototype.addEdge = function(fromTuple, toTuple, noUndo) {
		var fromId = fromTuple[0];
		var fromPin = fromTuple[1];
		var toId = toTuple[0];
		var toPin = toTuple[1];

		if (fromId == toId) {
			console.log("Got loopback edge, ignoring");
			return;
		}

		// console.log("Adding edge from ("+fromId+","+fromPin+") to ("+toId+","+toPin+")");

		var fromNode = this.graph[fromId];
		
		// check if edge is redundant, since all edges are symmetric we only need to check fromNode's adj
		for (var i = fromNode.pins[fromPin].adj.length - 1; i >= 0; i--) {
			var tuple = fromNode.pins[fromPin].adj[i];
			if (tuple[0] == toId && tuple[1] == toPin) {
				console.log("Got redundant edge, ignoring");
				return;
			}
		};

		fromNode.pins[fromPin].adj.push(toTuple);

		var toNode = this.graph[toId];
		toNode.pins[toPin].adj.push(fromTuple);

		if (!noUndo) {
			this.undoStack.push({
				undoType: 'edge',
				fromId: fromId,
				fromPin: fromPin,
				toId: toId,
				toPin: toPin,
			});
		}
	}

	CircuitData.prototype.adjPins = function(nid, pid) {
		return this.graph[nid].pins[pid].adj;
	}

	CircuitData.prototype.getNode = function(nid) {
		return this.graph[nid];
	}

	CircuitData.prototype.getPin = function(nid, pid) {
		return this.graph[nid].pins[pid]
	}

	CircuitData.prototype._intersects = function(object, rejection_func, ignore_list) {
		var nids = Object.keys(this.graph);
		if (ignore_list) {
			nids = nids.filter(function (item) {
				return ignore_list.indexOf(item) === -1;
			});
		}

		var nIntercepts = 0;
		for (var i = nids.length - 1; i >= 0; i--) {
			var rect = this.graph[nids[i]].rect;
			if (rect == null) continue;
			if (rejection_func(object, rect))
				nIntercepts++;
		};
		return nIntercepts;
	}

	function rect_intersects(r1, r2) {
	    return r1.x < r2.x + r2.width && r1.x + r1.width > r2.x && r1.y < r2.y + r2.height && r1.y + r1.height > r2.y;
	}

	CircuitData.prototype.rectIntersects = function(rect, ignore_list) {
		return this._intersects(rect, rect_intersects, ignore_list);
	}

	function point_intersects(point, rect) {
		return point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
	}

	CircuitData.prototype.pointIntersects = function(point, ignore_list) {
		return this._intersects(point, point_intersects, ignore_list);
	}

	// determines if p1->p2 intersects rect
	function line_intersects(p1, p2, rect) {
		// special case 1: line is vertical
		if (p1.x == p2.x) {
			var isBetween = p1.x >= rect.x && p1.x <= rect.x + rect.width;
			if (!isBetween) return false;
			// swap so we know p1 is above p2 (visually), coord system is swapped such that (0, 0) is top-left
			if (p1.y > p2.y) {
				var tmp = p2;
				p2 = p1
				p1 = tmp;
			}
			return p2.y >= rect.y && p1.y <= rect.y + rect.height;
		} 
		// special case 2: line is horizontal
		else if (p1.y == p2.y) {
			var isBetween = p1.y >= rect.y && p1.y <= rect.y + rect.height;
			if (!isBetween) return false;
			// swap so p1 is before p2
			if (p2.x < p1.x) {
				var tmp = p2;
				p2 = p1;
				p1 = tmp;
			}
			return p2.x >= rect.x && p1.x <= rect.x + rect.width;
		} else {
			// not supported atm
			// right now, a line is only not either case if it connects two points not on the grid points
			// this only happens as the last leg connecting wire to connecting node, but we don't care
			// about intersections of these
			// console.warn("Unsupported line type in line_intersects");
			return false;
		}
	}

	function polyline_intersects(polyline, rect) {
		for (var j = polyline.length - 1; j >= 1; j--) {
			if (line_intersects(polyline[j], polyline[j-1], rect))
				return true;
		};
		return false;
	}

	// accepts a poly-line as a list of at least 2 points representing p1 to p2 to ... to pN-1 to pN
	// optional ignore_list is a list of nid's that user doesn't care about
	CircuitData.prototype.lineIntersects = function(polyline, ignore_list) {
		return this._intersects(polyline, polyline_intersects, ignore_list);
	}

	CircuitData.prototype.closestNode = function(pos, maxDist) {
		for (var nid in this.graph) {
			var node = this.graph[nid];
			if (point_intersects(pos, node.rect)) {
				return nid;
			}
		}
	}

	CircuitData.prototype.pinPos = function(nid, pid, nodeTypes, ioX) {
		return getPinPos(this.getNode(nid), pid, nodeTypes, ioX);
	}

	function getPinPos(node, pid, nodeTypes, ioX) {
		var type = nodeTypes[node.type];
		if (type) {
			return {
				x: node.pos.x + type.pins[pid][0],
				y: node.pos.y + type.pins[pid][1],
			};
		} 
		// else if (node.type == LibCircuit.inputType) {
		// 	return {
		// 		x: node.pos.x + ioX,
		// 		y: node.pos.y,
		// 	};
		// }
		else {
			return {
				x: node.pos.x,
				y: node.pos.y,
			};
		}
	}

	function point_distance(p1, p2) {
		var dX = p2.x - p1.x;
		var dY = p2.y - p1.y;
		return Math.sqrt(dX * dX + dY * dY);
	}

	CircuitData.prototype.closestPin = function(pos, maxDist, nodeTypes, ioX) {
		var closest_pin;
		var best_dist = maxDist;
		// find connection node within the circle defined by clickBox
		for (var nid in this.graph) {
			var node = this.graph[nid];
			for (var pid in node.pins) {
				// var pin = node.pins[pid];
				var pin_pos = getPinPos(node, pid, nodeTypes, ioX);
				var dist = point_distance(pin_pos, pos);
				if (dist <= best_dist) {
					closest_pin = [nid, pid];
					// break;
				}
			}
			// if (closest_pin) break;
		}

		return closest_pin;
	}

	CircuitData.prototype.canUndo = function() {
		return this.undoStack.length != 0;
	}

	CircuitData.prototype.undo = function() {
		if (!this.canUndo())
			throw "Undo stack underflow.  Did you check CircuitData.canUndo()?"

		var data = this.undoStack.pop();
		
		var undoRect = null;

		var undoType = data.undoType
		// perform node deletion
		if (undoType == 'node') {
			var type = this.getNode(data.nid).type;
			// for compatibility with client code
			if (type == LibCircuit.inputType || type == LibCircuit.outputType) {
				undoType = 'io'
			}
			undoRect = this.graph[data.nid].rect;
			this.deleteNode(data.nid);
		} else if (undoType == 'move') {
			this.moveNode(data.nid, data.pos, data.rect, true);
		}
		// perform edge deletion
		else if (undoType == 'edge') {
			this.deleteEdge(data.fromId, data.fromPin, data.toId, data.toPin);
		} 
		else if (undoType == 'splice3') {
			this.addEdge(data.from, data.to);
			this.deleteEdge(data.from[0], data.from[1], data.wire, 0);
			this.deleteEdge(data.wire, 0, data.to[0], data.to[1]);
			this.deleteEdge(data.wire, 0, data.target[0], data.target[1]);
			this.deleteNode(data.wire);
		}
		else if (undoType == 'splice4') {
			this.addEdge(data.a, data.b);
			this.addEdge(data.c, data.d);
			this.deleteEdge(data.a[0], data.a[1], data.wireAB, 0);
			this.deleteEdge(data.wireAB, 0, data.b[0], data.b[1]);
			this.deleteEdge(data.c[0], data.c[1], data.wireCD, 0);
			this.deleteEdge(data.wireCD, 0, data.d[0], data.d[1]);
			this.deleteEdge(data.wireAB, 0, data.wireCD, 0);
			this.deleteNode(data.wireAB);
			this.deleteNode(data.wireCD);
		}
		else {
			console.warn("Unknown undo type in undo stack");
		}

		return [ undoType, undoRect ];
	}

	CircuitData.prototype.clear = function() {
		this.undoStack = [];
		this.graph = {};
		this.nNodes = 0;
		this.inputPins = [];
		this.outputPins = [];
	}

	CircuitData.prototype.export = function() {
		var data = {};
		for (var key in this) {
			data[key] = this[key];
		}
		data.version = latest_file_version;
		return data;
	}

	var latest_file_version = "7";

	var converter_map = {
		"0": version_0_converter,
		"1": version_1_converter,
		"2": version_2_converter,
		"3": version_3_converter,
		"4": version_4_converter,
		"5": version_5_converter,
		"6": version_6_converter,
	};

	// version 1 reduces file size by removing redundant data
	function version_0_converter(data) {
		for (var i = data.undoStack.length - 1; i >= 0; i--) {
			delete data.undoStack[i].node;
		};
		data.version = "1";
		return data;
	}

	// version 2 adds the ability to undo IO pins
	function version_1_converter(data) {
		var combined = data.inputPins.concat(data.outputPins);
		for (var i = combined.length - 1; i >= 0; i--) {
			data.undoStack.unshift({
				undoType: 'io',
				nid: combined[i].nid,
			});
		};
		data.version = "2";
		return data;
	}

	// version 3 unified 'node' and 'io' undo types
	function version_2_converter(data) {
		for (var i = data.undoStack.length - 1; i >= 0; i--) {
			if (data.undoStack[i].undoType == 'io') {
				data.undoStack[i].undoType = 'node';
			}
		};
		data.version = "3";
		return data;
	}

	// version 4 adds a type to CircuitData which distinguishes between transistor and gate graphs
	function version_3_converter(data) {
		// everything before version 3 was a transistor type
		data.simType = CircuitData.SIM_TYPE_TRANSISTOR;
		data.version = "4";
		return data;
	}

	// version 5 removed positional data for pins and text
	function version_4_converter(data) {
		for (var nid in data.graph) {
			delete data.graph[nid].text_pos;
			for (var i = data.graph[nid].pins.length - 1; i >= 0; i--) {
				delete data.graph[nid].pins[i].pos
			};
		}
		data.version = "5";
		return data;
	}

	function transform_position(pos, oldRect, newRect) {
		return {
			x: (pos.x - oldRect.minX) * (newRect.maxX - newRect.minX) / (oldRect.maxX - oldRect.minX) + newRect.minX,
			y: (pos.y - oldRect.minY) * (newRect.maxY - newRect.minY) / (oldRect.maxY - oldRect.minY) + newRect.minY
		};
	}

	// version 6 changed size of canvas
	function version_5_converter(data) {
		var oldRect = {
			minX: 0,
			maxX: 640,
			minY: 0,
			maxY: 480,
		};
		var newRect = {
			minX: 0,
			maxX: 800,
			minY: 0,
			maxY: 600,
		};
		for (var nid in data.graph) {
			var node = data.graph[nid];
			node.pos = transform_position(node.pos, oldRect, newRect);
			// no idea why wireType nodes are off by 11 px
			if (node.type == LibCircuit.wireType) {
				node.pos.x -= 11;
			}
			data.graph[nid] = node;
		}
		data.version = "6";
		return data;
	}

	// version 7 removed NIDs from inputPins/outputPins, and unified IO node and normal node representation
	function version_6_converter(data) {
		function ioPinConverter(x) { return { name: x.name }; }

		data.inputPins = data.inputPins.map(ioPinConverter);
		data.outputPins = data.outputPins.map(ioPinConverter);
		
		for (var nid in data.graph) {
			var node = data.graph[nid];
			// why weren't we storing this to begin with?
			if (node.type == LibCircuit.inputType || node.type == LibCircuit.outputType) {
				node.nid = nid;
			}
		}

		data.version = "7";
		return data;
	}

	CircuitData.prototype.import = function(data, boundingBoxFn) {
		if (!data.version)
			data.version = "0";

		while (data.version != latest_file_version) {
			var converter_func = converter_map[data.version];
			if (converter_func) {
				// console.log("Converting file from version "+data.version);
				// console.log(data);
				data = converter_func(data);
				// console.log("File is now version "+data.version);
				// console.log(data);
			} else {
				throw "Invalid file version: "+data.version;
			}
		}

		delete data.version;

		if (boundingBoxFn) {
			for (var nid in data.graph) {
				data.graph[nid].rect = boundingBoxFn(data.graph[nid].type, data.graph[nid].pos);
			}
		}

		for (var key in data) {
			this[key] = data[key];
		}
	}

	// running in node.js
	if (typeof window === 'undefined') {
		module.exports = CircuitData;
	}
	// running in browser
	else {
		window.CircuitData = CircuitData;
	}

})()