/**
 * A viewer that renders point sets to the global view.
 * @constructor
 * @package
 * @implements {Viewer}
 * @param {Object} gl // {WebGLRenderingContext}
 * @param {Object} globalView // {GlobalView}
 */
function PointViewer(gl, globalView)
{
	var _dataset;
	var meshDataPoints = null;
	
	var _pointOpacity = 1.0;
	/*var highlightTexture = LoadTextureFromByteArray(gl, new Uint8Array([255, 255, 0, 255]), 1, 1);
	var selectionTexture = LoadTextureFromByteArray(gl, new Uint8Array([255, 0, 0, 255]), 1, 1);
	var representativeTexture = LoadTextureFromByteArray(gl, new Uint8Array([0, 255, 0, 255]), 1, 1);*/
	
	/**
	 * A renderable set of points
	 * @constructor
	 * @package
	 * @extends {HashSet}
	 */
	function PointGroup()
	{
		function onchange()
		{
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxbuffer);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.get(), gl.STATIC_DRAW);
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
			
			globalView.invalidate();
		}
		
		HashSet.call(this, onchange);
		var idxbuffer = gl.createBuffer();
		
		this.render = function(texture)
		{
			if (this.size() === _dataset.length)
				meshDataPoints.draw(texture, 0, _dataset.length);
			else if (this.size() !== 0)
				meshDataPoints.drawIndexed(texture, idxbuffer, this.size());
		}
		this.renderLines = function(texture, pointDrag)
		{
			if (this.size() === _dataset.length)
				meshDataPoints.drawLines(texture, pointDrag, 0, _dataset.length);
			else if (this.size() !== 0)
			{
				// drawLines doesn't support index buffers
				// Therefore, draw point group as continuous index sequences
				var startIndex = 0, lastIndex = -1, count = 0;
				this.forEach(function(index) {
					if (index === lastIndex + 1)
						++count;
					else
					{
						if (count !== 0)
							meshDataPoints.drawLines(texture, pointDrag, startIndex, count);
						startIndex = index;
						count = 1;
					}
					lastIndex = index;
				});
				if (count !== 0)
					meshDataPoints.drawLines(texture, pointDrag, startIndex, count);
			}
		}
		
		this.free = function()
		{
			if (idxbuffer !== -1)
			{
				gl.deleteBuffer(idxbuffer);
				idxbuffer = -1;
			}
		}
	}
	
	var pointSets = [this.points = new PointGroup()];
	/**
	 * Create a subset of points that can be rendered independently
	 * Optional parameters color and opacity overwrite the default values
	 * @param  {Object=} color
	 * @param  {number=} opacity
	 * @return {HashSet}
	 */
	this.createPointSet = function(color, opacity)
	{
		var pointSet = new PointGroup();
		if (color)
		{
			var validationResult;
			if ((validationResult = validateColormap(color)) === true)
			{
				var c = parseColormap(color);
				if (c)
					pointSet.colormap = LoadTextureFromByteArray(gl, c, c.length / 4, 1);
			}
			else
			{
				console.warn("GlobalView warning: Invalid value for point set color: " + color);
				if (isString(validationResult))
					console.warn("                    " + validationResult);
			}
		}
		pointSet.opacity = opacity;
		pointSets.push(pointSet);
		return pointSet;
	}
	/**
	 * Remove point subset
	 * (This does not remove any of the points)
	 * @param  {HashSet} pointSet
	 */
	this.removePointSet = function(pointSet)
	{
		var index = pointSets.indexOf(pointSet);
		if (index !== -1)
			pointSets.splice(index, 1);
	}
	
	this.render = function(flipY, tf, colormapTexture, pointDrag)
	{
		if (meshDataPoints === null)
			return;
		
		meshDataPoints.sdr.bind();
		meshDataPoints.sdr.offsets.apply(meshDataPoints.sdr, tf.getOffsets());
		meshDataPoints.sdr.scales.apply(meshDataPoints.sdr, tf.getScales());
		meshDataPoints.sdr.animatedScales.apply(meshDataPoints.sdr, tf.getAnimatedScales());
		meshDataPoints.sdr.flipY(flipY ? 1 : 0);
		pointSets.forEach(function(pointSet) {
			meshDataPoints.sdr.pointOpacity(pointSet.opacity ? pointSet.opacity : _pointOpacity);
			pointSet.render(pointSet.colormap ? pointSet.colormap : colormapTexture);
		});
		
		if (pointDrag)
		{
			meshDataPoints.sdrLine.bind();
			meshDataPoints.sdrLine.offsets.apply(meshDataPoints.sdrLine, tf.getOffsets());
			meshDataPoints.sdrLine.scales.apply(meshDataPoints.sdrLine, tf.getScales());
			meshDataPoints.sdrLine.animatedScales.apply(meshDataPoints.sdrLine, tf.getAnimatedScales());
			meshDataPoints.sdrLine.flipY(flipY ? 1 : 0);
			pointSets.forEach(function(pointSet) {
				meshDataPoints.sdrLine.pointOpacity(pointSet.opacity ? pointSet.opacity : Math.max(0.1, _pointOpacity / 2.0));
				pointSet.renderLines(pointSet.colormap ? pointSet.colormap : colormapTexture, pointDrag);
			});
		}
	}
	
	this.setDataset = function(dataset, options)
	{
		// Remove old mesh
		if (meshDataPoints != null)
			meshDataPoints.free();
		pointSets.forEach(pointSet => pointSet.clear());
		
		_dataset = dataset;
		_pointOpacity = options['pointOpacity'];
		
		// Validate numvertices
		if (dataset.fdata.length !== dataset.length * dataset.numColumns)
		{
			alert("'dataset.fdata.length !== dataset.length * dataset.numColumns'");
			return;
		}
		
		// Create position buffer
		var posbuffer;
		if (dataset.numColumns)
		{
			posbuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, posbuffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(dataset.fdata), gl.STATIC_DRAW);
		}
		else
			posbuffer = null;
		this.getPosBuffer = () => posbuffer;
		
		meshDataPoints = new DataMesh(gl, posbuffer, dataset.length, dataset.numColumns, options);
		
		this.points.assignRange(dataset.length);
	}
	
	this.onOptionsChanged = function(options, recompileShader)
	{
		_pointOpacity = options['pointOpacity'];
		if (meshDataPoints)
		{
			if (recompileShader === true)
				meshDataPoints.recompileShader(options);
			else
				meshDataPoints.sdr.pointSize(options['pointSize']);
		}
	}
	
	var activeInputVectors = null, animatedInputVectors = null;
	this.onInputChanged = function(activeInputs, animatedInputs, options)
	{
		activeInputVectors = activeInputs.map(i => _dataset.dataVectors[i]);
		animatedInputVectors = animatedInputs.map(animatedInput => _dataset.dataVectors[animatedInput.origin]);
		if (meshDataPoints != null)
			meshDataPoints.recompileShader(options);
	}
	
	this.onPlotBoundsChanged = function(plotBounds) {}
	
	/**
	 * A renderable WebGL mesh of ndim-dimensional points
	 * @constructor
	 * @package
	 * @param {Object} gl // {WebGLRenderingContext}
	 * @param {WebGLBuffer} posbuffer
	 * @param {number} numvertices
	 * @param {number} ndim
	 * @param {Object} options
	 */
	function DataMesh(gl, posbuffer, numvertices, ndim, options)
	{
		// Create line buffer
		var linebuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, linebuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, -1, 0, 1, 2, 1, 2, -1]), gl.STATIC_DRAW);
		
		// Create vertex ID buffer
		var vertexIds = new Float32Array(numvertices);
		for (var i = 0; i < numvertices; ++i)
			vertexIds[i] = i;
		var vidbuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vidbuffer);
		gl.bufferData(gl.ARRAY_BUFFER, vertexIds, gl.STATIC_DRAW);
		
		this.getPosCode = function(forLineSdr)
		{
			// Create shader code for getPos() function -> getPosCode
			var getPosCode = `
{0}
uniform vec{1} offsets, scales, animatedScales;
uniform float n;
#define PI 3.14159265359
vec{1} getPos()
{
	return offsets + vec{1}({2}) * scales + vec{1}({3}) * animatedScales;
}
`;
			var attrDeclCode = "", inputs = [/c(\d+)/g, "0.0"], inputCode = [], animatedInputCode = [];
			for (var d = 0, i = 0; d < ndim; d += 4, ++i)
			{
				var attrLen = Math.min(4, ndim - d);
				attrDeclCode += "attribute " + (attrLen == 1 ? "float" : "vec" + attrLen) + " p" + i + ";\n";
				for (var a = 0; a < attrLen; ++a)
					inputs.push("p" + i + (attrLen == 1 ? "" : "[" + a + "]"));
			}
			for (var d = 0; d < ND; ++d)
			{
				inputCode.push(String.prototype.format2.apply(activeInputVectors[d] ? activeInputVectors[d].getValueCode : "0.0", inputs));
				animatedInputCode.push(String.prototype.format2.apply(activeInputVectors[d] ? animatedInputVectors[d].getValueCode : "0.0", inputs));
			}
			attrDeclCode += "attribute float i;\n";
			if (forLineSdr)
				getPosCode = getPosCode.format(attrDeclCode, 4, inputCode.slice(0, 4).join(", "), animatedInputCode.slice(0, 4).join(", "));
			else
				getPosCode = getPosCode.format(attrDeclCode, 3, inputCode.slice(0, 3).join(", "), animatedInputCode.slice(0, 3).join(", "))
			
			
			//console.log(getPosCode);
			return getPosCode;
		}
		
		var posattr, lineattr;
		this.sdr = null;
		this.sdrLine = null;
		this.recompileShader = function(options)
		{
			// Free shaders
			if (this.sdr !== null)
				this.sdr.free();
			if (this.sdrLine !== null)
				this.sdrLine.free();
			
			// Create shader code for opacityMap() function -> opacityMapCoe
			var opacityMapCoe = "float opacityMap(in vec2 p) ";
			switch (options['pointShape'])
			{
			case "Circle":
				opacityMapCoe += "{ return 1.0 - pow(p.x*p.x + p.y*p.y, pointSize / 4.0); }";
				//opacityMapCoe += "{ return p.x*p.x + p.y*p.y < 1.0 ? 1.0 : 0.0; }";
				break;
			case "Cross":
				opacityMapCoe += "{ return pointSize / 4.0 * (max(4.0 / pointSize - abs(p.x - p.y), 0.0) + max(4.0 / pointSize - abs(-p.x - p.y), 0.0)); }";
				break;
			case "Diamond":
				opacityMapCoe += "{ return 1.0 - pow(abs(p.x) + abs(p.y), 2.0 + pointSize / 4.0); }";
				break;
			case "Gaussian":
				//opacityMapCoe += "{ return exp({0} * (p.x*p.x + p.y*p.y)); }".format(Math.log(0.001));
				opacityMapCoe += "{ return exp(-7.0 * (p.x*p.x + p.y*p.y)); }";
				break;
			case "Custom":
				opacityMapCoe += options['customPointShape'];
				break;
			default:
				opacityMapCoe += "{ return 1.0; }";
				break;
			}
			
			// Compile shaders
			this.sdr = new Shader(gl, [this.getPosCode(false), Shaders.vsDataPoint], ["precision highp float; uniform float pointSize;", opacityMapCoe, Shaders.fsDataPoint]);
			//this.sdr.transform = this.sdr.u1fv("transform");
			this.sdr.offsets = this.sdr.u3f("offsets");
			this.sdr.scales = this.sdr.u3f("scales");
			this.sdr.animatedScales = this.sdr.u3f("animatedScales");
			this.sdr.flipY = this.sdr.u1i("flipY");
			this.sdr.quadsize = this.sdr.u2f("quadsize");
			this.sdr.pointOpacity = this.sdr.u1f("pointOpacity"); this.sdr.pointOpacity(options['pointOpacity']);
			this.sdr.pointSize = this.sdr.u1f("pointSize"); this.sdr.pointSize(options['pointSize']);
			this.sdr.n = this.sdr.u1f("n"); if (this.sdr.n) this.sdr.n(numvertices);
			this.sdr.posattr = [this.sdr.getAttribLocation("p0"), this.sdr.getAttribLocation("p1"), this.sdr.getAttribLocation("p2"), this.sdr.getAttribLocation("p3")];
			this.sdr.vidattr = this.sdr.getAttribLocation("i");
			this.sdrLine = new Shader(gl, [this.getPosCode(true), Shaders.vsDataLine], ["precision highp float; uniform float pointSize;", opacityMapCoe, Shaders.fsDataLine]);
			//this.sdrLine.transform = this.sdrLine.u1fv("transform");
			this.sdrLine.offsets = this.sdrLine.u4f("offsets");
			this.sdrLine.scales = this.sdrLine.u4f("scales");
			this.sdrLine.animatedScales = this.sdrLine.u4f("animatedScales");
			this.sdrLine.flipY = this.sdrLine.u1i("flipY");
			this.sdrLine.quadsize = this.sdrLine.u2f("quadsize");
			this.sdrLine.pointOpacity = this.sdrLine.u1f("pointOpacity"); this.sdrLine.pointOpacity(options['pointOpacity']);
			this.sdrLine.pointSize = this.sdrLine.u1f("pointSize"); this.sdrLine.pointSize(options['pointSize']);
			this.sdrLine.n = this.sdrLine.u1f("n"); if (this.sdrLine.n) this.sdrLine.n(numvertices);
			this.sdrLine.posattr = [this.sdrLine.getAttribLocation("p0"), this.sdrLine.getAttribLocation("p1"), this.sdrLine.getAttribLocation("p2"), this.sdrLine.getAttribLocation("p3")];
			this.sdrLine.vidattr = this.sdrLine.getAttribLocation("i");
			this.sdrLine.lineattr = this.sdrLine.getAttribLocation("lineOffset");
			this.sdrLine.lineTransform = this.sdrLine.u2x2f("lineTransform");
		}
		if (activeInputVectors && animatedInputVectors)
			this.recompileShader(options);
		
		this.draw = function(texture, offset, count)
		{
			// Default values
			if (typeof offset === 'undefined') offset = 0;
			if (typeof count === 'undefined') count = numvertices;
			
			for(var i = 0; i < 16; i++)
			{
				gl.disableVertexAttribArray(i);
				if (gl.ext)
					gl.ext.vertexAttribDivisorANGLE(i, 0);
			}
			
			if (posbuffer)
			{
				gl.bindBuffer(gl.ARRAY_BUFFER, posbuffer);
				for(var d = 0, i = 0; d < ndim; d += 4, ++i)
					if (this.sdr.posattr[i] !== -1)
					{
						gl.enableVertexAttribArray(this.sdr.posattr[i]);
						gl.vertexAttribPointer(this.sdr.posattr[i], Math.min(4, ndim - d), gl.FLOAT, false, ndim * 4, (offset * ndim + d) * 4);
					}
			}
			
			if (this.sdr.vidattr !== -1)
			{
				gl.bindBuffer(gl.ARRAY_BUFFER, vidbuffer);
				gl.enableVertexAttribArray(this.sdr.vidattr);
				gl.vertexAttribPointer(this.sdr.vidattr, 1, gl.FLOAT, false, 4, offset * 4);
			}
			
			if(texture && this.sdr.samplerUniform)
			{
				gl.activeTexture(gl.TEXTURE0);
				gl.bindTexture(gl.TEXTURE_2D, texture);
				gl.uniform1i(this.sdr.samplerUniform, 0);
			}
			
			gl.drawArrays(gl.POINTS, 0, Math.min(count, numvertices - offset));
		}
		this.drawIndexed = function(texture, idxbuffer, count)
		{
			for(var i = 0; i < 16; i++)
			{
				gl.disableVertexAttribArray(i);
				if (gl.ext)
					gl.ext.vertexAttribDivisorANGLE(i, 0);
			}
			
			if (posbuffer)
			{
				gl.bindBuffer(gl.ARRAY_BUFFER, posbuffer);
				for(var d = 0, i = 0; d < ndim; d += 4, ++i)
					if (this.sdr.posattr[i] !== -1)
					{
						gl.enableVertexAttribArray(this.sdr.posattr[i]);
						gl.vertexAttribPointer(this.sdr.posattr[i], Math.min(4, ndim - d), gl.FLOAT, false, ndim * 4, d * 4);
					}
			}
			
			if (this.sdr.vidattr !== -1)
			{
				gl.bindBuffer(gl.ARRAY_BUFFER, vidbuffer);
				gl.enableVertexAttribArray(this.sdr.vidattr);
				gl.vertexAttribPointer(this.sdr.vidattr, 1, gl.FLOAT, false, 4, 0);
			}
			
			if(texture && this.sdr.samplerUniform)
			{
				gl.activeTexture(gl.TEXTURE0);
				gl.bindTexture(gl.TEXTURE_2D, texture);
				gl.uniform1i(this.sdr.samplerUniform, 0);
			}
			
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxbuffer);
			gl.drawElements(gl.POINTS, count, gl.UNSIGNED_INT, 0);
		}
		
		this.drawLines = function(texture, line, offset, count)
		{
			// Default values
			if (typeof offset === 'undefined') offset = 0;
			if (typeof count === 'undefined') count = numvertices;
			
			for(var i = 0; i < 16; i++)
			{
				gl.disableVertexAttribArray(i);
				gl.ext.vertexAttribDivisorANGLE(i, 0);
			}
			
			if (posbuffer)
			{
				gl.bindBuffer(gl.ARRAY_BUFFER, posbuffer);
				for(var d = 0, i = 0; d < ndim; d += 4, ++i)
					if (this.sdrLine.posattr[i] !== -1)
					{
						gl.enableVertexAttribArray(this.sdrLine.posattr[i]);
						gl.vertexAttribPointer(this.sdrLine.posattr[i], Math.min(4, ndim - d), gl.FLOAT, false, ndim * 4, (offset * ndim + d) * 4);
						gl.ext.vertexAttribDivisorANGLE(this.sdrLine.posattr[i], 1);
					}
			}
			
			if (this.sdr.vidattr !== -1)
			{
				gl.bindBuffer(gl.ARRAY_BUFFER, vidbuffer);
				gl.enableVertexAttribArray(this.sdr.vidattr);
				gl.vertexAttribPointer(this.sdrLine.vidattr, 1, gl.FLOAT, false, 4, offset * 4);
					gl.ext.vertexAttribDivisorANGLE(this.sdrLine.vidattr, 1);
			}
			
			if(texture && this.sdrLine.samplerUniform)
			{
				gl.activeTexture(gl.TEXTURE0);
				gl.bindTexture(gl.TEXTURE_2D, texture);
				gl.uniform1i(this.sdrLine.samplerUniform, 0);
			}
			
			// Compute line vertices
			var lineTransform = mat2.create();
			mat2.scale(lineTransform, lineTransform, vec2.fromValues(Math.sqrt(line[0]*line[0] + line[1]*line[1]), Math.max(1, options['pointSize'] /*/ 10*/)));
			mat2.rotate(lineTransform, lineTransform, Math.atan2(line[1], line[0]));
			mat2.scale(lineTransform, lineTransform, vec2.fromValues(1 / gl.width, 1 / gl.height));
			this.sdrLine.lineTransform(lineTransform);
			
			gl.bindBuffer(gl.ARRAY_BUFFER, linebuffer);
			gl.enableVertexAttribArray(this.sdrLine.lineattr);
			gl.vertexAttribPointer(this.sdrLine.lineattr, 2, gl.FLOAT, false, 0, 0);
			gl.ext.vertexAttribDivisorANGLE(this.sdrLine.lineattr, 0);
			
			gl.ext.drawArraysInstancedANGLE(gl.TRIANGLE_FAN, 0, 4, Math.min(count, numvertices - offset));
		}
		
		this.free = function()
		{
			gl.bindBuffer(gl.ARRAY_BUFFER, null);
			
			if (posbuffer)
				gl.deleteBuffer(posbuffer);
			posbuffer = null;
			
			gl.deleteBuffer(linebuffer);
			linebuffer = null;
			
			if(this.sdr != null)
				this.sdr.free();
		}
	}
}