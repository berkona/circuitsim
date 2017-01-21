
"use strict";

(function () {

	// handles data book-keeping for Circuits, can be exported to json-able file
	function CircuitData() {
		this.undoStack = [];
		this.graph = {};
		this.inputPins = [];
		this.outputPins = [];
		this.nNodes = 0;
	}

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
		}

		removeEdge(fromNID, fromPID, toNID, toPID);
		removeEdge(toNID, toPID, fromNID, fromPID);
	}

	CircuitData.prototype.deleteNode = function(nid) {
		var type = this.graph[nid].type;
		
		// a bit of special handling for deleting io pins
		if (type == LibCircuit.inputType || type == LibCircuit.outputType) {
			var idx;
			var io_lists = [ this.inputPins, this.outputPins ]
			for (var i = io_lists.length - 1; i >= 0; i--) {
				idx = io_lists[i].map(function (x) {
					return x.nid;
				}).indexOf(nid);

				if (idx != -1) {
					io_lists[i].splice(idx, 1);
					break;
				}
			};
			if (idx == -1)
				console.warn("Could not delete io pin "+nid+" from inputPins/outputPins");
		}

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

	// special handling for IO b/c we don't have images/typedefs for them
	CircuitData.prototype.addIO = function (name, isInput) {
		var type, pins;
		if (isInput) {
			type = LibCircuit.inputType;
			pins = this.inputPins;
		} else { // is an output pin
			type = LibCircuit.outputType;
			pins = this.outputPins;
		}

		var nid = String(this.nNodes++);

		// for compatiblity with export add to graph
		var node = {
			type: type,
			name: name,
			pos: null,
			rect: null,
			pins: [{
				pos: null,
				adj: [],
			}]
		}

		this.graph[nid] = node;

		pins.push({
			name: name,
			nid: nid,
		})

		this.undoStack.push({
			undoType: 'node',
			nid: nid,
		});

		return nid;
	}

	var wireSize = 5;

	CircuitData.prototype.addWire = function(fromTuple, pos) {
		var nid = String(this.nNodes++);
		var node = {
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
				pos: pos,
				adj: [],
			}],
		};

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
			text_pos: {
				x: pos.x + type.text_pos[0],
				y: pos.y + type.text_pos[1],
			},
			rect: rect,
			pins: [],
		}

		for (var i = 0; i < type.pins.length; i++) {
			var pin_pos = type.pins[i];
			var pin = {
				pos: {
					x: pos.x + pin_pos[0],
					y: pos.y + pin_pos[1],
				},
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

	CircuitData.prototype.addEdge = function(fromTuple, toTuple) {
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
		fromNode.pins[fromPin].adj.push(toTuple);

		var toNode = this.graph[toId];
		toNode.pins[toPin].adj.push(fromTuple);

		this.undoStack.push({
			undoType: 'edge',
			fromId: fromId,
			fromPin: fromPin,
			toId: toId,
			toPin: toPin,
		});
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

		for (var i = nids.length - 1; i >= 0; i--) {
			var rect = this.graph[nids[i]].rect;
			if (rect == null) continue;
			if (rejection_func(object, rect))
				return true;
		};

		return false;
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
			console.warn("Unsupported line type in line_intersects");
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

	function point_distance(p1, p2) {
		var dX = p2.x - p1.x;
		var dY = p2.y - p1.y;
		return Math.sqrt(dX * dX + dY * dY);
	}

	CircuitData.prototype.closestNode = function(pos, maxDist) {
		for (var nid in this.graph) {
			var node = this.graph[nid];
			if (point_intersects(pos, node.rect)) {
				return nid;
			}
		}
	}

	CircuitData.prototype.closestPin = function(pos, maxDist) {
		var closest_pin;

		// find connection node within the circle defined by clickBox
		for (var nid in this.graph) {
			var node = this.graph[nid];
			for (var pid in node.pins) {
				var pin = node.pins[pid];
				var dist = point_distance(pin.pos, pos);
				if (dist <= maxDist) {
					closest_pin = [nid, pid];
					break;
				}
			}
			if (closest_pin) break;
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

		// perform node deletion
		if (data.undoType == 'node') {
			undoRect = this.graph[data.nid].rect;
			this.deleteNode(data.nid);
		}
		// perform edge deletion
		else if (data.undoType == 'edge') {
			this.deleteEdge(data.fromId, data.fromPin, data.toId, data.toPin);
		} else {
			console.warn("Unknown undo type in undo stack");
		}

		return [ data.undoType, undoRect ];
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

	var latest_file_version = "2";

	var converter_map = {
		"0": unversioned_converter,
		"1": version_1_converter,
	};

	// version 1 reduces file size by removing redundant data
	function unversioned_converter(data) {
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
				undoType: 'node',
				nid: combined[i].nid,
			});
		};
		data.version = "2";
		return data;
	}

	CircuitData.prototype.import = function(data) {
		if (!data.version)
			data.version = "0";

		while (data.version != latest_file_version) {
			var converter_func = converter_map[data.version];
			if (converter_func) {
				console.log("Converting file from version "+data.version);
				console.log(data);
				data = converter_func(data);
				console.log("File is now version "+data.version);
				console.log(data);
			} else {
				throw "Invalid file version: "+data.version;
			}
		}

		delete data.version;

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