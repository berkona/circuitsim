"use strict";

(function () {

	// minbinheap
	function PriorityQueue(cmpFunc) {
		this.cmpFunc = cmpFunc;
		this.heap = [];
		this.count = 0;
		this.indices = {};
	}

	PriorityQueue.prototype.enqueue = function(data) {
		var hole = ++this.count;
		this.heap[hole] = data;
		this.indices[data] = hole;
		this._bubbleUp(hole);
	}

	PriorityQueue.prototype.isEmpty = function() {
		return this.count == 0;
	}
	PriorityQueue.prototype.getMin = function() {
		return this.heap[1];
	}

	PriorityQueue.prototype.dequeue = function() {
		if (this.isEmpty()) return null;

		var data = this.getMin();
		delete this.indices[data];
		this.heap[1] = this.heap[this.count--];
		this._bubbleDown(1);
		return data;
	}

	PriorityQueue.prototype.decreaseKey = function(key) {
		var idx = this.indices[key];
		this._bubbleUp(idx);
	}

	PriorityQueue.prototype._swap = function(x, y) {
		var valX = this.heap[x];
		var valY = this.heap[y];
		this.heap[x] = valY
		this.heap[y] = valX
		this.indices[valY] = x;
		this.indices[valX] = y;
	}

	PriorityQueue.prototype._bubbleUp = function(hole) {
		for (; this.cmpFunc(this.heap[hole], this.heap[hole/2]) < 0; hole /= 2) {
			this._swap(hole, hole/2);
		}
	}

	PriorityQueue.prototype._bubbleDown = function(hole) {
		var child;
		for (; hole * 2 <= this.count; hole = child) {
			child = hole * 2;
			if (child != this.count && this.cmpFunc(this.heap[child + 1], this.heap[child]) < 0)
				child++;

			if (this.cmpFunc(this.heap[child], this.heap[hole]) < 0) {
				this._swap(hole, child);
			} else {
				break;
			}
		}
	}

	function GridMap(gridSize, acceptFunc) {
		this.gridSize = gridSize;
		this.acceptFunc = acceptFunc;
	}

	GridMap.prototype.adj = function(pos) {
		var dirs = [ 
			[this.gridSize, 0], 
			[0, this.gridSize], 
			[-this.gridSize, 0], 
			[0, -this.gridSize] 
		]

		var result = [];

		for (var i = dirs.length - 1; i >= 0; i--) {
			var d = dirs[i];
			var p = {
				x: pos.x + d[0],
				y: pos.y + d[1],
			}
			if (this.acceptFunc(p)) {
				result.push(p);
			}
		};

		return result;
	}


	// assumes from and to, min and max are position vectors and aligned with gridSize
	function a_star(from, to, min, max, gridSize, hueristicFunc) {

		var width = Math.floor(max.x - min.x);
		var height = Math.floor(max.y - min.y);

		var wIdx = width / gridSize;
		var hIdx = height / gridSize;

		function to_idx(pos) {
			return Math.floor((pos.x - min.x)/ gridSize) + wIdx * Math.floor((pos.y - min.y)/gridSize);
		}

		function from_idx(idx) {
			var yIdx = Math.floor(idx / wIdx);
			var y = gridSize * yIdx + min.y;
			var x = gridSize * (idx - wIdx * yIdx) + min.x;
			return {
				x: x,
				y: y,
			};
		}

		function make_path(current) {
			var path = [ current ];
			while (true) {
				var idx = to_idx(current)
				if (!came_from[idx])
					break;

				current = came_from[idx];
				path.push(current);
			}
			return path;
		}

		var start_idx = to_idx(from);

		function accept(pos) {
			return pos.x >= min.x && pos.x <= max.x && pos.y >= min.y && pos.y <= max.y; 
		}

		var map = new GridMap(gridSize, accept);

		var closed_set = {}, open_set = {}, came_from = {}, g_score = {}, f_score = {};

		// f_score defaults to Number.Infinity
		for (var i = 0; i < wIdx*hIdx; i++) {
			f_score[i] = Number.POSITIVE_INFINITY;
		}

		open_set[start_idx] = true;
		g_score[start_idx] = 0;
		f_score[start_idx] = hueristicFunc(from, to);

		while (Object.keys(open_set).length !== 0) {
			// ideally we'd use a pq, but f_score changes alot and remains fairly small so this is probably fine
			var min_f_score = Number.POSITIVE_INFINITY;
			var current_idx = null;
			for (var idx in open_set) {
				var f = f_score[idx];
				if (f < min_f_score) {
					current_idx = idx;
					min_f_score = f;
				}
			}
			var current = from_idx(current_idx);

			// console.log("looking at idx "+current_idx+" pos ("+current.x+","+current.y+")");

			if (current.x == to.x && current.y == to.y)
				return make_path(current);

			delete open_set[current_idx];
			closed_set[current_idx] = true;

			var adj = map.adj(current);
			for (var i = adj.length - 1; i >= 0; i--) {
				var neighbor = adj[i];
				var nIdx = to_idx(neighbor);

				// console.log("Neighbor: idx "+nIdx+" pos ("+neighbor.x+","+neighbor.y+")");

				// ignore already evaluated neighbors
				if (closed_set[nIdx])
					continue;
				
				// distance from start to neighbor
				var tentative_score = g_score[current_idx] + hueristicFunc(current, neighbor);
				// newNode
				if (!open_set[nIdx]) {
					open_set[nIdx] = true;
				} else if (tentative_score >= g_score[nIdx]) {
					continue;
				}

				came_from[nIdx] = current;
				g_score[nIdx] = tentative_score;
				f_score[nIdx] = g_score[nIdx] + hueristicFunc(neighbor, to);
			};
		}

		return null;
	}

	// running in node.js
	if (typeof window === 'undefined') {
		module.exports = a_star;
	}
	// running in browser
	else {
		window.LibAStar = a_star;
	}

})();