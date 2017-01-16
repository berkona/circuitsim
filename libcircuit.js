
(function() {

	var root = this;

	var inputType = 'input';
	var outputType = 'output';
	var pmosType = 'pmos';
	var nmosType = 'nmos';
	var vccType = 'vcc';
	var gndType = 'gnd';
	var wireType = 'wire';

	root.inputType = inputType;
	root.outputType = outputType;
	root.pmosType = pmosType;
	root.nmosType = nmosType;
	root.vccType = vccType;
	root.gndType = gndType;
	root.wireType = wireType;

	var pinNames = [
		"source",
		"gate",
		"drain"
	]

	root.pinNames = pinNames;

	// this runs all checks in the order intended to be run
	// returns either null for all good or a message if errored somewhere
	// many of these checks are built on the assumption that all the checks before them already being run with a good result
	// it might be possible to revalulate the checks and refactor them to run even without previous checks being successful
	root.runAllChecks = function(circuitData) {

		var allChecks = [
			[ root.ioCheck, 'IO Check' ],
			[ root.powerCheck, 'Power Check' ],
			[ root.parityCheck, 'Parity Check' ],
			[ root.shortCheck, 'Short Check' ],
			[ root.selfShortCheck, 'Self Short Check' ],
			[ root.allPinsConnected, 'All Pins Connected' ],
		];

		for (var i = 0; i < allChecks.length; i++) {
			var result = allChecks[i][0](circuitData);
			if (result) return [ allChecks[i][1], result ];
		}

		return null;
	}

	// circuitData is a object as exported by CircuitData.export
	// returns either null if circuitData has at least 1 input and 1 output 
	// or a string describing the error in english
	root.ioCheck = function(circuitData) {
		var nInputs = 0;
		var nOutputs = 0;

		var nNodes = 0;
		for (var nid in circuitData) {
			var node = circuitData[nid];
			var type = node.type;

			if (type == inputType) {
				nInputs++;
			} else if (type == outputType) {
				nOutputs++;
			}
			nNodes++;
		}

		if (nInputs == 0) {
			return "Circuit does not have any inputs."
		} else if (nOutputs == 0) {
			return "Circuit does not have any outputs."
		} else if (nInputs + nOutputs == nNodes) {
			return "Circuit has only inputs and outputs."
		} else {
			return null;
		}
	}

	// asserts that |{x in circuitData : x.type == 'pmos' }| == |{ x in circuitData : x.type == 'nmos' }|
	// this is based on the assumption that all valid CMOS circuits have an equal amount of pmos and nmos transistors
	// TODO make sure this is necessarily true by induction or some other proof method
	root.parityCheck = function(circuitData) {
		var nPMOS = 0
		var nNMOS = 0

		for (var nid in circuitData) {
			var node = circuitData[nid];
			var type = node.type;
			if (type == pmosType) {
				nPMOS++;
			} else if (type == nmosType) {
				nNMOS++;
			}
		}

		if (nPMOS == 0) {
			return "Circuit does not contain any PMOS transistors.";
		} else if (nNMOS == 0) {
			return "Circuit does not contain any NMOS transistors.";
		} else if (nPMOS != nNMOS) {
			return "Circuit does not contain an equal number of PMOS and NMOS transistors.";
		} else { // nPMOS == nNMOS
			return null;
		}
	}

	// test if at least 1 Vcc and GND is present 
	root.powerCheck = function(circuitData) {
		var nvcc = 0;
		var ngnd = 0;

		for (var nid in circuitData) {
			var type = circuitData[nid].type;
			if (type == vccType) {
				nvcc++;
			} else if (type == gndType) {
				ngnd++;
			}
		}

		if (nvcc == 0) {
			return "Circuit does not contain a source node.";
		} else if (ngnd == 0) {
			return "Circuit does not contain a ground node.";
		} else {
			return null;
		}
	}

	// goes down all paths of pin represented by nid, pid running func at each pin
	function circuitTraverser(circuitData, nid, pid, func, parent) {
		func(nid, pid);
		var adj = circuitData[nid].pins[pid].adj;
		for (var i = adj.length - 1; i >= 0; i--) {
			var to = adj[i];
			var toNID = to[0];
			var toPID = to[1];
			if (toNID != parent)
				circuitTraverser(circuitData, toNID, toPID, func, nid);
		};
	}

	// test if source is connected directly to ground
	root.shortCheck = function(circuitData) {
		var error = null;
		for (var nid in circuitData) {
			var node = circuitData[nid];
			if (node.type != vccType) continue;
			function isGround(toNID, toPID) {
				if (circuitData[toNID].type == gndType)
					error = "Source node "+node.nid+" is shorted to ground node "+toNID+".";
			}
			circuitTraverser(circuitData, nid, 0, isGround);
		}
		return error;
	}

	// test if any node is connected to itself
	root.selfShortCheck = function(circuitData) {
		for (var nid in circuitData) {
			var node = circuitData[nid];
			for (var i = node.pins.length - 1; i >= 0; i--) {
				var pin = node.pins[i];
				for (var i = pin.adj.length - 1; i >= 0; i--) {
					var toNID = pin.adj[i][0];
					if (nid == toNID) {
						return "Node "+nid+" is connected to itself."
					}
				};
			};
		};

		return null;
	}

	// verifies all pins are connected
	root.allPinsConnected = function(circuitData) {
		for (var nid in circuitData) {
			var node = circuitData[nid];
			for (var i = node.pins.length - 1; i >= 0; i--) {
				if (node.pins[i].adj.length == 0)
					return "Node "+nid+", pin "+pinNames[i]+" was not connected."
			};
		}
	}

	root.simpleCycle = function(circuitData) {
		var error = null;
		return null;
	}

	// test if circuit is truly combinational
	root.combCheck = function(circuitData) {
		return null;
	}

	function simulateInputs(circuitData, inputMap) {

		//propogate all inputs
		for (var nid in inputMap) {
			var input = inputMap[nid];
			var node = circuitData[nid];
			if (node.type != inputType) {
				console.error("Received invalid nid from inputMap, ignoring");
			} else {
				propogateSimValue(nid, 0, circuitData, input);
			}
		}

		var continueSim = true;
		var nIterations = 0;
		// using an 'iterative deepening' method allows for a transistor to have an input from another transistor
		// assumes that the circuit is more than 10 levels 'deep'
		while (continueSim && nIterations < 10) {
			// propogate power values
			for (var nid in circuitData) {
				var type = circuitData[nid].type;
				if (type == vccType) {
					propogateSimValue(nid, 0, circuitData, '1');
				} else if (type == gndType) {
					propogateSimValue(nid, 0, circuitData, '0');
				}
			}

			var allGood = true;
			for (var nid in circuitData) {
				var node = circuitData[nid];
				if (node.type != outputType) continue;
				allGood &= node.pins[0].sim_value;
				if (!allGood) break;
			}
			continueSim = !allGood;
			nIterations++;
		}

		// save output values
		var outputMap = {};
		for (var nid in circuitData) {
			var node = circuitData[nid];
			if (node.type == outputType) {
				var value = node.pins[0].sim_value;
				if (!value) value = 'Z';
				outputMap[nid] = value;
			}
		}

		// reset circuitData sim_values
		for (var nid in circuitData) {
			var node = circuitData[nid];
			for (var i = node.pins.length - 1; i >= 0; i--) {
				delete node.pins[i].sim_value;
			};
		}

		return outputMap;
	}

	function propogateSimValue(nid, pid, circuitData, value, visited) {
		if (!visited)
			visited = {};

		var node = circuitData[nid];
		var pin = node.pins[pid];
		// simulate multiple driving of output
		if (pin.sim_value && pin.sim_value != value) {
			pin.sim_value = 'X';
			return;
		}

		// this prevents loops due to the symmetric edges in the graph
		var id = nid+"-"+pid;
		if (visited[id])
			return;
		visited[id] = true;

		pin.sim_value = value;
		// nmos logic
		if (node.type == nmosType) {
			// drain
			if (pid == 2 && node.pins[1].sim_value == '1') {
				// propogate to source
				var sourceAdj = node.pins[0].adj;
				for (var i = sourceAdj.length - 1; i >= 0; i--) {
					var adj = sourceAdj[i];
					var toNID = adj[0];
					var toPID = adj[1];
					propogateSimValue(toNID, toPID, circuitData, value, visited);
				};
			}
		} 
		// pmos logic
		else if (node.type == pmosType) {
			// source
			if (pid == 0 && node.pins[1].sim_value == '0') {
				// propogate to drain
				var drainAdj = node.pins[2].adj;
				for (var i = drainAdj.length - 1; i >= 0; i--) {
					var adj = drainAdj[i];
					var toNID = adj[0];
					var toPID = adj[1];
					propogateSimValue(toNID, toPID, circuitData, value, visited);
				};
			}
		} else if (node.type == outputType) {
			// base case, already done
			return;
		}
		var adj = pin.adj;
		for (var i = adj.length - 1; i >= 0; i--) {
			var n = adj[i];
			var toNID = n[0];
			var toPID = n[1];
			propogateSimValue(toNID, toPID, circuitData, value, visited);
		};
	}

	root.simulate = function(circuitData) {
		var inputNIDList = Object.keys(circuitData).filter(function (x) {
			return circuitData[x].type == inputType;
		});

		var outputNIDList = Object.keys(circuitData).filter(function (x) {
			return circuitData[x].type == outputType;
		});

		var nRows = Math.pow(2, inputNIDList.length);
		var ttRows = [];
		for (i = 0; i < nRows; i++) {
			var binary = i.toString(2).split('');
			// pad string with zeros
			while (binary.length < inputNIDList.length) {
				binary.unshift('0');
			}
			ttRows.push(binary);
		}

		var result = {
			inputs: inputNIDList,
			outputs: outputNIDList,
			rows: [],
		}
		for (var i = ttRows.length - 1; i >= 0; i--) {
			var inputs = ttRows[i];
			var inputMap = {};
			for (var j = inputNIDList.length - 1; j >= 0; j--) {
				inputMap[inputNIDList[j]] = inputs[j];
			};
			var outputMap = simulateInputs(circuitData, inputMap);
			// order is important for these loops
			var row = [];
			for (var j = 0; j < inputNIDList.length; j++) {
				row.push(inputs[j]);
			};
			for (var j = 0; j < outputNIDList.length; j++) {
				row.push(outputMap[outputNIDList[j]]);
			};
			result.rows.push(row);
		}

		return result;
	}

	// running in node.js
	if (typeof window === 'undefined') {
		module.exports = root;
	}
	// running in browser
	else {
		window.LibCircuit = root;
	}

})();