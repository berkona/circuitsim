from distutils.core import setup
from Cython.Build import cythonize

setup(
  name = 'String Similarity',
  ext_modules = cythonize("LevDist.pyx"),
)