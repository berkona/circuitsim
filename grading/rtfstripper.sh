#!/bin/bash

echo "Starting rtf stripper"

for student_folder in "$1"/*/
do
	for file in "$student_folder"/"Submission attachment(s)"/*.json
	do
		if [ -f "$file" ]; then
			echo "Stripping rtf from $file"
			python2 ~/src/circuitsim/grading/rtfstripper.py "$file"
		fi
	done
done
echo "Finished"