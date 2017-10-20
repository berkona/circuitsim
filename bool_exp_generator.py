import sys, itertools

def main():
	if len(sys.argv) != 2:
		print 'USAGE: ./bool_exp_generator.py BOOL_EXPR'
		return

	# awesome one-liner to the rescue!
	# ! is a special character so use - for negation
	tokens = [ term.split('*') for term in sys.argv[1].replace(' ', '').replace('-', '!').split('+') ]
	
	internal_permutations = []
	for term in tokens:
		without_term = list(tokens)
		without_term.remove(term)
		# without_term = ' + '.join([ '*'.join(t) for t in without_term ])
		for term_perm in itertools.permutations(term):
			# term_str = '*'.join(term_perm)
			if len(without_term):
				internal_permutations.append([ list(term_perm) ] + without_term)
			else:
				internal_permutations.append([ list(term_perm) ] )
	
	permutations = []
	for term_perm in internal_permutations:
		for pi in itertools.permutations(term_perm):
			permutations.append(' + '.join([ '*'.join(term) for term in pi ]))

	# for some reason this makes doubles of some permutations
	# TODO figure out why, but making a set is a good stop-gap
	print ' | '.join(set(permutations))

main()