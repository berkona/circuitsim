
"use script";

var fs = require('fs');

var LibCircuit = require("./libcircuit");
var CircuitData = require("./circuit-data");

if (process.argv.length != 4) {
	console.log("USAGE: node server-runner.js CIRCUIT_DATA_EXPECTED CIRCUIT_DATA_ACTUAL");
} else {
	main();
}

function convertToObjectSequence(result) {
	var obj = {};
	var combined = result.inputs.concat(result.outputs);
	for (var i = combined.length - 1; i >= 0; i--) {
		var name = combined[i];
		var lst = [];
		for (var j = 0; j < result.rows.length; j++) {
			lst.push(result.rows[j][i]);
		};
		obj[name] = lst;
	};

	return obj;
}

function main() {
	var expectedFName = process.argv[2];
	var actualFName = process.argv[3];
	var expectedResult = runSimulation(expectedFName);
	var actualResult = runSimulation(actualFName);

	if (expectedResult.inputs.length != actualResult.inputs.length) {
		console.log("Actual # of inputs does not match expected # of inputs");
		return;
	} else if (expectedResult.outputs.length != actualResult.outputs.length) {
		console.log("Actual # of outputs does not match expected # of outputs");
		return;
	} else if (expectedResult.rows.length != actualResult.rows.length) {
		console.log("Actual # of rows does not match expected # of rows.  Something horrible happened.");
		return;
	}

	expectedResult = convertToObjectSequence(expectedResult);
	actualResult = convertToObjectSequence(actualResult);

	for (var name in expectedResult) {
		var expectedSequence = expectedResult[name];
		var actualSequence = actualResult[name];
		if (!actualSequence)
			console.log("Actual result did not contain variable '"+name+"'.");
		for (var i = expectedSequence.length - 1; i >= 0; i--) {
			var expectedValue = expectedSequence[i];
			var actualValue = actualSequence[i];
			if (expectedValue != actualValue)
				console.log("Mismatch: name "+name+" expected value "+expectedValue+", actual value "+actualValue);
		};
	}
}

function runSimulation(fname) {
	var serialized = fs.readFileSync(fname);
	var data = JSON.parse(serialized);
	var circuitData = new CircuitData();
	circuitData.import(data);

	var verifiedResult = LibCircuit.runAllChecks(circuitData.graph);
	if (verifiedResult) {
		console.log("Circuit was not able to be verified:");
		console.log(verifiedResult[0] + " returned error: " +verifiedResult[1]);
		return;
	}
	var result = LibCircuit.simulate(circuitData.graph);
	function GetName(x) {
		return circuitData.graph[x].name;
	}
	result.inputs = result.inputs.map(GetName);
	result.outputs = result.outputs.map(GetName);
	return result;
}