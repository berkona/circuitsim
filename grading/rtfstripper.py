
import re

def striprtf(text):
	# detect RTF
	if not re.match(r'\{\\rtf', text):
		return text

	i = 0
	while i < len(text)-1:
		if text[i] == '{' and text[i+1] == '"':
			break
		i += 1

	if i == len(text)-1:
		raise RuntimeError("Reached end of rtf without finding start of JSON file")

	text = text[i:]
	return text.replace("\{", "{").replace("\}", "}")[:-1]


import sys

if len(sys.argv) != 2:
	print "USAGE: rtfstripper.py RTF_FILE"
	sys.exit(1)


with open(sys.argv[1]) as f:
	text = "".join(f.readlines())

stripped_text = striprtf(text)

with open(sys.argv[1], 'w') as f:
	f.write(stripped_text)
