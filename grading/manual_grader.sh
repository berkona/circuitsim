
SIM_CMD="/home/jon/src/circuitsim/server-runner.js"

echo "Grading $1 using answers in $2"

# Cleanup from old runs
rm "$1"/ERROR.* > /dev/null 2&>1
rm "$1"/OUTPUT.* > /dev/null 2&>1

for problem_path in "$1"/*.json; do
	problem="${problem_path#$1/}"
	echo "Checking $problem"
	answer_file="$2/${problem/.json/.txt}"
	error_file="$1/ERROR.${problem/.json/.txt}"
	output_file="$1/OUTPUT.${problem/.json/.txt}"
	node "$SIM_CMD" "$problem_path" > "$output_file"
	cmp --silent "$output_file" "$answer_file"
	if [ $? -eq 0 ]; then
		echo "Answer matches key"
	else
		echo "!!! Answer did not match key, check $error_file for details !!!"
		diff "$output_file" "$answer_file" > "$error_file"
	fi
done