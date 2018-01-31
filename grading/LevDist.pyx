cdef extern from "FastLevDist.c":
	int levenshtein(char* s1, char* s2)

cpdef LevDist(s1, s2):
	return levenshtein(s1, s2)