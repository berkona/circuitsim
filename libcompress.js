(function () {
	"use strict";

	var root = {};

	root.BWT = BWT;
	function BWT(string) {
		string = string + '!';
		var m = string.length
		var suffixes = [];
		for (var i = 0; i < m; i++) {
			suffixes.push(string.slice(i, m) + string.slice(0, i));
		};

		return suffixes.sort().reduce(function (accum, suffix) {
			return accum + suffix.charAt(m-1);
		}, '');
	}

	root.FMIndex = FMIndex;
	function FMIndex(bwt) {
		var row = {};
		var fm = [ row ];
		for (var i = bwt.length - 1; i >= 0; i--) {
			row[bwt[i]] = 0;
		}
		
		for (var i = 0; i < bwt.length; i++) {
			row = {};
			for (var c in fm[i]) {
				row[c] = fm[i][c]
			}
			row[bwt[i]] += 1
			fm.push(row);
		}

		var offset = {};
		var N = 0;
		var keys = Object.keys(row).sort();
		for (var i = 0; i < keys.length; i++) {
			var c = keys[i];
			offset[c] = N;
			N += row[c];
		}

		return [ fm, offset ];
	}

	root.InverseBWT = InverseBWT;
	function InverseBWT(bwt) {
		var fmIndex = FMIndex(bwt);
		var fm = fmIndex[0];
		var offset = fmIndex[1];

		var c = bwt[0];
		var pre = offset[c] + fm[0][c];
		var text = c;
		while (pre != 0) {
			c = bwt[pre];
			pre = offset[c] + fm[pre][c];
			text = c + text;
		}
		return text.slice(1, bwt.length);
	}

	root.RunLengthEncode = RunLengthEncode;
	function RunLengthEncode(string, delim) {
		if (!delim) delim = '|';

		var last_c = string[0], 
			last_run = 1,
			rleStr = '',
			c, i;

		for (i = 1; i < string.length; i++) {
			c = string[i];
			if (c != last_c) {
				rleStr += String(last_run) + delim + last_c;
				last_c = c;
				last_run = 1
			} else if (i === string.length - 1) {
				rleStr += String(last_run + 1) + delim + last_c;
			} else {
				last_run += 1
			}
		};
		return rleStr;
	}

	root.RunLengthDecode = RunLengthDecode;
	function RunLengthDecode(string, delim) {
		if (!delim) delim = '|';

		var rawStr = '', 
			accum = '', 
			i = 0, j = 0, m = string.length,
			next_char, runLength, base;

		while (i < m) {
			next_char = string[i++];
			if (next_char === delim) {
				runLength = Number(accum);
				base = 	string[i++];
				for (j = 0; j < runLength; j++) {
					rawStr += base;
				}
				accum = '';
			} else {
				accum += next_char;
			}
		}
		return rawStr;
	}

	root.Compress = function (string) {
		return RunLengthEncode(BWT(string));
	}

	root.Decompress = function(compressed) {
		return InverseBWT(RunLengthDecode(compressed));
	}

	if (typeof window === "undefined") {
		module.exports = root;
	} else {
		window.LibCompress = root;
	}
})();