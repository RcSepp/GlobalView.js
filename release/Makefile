COMPILER_DIR = /home/sepp/Development/ThirdPartyLibraries/GoogleClosureCompiler/
SRC_DIR = ../src/
LIB_DIR = $(SRC_DIR)lib/
FLAGS = -O ADVANCED --generate_exports --warning_level VERBOSE --jscomp_off=deprecated --extra_annotation_name=callback  #--formatting=pretty_print
INCLUDE = $(COMPILER_DIR)base.js

LIB = --externs gl-matrix.externs.js --externs parallel.externs.js --externs jquery-csv.externs.js $(LIB_DIR)webgl-utils.js
INPUT = $(SRC_DIR)utility.js $(SRC_DIR)formulaCompiler.js $(SRC_DIR)pathFinding.js $(SRC_DIR)algorithm.js $(SRC_DIR)textRenderContext.js $(SRC_DIR)shaders.js $(SRC_DIR)graphics.js $(SRC_DIR)colormap.js $(SRC_DIR)coordinateSystem.js $(SRC_DIR)pointViewer.js $(SRC_DIR)imageViewer.js $(SRC_DIR)densityViewer.js $(SRC_DIR)histogramViewer.js $(SRC_DIR)globalView.js $(SRC_DIR)dataset.js
OUTPUT = globalview.min.js

compile:
	java -jar $(COMPILER_DIR)closure-compiler-v20170521.jar $(FLAGS) $(SRC_DIR)license.js $(INCLUDE) $(INPUT) $(LIB) --js_output_file $(OUTPUT)