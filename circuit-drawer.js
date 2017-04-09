(function () {

	"use strict";

	// for debugging
	var DEBUG_DRAW_BB = false;

	// support class for rendering circuits from circuitData
	function CircuitDrawer(config) {
		this.nodeLayer = config.nodeLayer;
		this.edgeLayer = config.edgeLayer;
		this.circuitData = config.circuitData;
		this.nodeTypes = config.nodeTypes;
		this.pinRadius = config.pinRadius;
		this.ioStopX = config.gridSize - config.pinRadius;
		this.gridSize = config.gridSize;

		this.minPos = {
			x: 0,
			y: 0,
		};
		
		this.maxPos = {
			x: config.edgeLayer.width,
			y: config.edgeLayer.height,
		};

		this._wireLines = {};
	}

	// direction is an int: 0 = draw to left, 1 = draw to right, 2 = draw upwards, 3 = draw downwards
	// CircuitDrawer.DIR_LEFT = 0;
	// CircuitDrawer.DIR_RIGHT = 1;
	// CircuitDrawer.DIR_UP = 2;
	// CircuitDrawer.DIR_DOWN = 3;

	CircuitDrawer.prototype.renderAll = function(types) {
		this.renderIO();
		this.renderEdges();
		for (var nid in this.circuitData.graph) {
			var node = this.circuitData.graph[nid];
			if (node.type == LibCircuit.inputType || node.type == LibCircuit.outputType)
				continue;
			var img = types[node.type];
			var drawText = node.type != LibCircuit.wireType;
			this.renderNode(node, img, drawText);
		}
	}

	CircuitDrawer.prototype.renderIO = function() {
		var self = this;
		var ctx = this.nodeLayer.getContext("2d");

		ctx.save();

		ctx.font = "16px sans";

		var nInputs = this.circuitData.inputPins.length;
		var inputStep = this.nodeLayer.height / (nInputs + 1);

		ctx.clearRect(0, 0, this.ioStopX + 2 * this.pinRadius + 2, this.nodeLayer.height);

		drawPins(nInputs, this.circuitData.inputPins, inputStep, 0, this.ioStopX, true);

		var nOutputs = this.circuitData.outputPins.length;
		var outputStep = this.nodeLayer.height / (nOutputs + 1);

		ctx.clearRect(
			this.nodeLayer.width - (this.ioStopX + 2 * this.pinRadius + 2), 
			0, this.nodeLayer.width, this.nodeLayer.height
		);
		
		drawPins(nOutputs, this.circuitData.outputPins, outputStep, this.nodeLayer.width - this.ioStopX, this.nodeLayer.width, false);

		function drawPins(n, arr, step, startX, stopX, pinOnRight) {
			for (var i = 0; i < n; i++) {
				var y = ( i + 1 ) * step;
				var pin = arr[i];

				// update pin positions in graph
				var node = self.circuitData.graph[pin.nid];

				node.pos = { x: startX, y: y };
				
				node.rect = {
					x: startX,
					y: y,
					width: (stopX - startX) + 2 * self.pinRadius + 2,
					height: 20, // TODO is there a way to calculate this?
				};

				ctx.beginPath();
				ctx.moveTo(startX, y);
				ctx.lineTo(stopX, y);
				ctx.stroke();

				ctx.fillText(pin.name, startX + 4, y - 4);

				var pinX;
				if (pinOnRight) {
					pinX = stopX + self.pinRadius
				} else {
					pinX = startX - self.pinRadius
				}

				// node.pins[0].pos = { x: pinX, y: y };

				ctx.save();
				ctx.beginPath();
				ctx.arc(pinX, y, self.pinRadius, 0, 2 * Math.PI);
				ctx.fillStyle = "#000";
				ctx.fill();
				ctx.stroke();
				ctx.restore();

				ctx.save();
				ctx.font = "10px sans";
				ctx.fillText(pin.nid, startX, y + 10);
				ctx.restore();
			}
		}

		ctx.restore();
	}

	CircuitDrawer.prototype.updateNode = function(node, img, drawText, drawBoundingBox) {
		this.deleteNode(node.rect);
		this.renderNode(node, img, drawText, drawBoundingBox);
	}

	CircuitDrawer.prototype.renderNode = function(node, img, drawText, drawBoundingBox) {
		var pos = node.pos;
		var type = this.nodeTypes[node.type];
		var ctx = this.nodeLayer.getContext("2d");

		if (img) {
			ctx.drawImage(img, pos.x, pos.y);
		} else {
			ctx.save();
			ctx.beginPath();
			ctx.arc(pos.x, pos.y, this.pinRadius, 0, 2 * Math.PI);
			ctx.fillStyle = "#000";
			ctx.fill();
			ctx.restore();
		}

		if (drawText) {
			ctx.save();
			ctx.font = "10px sans";
			ctx.fillText(node.nid, pos.x + type.text_pos[0], pos.y + type.text_pos[1]);
			ctx.restore();
		}

		if (drawBoundingBox || DEBUG_DRAW_BB) {
			var rect = node.rect;
			ctx.save();
			ctx.setLineDash([5, 5]);
			ctx.strokeStyle = "#FF0000";
			ctx.strokeRect(rect.x+1, rect.y+1, rect.width-2, rect.height-2);
			ctx.restore();
		}
	}

	CircuitDrawer.prototype.deleteNode = function(rect) {
		var ctx = this.nodeLayer.getContext("2d");
		ctx.clearRect(rect.x, rect.y, rect.width, rect.height);
	}

	CircuitDrawer.prototype.renderEdges = function() {
		this._clearEdges();
		this._renderEdges();
	}

	CircuitDrawer.prototype._clearEdges = function() {
		this.edgeLayer.getContext("2d").clearRect(0, 0, this.edgeLayer.width, this.edgeLayer.height);
		this._wireLines = {};
	}

	function simple_route_wire(p1, p2, circuitData, fromID, toID) {
		// try the 2 combinations of component vectors first
		var p3 = {
			x: (p2.x - p1.x) + p1.x,
			y: p1.y,
		};
		var p4 = {
			x: p1.x,
			y: (p2.y - p1.y) + p1.y,
		};

		var polyLineList = [
			[ p1, p3, p2 ],
			[ p1, p4, p2 ],
		];

		var ignore_list = [ fromID, toID ];

		for (var i = polyLineList.length - 1; i >= 0; i--) {
			var polyLine = polyLineList[i];
			if (!circuitData.lineIntersects(polyLine, ignore_list)) {
				return polyLine;
			}
		};

		console.log("No polyline worked, falling back.");
		// no polyLine we tried worked, give up and just return any polyline
		return polyLineList[0];
	}

	function getPinPos(node, pid, circuitDrawer) {
		var pos = node.pos;
		var type = circuitDrawer.nodeTypes[node.type];
		if (type) {
			return {
				x: pos.x + type.pins[pid][0],
				y: pos.y + type.pins[pid][1],
			};
		} 
		else if (node.type == LibCircuit.inputType) {
			return {
				x: pos.x + circuitDrawer.ioStopX + circuitDrawer.pinRadius,
				y: pos.y
			};
		} 
		else if (node.type == LibCircuit.outputType) {
			return {
				x: pos.x - circuitDrawer.pinRadius,
				y: pos.y
			};
		} 
		else {
			return {
				x: pos.x,
				y: pos.y,
			};
		}
	}

	CircuitDrawer.prototype._renderEdge = function(ctx, fromTuple, toTuple) {
		var fromID = fromTuple[0];
		var toID = toTuple[0];

		var p1 = getPinPos(this.circuitData.getNode(fromID), fromTuple[1], this);
		var p2 = getPinPos(this.circuitData.getNode(toID), toTuple[1], this);

		var path;

		// try the 2 combinations of component vectors first
		var p3 = {
			x: (p2.x - p1.x) + p1.x,
			y: p1.y,
		};

		var p4 = {
			x: p1.x,
			y: (p2.y - p1.y) + p1.y,
		};

		var polyLineList = [
			[ p1, p3, p2 ],
			[ p1, p4, p2 ],
		];

		var ignore_list = [ fromID, toID ];

		for (var i = polyLineList.length - 1; i >= 0; i--) {
			var polyLine = polyLineList[i];
			if (!this.circuitData.lineIntersects(polyLine, ignore_list) && !this.polyLineIntersects(polyLine)) {
				path = polyLine;
				break;
			}
		};

		if (!path) {
			console.log("No polyline worked, falling back.");
			// no polyLine we tried worked, give up and just return any polyline
			path = polyLineList[0];
		}

		ctx.save();
		ctx.lineWidth = 1;
		ctx.beginPath();
		for (var i = 0; i < path.length-1; i++) {
			var u = path[i];
			var v = path[i+1];
			ctx.moveTo(u.x, u.y);
			ctx.lineTo(v.x, v.y);
		};
		ctx.stroke();
		ctx.restore();

		return path;
	}

	CircuitDrawer.prototype._renderEdges = function() {
		var ctx = this.edgeLayer.getContext("2d");

		var rendered_set = {};

		function edgeId(from, to) {
			return from[0]+"-"+from[1]+"-"+to[0]+"-"+to[1];
		}

		function alreadyRendered(from, to) {
			return rendered_set[edgeId(from, to)] || rendered_set[edgeId(to, from)]
		}

		for (var nid in this.circuitData.graph) {
			var node = this.circuitData.getNode(nid);
			for (var pid = node.pins.length - 1; pid >= 0; pid--) {
				var from = [ nid, pid ];
				var pin = node.pins[pid];
				for (var j = pin.adj.length - 1; j >= 0; j--) {
					var to = pin.adj[j];
					if (alreadyRendered(from, to)) continue;
					var eID = edgeId(from, to);
					this._wireLines[eID] = this._renderEdge(ctx, from, to);
					rendered_set[eID] = true;
				}

				// these nodes already have dots
				if (node.type == LibCircuit.wireType 
					|| node.type == LibCircuit.inputType 
					|| node.type == LibCircuit.outputType) {
					continue;
				}

				if (pin.adj.length >= 3) {
					var pin_pos = getPinPos(node, pid, this);
					ctx.save();
					ctx.beginPath();
					ctx.arc(pin_pos.x, pin_pos.y, this.pinRadius, 0, 2 * Math.PI);
					ctx.fillStyle = "#000";
					ctx.fill();
					ctx.restore();
				}
			}
		}
	}

	function circle_line_intersection(center, radius, line) {
		// finds the intersection between a circle and a line
		// the circle is assumed to be represented by the center (C, a 2d point vector) and a radius (r, scalar)
		// the line is assumed to be a 2-tuple of 2d point vectors
		var seg_a = new LibGeom.Vector2(line[0].x, line[0].y);
		var seg_b = new LibGeom.Vector2(line[1].x, line[1].y);
		var cir_pos = new LibGeom.Vector2(center.x, center.y);

		// find the vector A -> B
		var seg_v = seg_b.sub(seg_a);

		// find the vector A -> C
		var pt_v = cir_pos.sub(seg_a);

		var seg_v_unit = seg_v.div(seg_v.length());
		var proj = pt_v.dot(seg_v_unit);
		var closest;
		if (proj < 0) {
			// projection is "before" start of line segment
			closest = seg_a;
		} else if (proj > seg_v.length()) {
			// projection is "after" end of line segment
			closest = seg_b; 
		} else {
			// get vector of projection and convert to world-space
			closest = seg_v_unit.mult(proj).add(seg_a);
		}
		var rejection = cir_pos.sub(closest);
		if (rejection.length() <= radius) {
			return closest;
		} else {
			return null;
		}
	}

	function circle_polyline_intersects(center, radius, polyline) {
		for (var i = 0; i < polyline.length - 1; i++) {
			var intersection = circle_line_intersection(center, radius, [ polyline[i], polyline[i+1] ])
			if (intersection) {
				return intersection;
			}
		}
		return null;
	}

	CircuitDrawer.prototype.polyLineIntersects = function(points) {
		var a = new LibGeom.PolyLine(points);
		for (var edgeID in this._wireLines) {
			var b = new LibGeom.PolyLine(this._wireLines[edgeID]);
			var intercept = LibGeom.PolyLineIntersection(a, b);
			if (intercept)
				return intercept;
		}
		return null;
	}

	CircuitDrawer.prototype.pointIntersects = function(point, maxDist) {
		for (var edgeID in this._wireLines) {
			var intersection = circle_polyline_intersects(point, maxDist, this._wireLines[edgeID])
			if (intersection) {
				var edge = edgeID.split('-');
				return {
					from: [ edge[0], edge[1] ],
					to: [ edge[2], edge[3] ],
					intersection: intersection,
				};
			}
		}
		return null;
	}

	CircuitDrawer.prototype.clear = function() {
		this.nodeLayer.getContext("2d").clearRect(0, 0, this.nodeLayer.width, this.nodeLayer.height);
		this._clearEdges();
	}

	// running in node.js
	if (typeof window === 'undefined') {
		module.exports = CircuitDrawer;
	}
	// running in browser
	else {
		window.CircuitDrawer = CircuitDrawer;
	}
})()