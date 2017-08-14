/**
 * @preserve
 * @fileoverview GlobalView - Fast client-side scatter plot rendering using WebGL
 * @author Sebastian Klaassen
 * @version 0.1.0
 */

/**
 * @license
 * 			<<< GlobalView Scatter Plot Framework >>>
 * 
 * MIT License
 * 
 * Copyright (c) 2017 Sebastian Klaassen
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * 
 * 
 * Third-Party License Information:
 *    This framework uses the following additional libraries:
 *    Software		Version	License			File											Homepage
 *    gl-matrix		2.3.2	MIT License		./lib/gl-matrix.min.js							http://glmatrix.net/
 *    Parallel.js		0.2.1	BSD License		./lib/parallel.js								https://parallel.js.org/
 *    jquery-csv		0.8.3	MIT License		./lib/jquery-csv.min.js							https://github.com/evanplaice/jquery-csv
 *    webgl-utils.js		-	BSD License		partially minified into this file (see below)	https://www.khronos.org/registry/webgl/sdk/demos/common/webgl-utils.js
 *    Full copyright disclaimers can be found either below or in the individual library files
 */