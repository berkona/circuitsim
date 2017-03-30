(function() {

	"use strict";
	
	var root = {};

	// common types
	var inputType = 'input';
	var outputType = 'output';
	var wireType = 'wire';
	
	// transistor mode only
	var pmosType = 'pmos';
	var nmosType = 'nmos';
	var vccType = 'vcc';
	var gndType = 'gnd';

	// gate mode only
	var andType = 'and';
	var nandType = 'nand';
	var orType = 'or';
	var norType = 'nor';
	var xorType = 'xor';
	var xnorType = 'xnor';
	var inverterType = 'inverter';
	
	// common types
	root.inputType = inputType;
	root.outputType = outputType;

	// transistor mode only
	root.pmosType = pmosType;
	root.nmosType = nmosType;
	root.vccType = vccType;
	root.gndType = gndType;
	root.wireType = wireType;

	// gate mode only
	root.andType = andType;
	root.nandType = nandType;
	root.orType = orType;
	root.norType = norType;
	root.xorType = xorType;
	root.xnorType = xnorType;
	root.inverterType = inverterType;

	var pinNames = [
		"source",
		"gate",
		"drain"
	]

	var gatePinNames = [
		"input 1",
		"input 2",
		"output"
	]

	root.pinNames = pinNames;

	root.gatePinNames = gatePinNames;

	function runChecks(circuitData, checks) {
		for (var i = 0; i < checks.length; i++) {
			var result = checks[i](circuitData);
			if (result) return result;
		};
		return null;
	}

	// same as runAllChecks, but common to both types of CircuitData
	root.runCommonChecks = function(circuitData) {
		return runChecks(circuitData, [
			root.ioCheck,
			root.allPinsConnected,
			root.selfShort,
			root.inputShort,
			root.ioShort,
		]);
	}

	root.runTransistorChecks = function(circuitData) {
		var result = root.runCommonChecks(circuitData);
		if (result) return result;
		return runChecks(circuitData, [
			root.powerCheck,
			root.parityCheck,
			root.shortCheck,
			root.gateShort,
		]);
	}

	root.runGateChecks = function(circuitData) {
		var result = root.runCommonChecks(circuitData);
		if (result) return result;
		// todo make Gate sanity checks
	}

	// this runs all checks in the order intended to be run
	// returns either null for all good or a message if errored somewhere
	// some of these checks are built on the assumption that all the checks before them already being run with a good result
	// it might be possible to revalulate the checks and refactor them to run even without previous checks being successful
	root.runAllChecks = function(circuitData) {

		var allChecks = [
			[ root.ioCheck, 'IO Check' ],
			[ root.powerCheck, 'Power Check' ],
			[ root.parityCheck, 'Parity Check' ],
			[ root.allPinsConnected, 'All Pins Connected' ],
			[ root.selfShort, 'Self Short Check' ],
			[ root.shortCheck, 'Short Check' ],
			[ root.inputShort, 'Input Short' ],
			[ root.gateShort, 'Gate Short' ],
			[ root.ioShort, 'IO Short' ],
		];

		for (var i = 0; i < allChecks.length; i++) {
			var result = allChecks[i][0](circuitData);
			if (result) return result;
		}

		return null;
	}

	function create_error(msg, nids) {
		if (!nids)
			nids = [];

		return {
			message: msg,
			nids: nids,
		}
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
			return create_error("Circuit does not have any inputs.")
		} else if (nOutputs == 0) {
			return create_error("Circuit does not have any outputs.")
		} else if (nInputs + nOutputs == nNodes) {
			return create_error("Circuit has only inputs and outputs.")
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
			return create_error("Circuit does not contain any PMOS transistors.");
		} else if (nNMOS == 0) {
			return create_error("Circuit does not contain any NMOS transistors.");
		} else if (nPMOS != nNMOS) {
			return create_error("Circuit does not contain an equal number of PMOS and NMOS transistors.");
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
			return create_error("Circuit does not contain a source node.");
		} else if (ngnd == 0) {
			return create_error("Circuit does not contain a ground node.");
		} else {
			return null;
		}
	}

	// verifies all pins are connected
	root.allPinsConnected = function(circuitData) {
		for (var nid in circuitData) {
			var node = circuitData[nid];
			for (var pid = node.pins.length - 1; pid >= 0; pid--) {
				if (node.pins[pid].adj.length == 0)
					return create_error("Node "+nid+", pin "+pinNames[pid]+" was not connected.", [ nid ])
			};
		}
	}

	function hasCycle(circuitData, nid, pid, parent, visited) {
		if (!visited)
			visited = {};

		var id = nid+"-"+pid;
		visited[id] = true;

		var pin = circuitData[nid].pins[pid];
		for (var i = pin.adj.length - 1; i >= 0; i--) {
			var to = pin.adj[i];
			var toNID = to[0];
			var toPID = to[1];
			var toID = toNID+"-"+toPID;
			if (!visited[toID]) {
				if (hasCycle(circuitData, toNID, toPID, nid, visited))
					return true;
			} else if (toNID != parent) {
				return true;
			}
		};
		return false;
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

	// test if any pin has a cycle
	root.selfShort = function(circuitData) {
		for (var nid in circuitData) {
			var node = circuitData[nid];
			for (var pid = node.pins.length - 1; pid >= 0; pid--) {
				if (hasCycle(circuitData, nid, pid))
					return create_error("Node "+nid+", pin "+pinNames[pid]+" is shorted to itself.", [ nid ]);
			}
		}
		return null;
	}

	// test if source is connected directly to ground
	root.shortCheck = function(circuitData) {
		var error = null;
		for (var nid in circuitData) {
			var node = circuitData[nid];
			if (node.type != vccType) continue;
			function isGround(toNID, toPID) {
				if (circuitData[toNID].type == gndType)
					error = create_error("Source node "+nid+" is shorted to ground node "+toNID+".", [ nid, toNID ]);
			}
			circuitTraverser(circuitData, nid, 0, isGround);
			if (error) break;
		}
		return error;
	}

	//test if an input is shorted to another input
	root.inputShort = function(circuitData) {
		var error = null;
		for (var nid in circuitData) {
			var node = circuitData[nid];
			if (node.type != inputType) continue;
			function isShorted(toNID, toPID) {
				if (circuitData[toNID].type == inputType && nid != toNID)
					error = create_error("Input node "+nid+" is shorted to input node "+toNID+".", [ nid, toNID ]);
			}
			circuitTraverser(circuitData, nid, 0, isShorted);
			if (error) break;
		}
		return error;
	}

	// test if gate of a transistor is directly connected to gnd or src
	root.gateShort = function(circuitData) {
		var error = null;
		for (var nid in circuitData) {
			var node = circuitData[nid];
			if (node.type != nmosType && node.type != pmosType) continue;
			function isShorted(toNID, toPID) {
				if (circuitData[toNID].type == vccType) {
					error = create_error("Node "+nid+" has gate pin shorted to source node "+toNID+".", [ nid, toNID ]);
				} else if (circuitData[toNID].type == gndType) {
					error = create_error("Node "+nid+" has gate pin shorted to ground node "+toNID+".", [ nid, toNID ]);
				}
			}
			circuitTraverser(circuitData, nid, 1, isShorted);
			if (error) break;
		}
		return error;
	}

	// test if input is shorted to an output
	root.ioShort = function(circuitData) {
		var error = null;
		for (var nid in circuitData) {
			var node = circuitData[nid];
			if (node.type != inputType) continue;
			function isShorted(toNID, toPID) {
				if (circuitData[toNID].type == outputType) {
					error = create_error("Input "+nid+" is shorted to output "+toNID+".", [ nid, toNID ]);
				}
			}
			circuitTraverser(circuitData, nid, 0, isShorted);
			if (error) break;
		}
		return error;
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
		// assumes that the circuit is no more than 10 levels 'deep' 
		// i.e., the longest path from input to output is no more than length 10
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

	var logic_table = {};
	logic_table[inverterType] = function (a) {
		if (!a) return null;
		return a == '1' ? '0' : '1';
	};

	logic_table[andType] = function (a, b) {
		if (!a || !b) return null;
		return a == '1' && b == '1' ? '1' : '0';
	};

	logic_table[nandType] = function (a, b) {
		if (!a || !b) return null;
		return a == '1' && b == '1' ? '0' : '1';
	};

	logic_table[orType] = function (a, b) {
		if (!a || !b) return null;
		return a == '1' || b == '1' ? '1' : '0';
	};

	logic_table[norType] = function (a, b) {
		if (!a || !b) return null;
		return a == '1' || b == '1' ? '0' : '1';
	};

	logic_table[xorType] = function(a, b) {
		if (!a || !b) return null;
		return (a == '1' && b == '0') || (a == '0' && b == '1') ? '1' : '0';
	};

	logic_table[xnorType] = function (a, b) {
		if (!a || !b) return null;
		return (a == '1' && b == '0') || (a == '0' && b == '1') ? '0' : '1';
	};

	function simulateGateNet(circuitData, inputMap) {
		var continueSim = true, nIterations = 0;
		while (continueSim && nIterations < 10) {
			for (var nid in inputMap) {
				var input = inputMap[nid];
				var node = circuitData[nid];
				if (node.type != inputType) {
					console.error("Received invalid nid from inputMap, ignoring.  Please report this with a console dump to web-admin.");
				} else {
					propogateGateValue(nid, 0, circuitData, input);
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

	function propogateGateValue(nid, pid, circuitData, value, visited) {
		if (!visited)
			visited = {};

		var node = circuitData[nid];
		var pin = node.pins[pid];

		// this prevents loops due to the symmetric edges in the graph
		var id = nid+"-"+pid;
		if (visited[id])
			return;
		visited[id] = true;

		if (!pin.sim_value || (pin.sim_value && pin.sim_value == '0')) {
			pin.sim_value = value;
		}

		if (node.type == outputType) {
			// already done
			return;
		} 
		// if an input pin on a gate
		else if (node.type != inputType && pid != 1) {
			var logic_func = logic_table[node.type];
			var newValue;
			if (node.type == inverterType) {
				newValue = logic_func(pin.sim_value);
			} else {
				newValue = logic_func(node.pins[0].sim_value, node.pins[2].sim_value);
			}

			var outputAdj = node.pins[1].adj;
			for (var i = outputAdj.length - 1; i >= 0; i--) {
				var adj = outputAdj[i];
				var toNID = adj[0];
				var toPID = adj[1];
				propogateGateValue(toNID, toPID, circuitData, newValue, visited);
			};
		}

		var adj = pin.adj;
		for (var i = adj.length - 1; i >= 0; i--) {
			var n = adj[i];
			var toNID = n[0];
			var toPID = n[1];
			propogateGateValue(toNID, toPID, circuitData, value, visited);
		};
	}

	function propogateSimValue(nid, pid, circuitData, value, visited) {
		if (!visited)
			visited = {};

		var node = circuitData[nid];
		var pin = node.pins[pid];

		// this prevents loops due to the symmetric edges in the graph
		var id = nid+"-"+pid;
		if (visited[id])
			return;
		visited[id] = true;

		// simulate multiple driving of output
		if (pin.sim_value && pin.sim_value != value) {
			value = 'X';
		}
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

	function runSimulation(circuitData, simFunc) {
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
			var outputMap = simFunc(circuitData, inputMap);
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

	root.simulate = function(circuitData) {
		return runSimulation(circuitData, simulateInputs);
	}

	root.simulateGates = function(circuitData) {
		return runSimulation(circuitData, simulateGateNet);
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