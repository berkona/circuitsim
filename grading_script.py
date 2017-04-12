#! /usr/bin/env python2

import sys, os, re, subprocess

ID_FIELD_NAME = 'User Name'
SUBMISSION_FIELD_NAME = "Order of Submission (1=first)"
AUTOGRADE_PARTS= [ 1, 2, 5, 6 ]

def parseCSV(string, field_delim=",", quote_delim="'"):
	"""
	Quickly written hand parser (i.e., split text into rows) for csv, seems to work for Sakai-based CSVs.
	Can't use a simple REGEX/split command due to text quoting behavior
	"""

	fields = []
	saw_quote = False
	curr_field = ""
	for i in xrange(len(string)):
		char = string[i]
		if saw_quote:
			if (char == quote_delim):
				saw_quote = False
			else:
				curr_field += char
		else:
			if char == quote_delim:
				saw_quote = True
			elif char == field_delim:
				fields.append(curr_field)
				curr_field = ""
			else:
				curr_field += char

	fields.append(curr_field)
	return fields

def parseHeader(header):
	"""
	Parse a csv header from Saki and return a 3-tuple of:
		id_field -- int -- field index of who submitted this row, generally an onyen
		submission_field -- int -- field index of "Order of Submission (1=first)"
		answer_fields -- 2 tuple of:
			0 -- int, field index of this answer
			1 -- string, name of Part X, Question Y processes into a filename like string
	"""

	id_field = -1
	submission_field = -1
	answer_fields = []
	for i in xrange(len(header)):
		if header[i] == ID_FIELD_NAME:
			id_field = i
			continue
		elif header[i] == SUBMISSION_FIELD_NAME:
			submission_field = i
			continue

		for part in AUTOGRADE_PARTS:
			match = re.match("^(Part "+str(part)+", Question \d), Response$", header[i]) 
			if match:
				answer_fields.append((i, match.group(1)))

	if id_field == -1:
		raise ValueError("!!!Could not find ID field!!!")
	elif submission_field == -1:
		raise ValueError("!!!COuld not find submission field!!!")
	elif len(answer_fields) == 0:
		raise ValueError("!!! Could not find autograde parts !!! Are you sure you set AUTOGRADE_PARTS correctly?")

	return id_field, submission_field, answer_fields

def gradeResponse(studentID, response, questionName, gradingDir, answerDir):
	if (response == 'No Answer'):
		print "!!! %s did not answer %s !!!" % (studentID, questionName)
		return

	studentDir = os.path.join(gradingDir, studentID)
	if not os.path.isdir(studentDir):
		os.makedirs(studentDir)

	responseFName = questionName.replace(',', '').replace(' ', '-')
	outputFile = os.path.join(studentDir, responseFName + '.json')
	# write our students response to a file
	with open(outputFile, 'w') as responseFile:
		responseFile.write(response)

	answerFile = os.path.join(answerDir, responseFName + '.txt')
	print "Grading %s" % questionName
	grader = subprocess.Popen(('node', 'server-runner.js', outputFile), stdout=subprocess.PIPE)
	grader.wait()
	try:
		subprocess.check_output(('diff', answerFile, '-'), stdin=grader.stdout, stderr=subprocess.STDOUT)
		print "Output and answer key are identical"
	except subprocess.CalledProcessError as e:
		errorFile = os.path.join(studentDir, 'ERROR.' + responseFName + '.txt')
		print "!!! Mismatch betweeen output and answer !!!"
		print "Check %s for details" % errorFile
		with open(errorFile, 'w') as errorFile:
			errorFile.write(e.output)
		

def main():
	"""
	It's a main method... what do you want? A poem?
	"""

	if len(sys.argv) != 4:
		print "USAGE: python csv_converter.py CSV_EXPORT_FILE GRADING_DIR ANSWER_DIR"
		return

	responses = [];
	csvFName = sys.argv[1];
	gradingDir = sys.argv[2];
	answerDir = sys.argv[3];

	with open(csvFName) as csvFile:
		# automagically find all the questions we need to grade
		id_field, submission_field, answer_fields = parseHeader(parseCSV(csvFile.readline()))
		for row in csvFile:
			row = parseCSV(row)
			studentID = row[id_field]
			print "Grading %s" % studentID
			if (row[submission_field] == 'No submission'):
				print "!!! No submission from %s !!!" % studentID
				continue
			for idx, questionName in answer_fields:
				gradeResponse(studentID, row[idx], questionName, gradingDir, answerDir)

main()