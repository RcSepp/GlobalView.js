var currentShader = null;
/**
 * A WebGL shader
 * @constructor
 * @package
 * @param {Object} gl // {WebGLRenderingContext}
 * @param {string|Array<string>} vs
 * @param {string|Array<string>} fs
 * @param {boolean=} debug = false
 */
function Shader(gl, vs, fs, debug)
{
	if (isArray(vs))
		vs = vs.join('\n');
	if (isArray(fs))
		fs = fs.join('\n');
	if (debug === true)
	{
		console.log(vs);
		console.log(fs);
	}
	
	// Compile vertex shader -> vertexShader
	var vertexShader = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vertexShader, vs);
	gl.compileShader(vertexShader);
	if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS))
	{
		console.log(vs);
		alert(gl.getShaderInfoLog(vertexShader));
		return null;
	}
	
	// Compile frament shader -> fragmentShader
	var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fragmentShader, fs);
	gl.compileShader(fragmentShader);
	if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS))
	{
		console.log(fs);
		alert(gl.getShaderInfoLog(fragmentShader));
		return null;
	}
	
	// Link shader program -> sdr
	var sdr = gl.createProgram();
	gl.attachShader(sdr, vertexShader);
	gl.attachShader(sdr, fragmentShader);
	gl.linkProgram(sdr);
	if (!gl.getProgramParameter(sdr, gl.LINK_STATUS))
	{
		console.log(vs);
		console.log(fs);
		alert(gl.getProgramInfoLog(sdr));
		return null;
	}
	
	/* // Print active uniforms
	var count = gl.getProgramParameter(sdr, gl.ACTIVE_UNIFORMS);
	for (var i = 0; i < count; ++i)
		console.log(gl.getActiveUniform(sdr, i).name);*/
	
this.vertexPositionAttribute = gl.getAttribLocation(sdr, "vpos");
this.vertexNormalAttribute = gl.getAttribLocation(sdr, "vnml");
this.vertexTangentAttribute = gl.getAttribLocation(sdr, "vtng");
this.vertexBinormalAttribute = gl.getAttribLocation(sdr, "vbnml");
this.VertexTexCoordAttribute = gl.getAttribLocation(sdr, "vtexcoord");
this.samplerUniform = gl.getUniformLocation(sdr, "uSampler");
this.samplerArrayUniform = gl.getUniformLocation(sdr, "uSamplers");
	
	this.bind = function()
	{
		if (currentShader !== this)
		{
			currentShader = this;
			gl.useProgram(sdr);
		}
	}
	
	this.u1i = function(uniformString)
	{
		this.bind();
		var uniform = gl.getUniformLocation(sdr, uniformString);
		if (uniform)
			return function(i) {
				this.bind();
				gl.uniform1i(uniform, i);
				if (debug)
					console.log("gl.uniform1i({0}, {1})".format(uniformString, i));
			};
		else
			return debug ? i => console.log("Passing value to unused uniform " + uniformString) : null;
	}
	this.u1f = function(uniformString)
	{
		this.bind();
		var uniform = gl.getUniformLocation(sdr, uniformString);
		if (uniform)
			return function(f) {
				this.bind();
				gl.uniform1f(uniform, f);
				if (debug)
					console.log("gl.uniform1f({0}, {1})".format(uniformString, f));
			};
		else
			return debug ? f => console.log("Passing value to unused uniform " + uniformString) : null;
	}
	this.u2f = function(uniformString)
	{
		this.bind();
		var uniform = gl.getUniformLocation(sdr, uniformString);
		if (uniform)
			return function(x, y) {
				this.bind();
				gl.uniform2f(uniform, x, y);
				if (debug)
					console.log("gl.uniform2f({0}, {1}, {2})".format(uniformString, x, y));
			};
		else
			return debug ? f => console.log("Passing value to unused uniform " + uniformString) : null;
	}
	this.u2x2f = function(uniformString)
	{
		this.bind();
		var uniform = gl.getUniformLocation(sdr, uniformString);
		if (uniform)
			return function(m) {
				this.bind();
				gl.uniformMatrix2fv(uniform, false, m);
				if (debug)
					console.log("gl.uniformMatrix2fv({0}, {1})".format(uniformString, m));
				};
		else
			return debug ? f => console.log("Passing value to unused uniform " + uniformString) : null;
	}
	this.u3f = function(uniformString)
	{
		this.bind();
		var uniform = gl.getUniformLocation(sdr, uniformString);
		if (uniform)
			return function(x, y, z) {
				this.bind();
				gl.uniform3f(uniform, x, y, z);
				if (debug)
					console.log("gl.uniform3f({0}, {1}, {2}, {3})".format(uniformString, x, y, z));
			};
		else
			return debug ? f => console.log("Passing value to unused uniform " + uniformString) : null;
	}
	this.u4f = function(uniformString)
	{
		this.bind();
		var uniform = gl.getUniformLocation(sdr, uniformString);
		if (uniform)
			return function(x, y, z, w) {
				this.bind();
				gl.uniform4f(uniform, x, y, z, w);
				if (debug)
					console.log("gl.uniform4f({0}, {1}, {2}, {3}, {4})".format(uniformString, x, y, z, w));
			};
		else
			return debug ? f => console.log("Passing value to unused uniform " + uniformString) : null;
	}
	this.u1fv = function(uniformString)
	{
		this.bind();
		var uniform = gl.getUniformLocation(sdr, uniformString);
		if (uniform)
			return function(v) {
				this.bind();
				gl.uniform1fv(uniform, v);
				if (debug)
					console.log("gl.uniform1fv({0}, {1})".format(uniformString, v));
			};
		else
			return debug ? f => console.log("Passing value to unused uniform " + uniformString) : null;
	}
	this.u4fv = function(uniformString)
	{
		this.bind();
		var uniform = gl.getUniformLocation(sdr, uniformString);
		if (uniform)
			return function(v) {
				this.bind();
				gl.uniform4fv(uniform, v);
				if (debug)
					console.log("gl.uniform4fv({0}, {1})".format(uniformString, v));
			};
		else
			return debug ? f => console.log("Passing value to unused uniform " + uniformString) : null;
	}
	this.u4x4f = function(uniformString)
	{
		this.bind();
		var uniform = gl.getUniformLocation(sdr, uniformString);
		if (uniform)
			return function(m) {
				this.bind();
				gl.uniformMatrix4fv(uniform, false, m);
				if (debug)
					console.log("gl.uniformMatrix4fv({0}, {1})".format(uniformString, m));
			};
		else
			return debug ? f => console.log("Passing value to unused uniform " + uniformString) : null;
	}
	
	this.getAttribLocation = function(attributeName) { return gl.getAttribLocation(sdr, attributeName); }
	
	this.free = function()
	{
		if (vertexShader != null || fragmentShader != null || sdr != null)
			gl.useProgram(null);
		
		if (vertexShader != null)
		{
			gl.deleteShader(vertexShader);
			vertexShader = null;
		}
		if (fragmentShader != null)
		{
			gl.deleteShader(fragmentShader);
			fragmentShader = null;
		}
		if (sdr != null)
		{
			gl.deleteProgram(sdr);
			sdr = null;
		}
	}
}

function validateGLSL(gl, code)
{
	var vertexShader = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vertexShader, "void main() {} " + code);
	gl.compileShader(vertexShader);
	if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS))
	{
		var err = gl.getShaderInfoLog(vertexShader);
		gl.deleteShader(vertexShader);
		return err;
	}
	gl.deleteShader(vertexShader);
	return true;
}



/**
 * A renderable WebGL mesh
 * @constructor
 * @package
 * @param {Object} _gl // {WebGLRenderingContext}
 * @param {Float32Array} positions
 * @param {Float32Array=} normals
 * @param {Float32Array=} tangents
 * @param {Float32Array=} binormals
 * @param {Float32Array=} texcoords
 * @param {Uint16Array=} indices
 * @param {number=} _primitivetype = gl.TRIANGLE_STRIP
 * @param {number=} _ndim = 3
 */
function Mesh(_gl, positions, normals, tangents, binormals, texcoords, indices, _primitivetype, _ndim)
{
	var gl = _gl;
	var posbuffer, nmlbuffer, tgtbuffer, bnmbuffer, texcoordbuffer, idxbuffer;
	var primitivetype, numvertices, numindices;
	var ndim;

	this.reset = function(positions, normals, tangents, binormals, texcoords, indices, _primitivetype, _ndim)
	{
		ndim = _ndim ? _ndim : 3;
		primitivetype = _primitivetype;
		numvertices = Math.floor(positions.length / ndim);
		numindices = 0;

		if(!posbuffer)
			posbuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, posbuffer);
		gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
		if(normals)
		{
			if(!nmlbuffer)
				nmlbuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, nmlbuffer);
			gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);
		}
		else if(!nmlbuffer)
			gl.deleteBuffer(nmlbuffer);
		if(tangents)
		{
			if(!tgtbuffer)
				tgtbuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, tgtbuffer);
			gl.bufferData(gl.ARRAY_BUFFER, tangents, gl.STATIC_DRAW);
		}
		else if(!tgtbuffer)
			gl.deleteBuffer(tgtbuffer);
		if(binormals)
		{
			if(!bnmbuffer)
				bnmbuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, bnmbuffer);
			gl.bufferData(gl.ARRAY_BUFFER, binormals, gl.STATIC_DRAW);
		}
		else if(!bnmbuffer)
			gl.deleteBuffer(bnmbuffer);
		if(texcoords)
		{
			if(!texcoordbuffer)
				texcoordbuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, texcoordbuffer);
			gl.bufferData(gl.ARRAY_BUFFER, texcoords, gl.STATIC_DRAW);
		}
		else if(!texcoordbuffer)
			gl.deleteBuffer(texcoordbuffer);
		if(indices)
		{
			if(!idxbuffer)
				idxbuffer = gl.createBuffer();
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxbuffer);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
			numindices = indices.length;
			if(typeof primitivetype === 'undefined')
				primitivetype = gl.TRIANGLES; // Default primitive type for indexed geometry is TRIANGLES
		}
		else
		{
			if(!idxbuffer)
				gl.deleteBuffer(idxbuffer);
			if(typeof primitivetype === 'undefined')
				primitivetype = gl.TRIANGLE_STRIP; // Default primitive type for non-indexed geometry is TRIANGLE_STRIP
		}
	}
	if(positions) // Mesh vertex positions array can't be null
		this.reset(positions, normals, tangents, binormals, texcoords, indices, _primitivetype, _ndim);

	this.bind = function(sdr, texture)
	{
		if(!posbuffer) // Mesh without vertex positions can't be rendered
			return;
		
		sdr.bind();
		
		for(var i = 0; i < 16; i++)
		{
			gl.disableVertexAttribArray(i);
			if (gl.ext)
				gl.ext.vertexAttribDivisorANGLE(i, 0);
		}
		
		gl.enableVertexAttribArray(sdr.vertexPositionAttribute);
		gl.bindBuffer(gl.ARRAY_BUFFER, posbuffer);
		gl.vertexAttribPointer(sdr.vertexPositionAttribute, ndim, gl.FLOAT, false, 0, 0);
		if(nmlbuffer && sdr.vertexNormalAttribute != -1)
		{
			gl.enableVertexAttribArray(sdr.vertexNormalAttribute);
			gl.bindBuffer(gl.ARRAY_BUFFER, nmlbuffer);
			gl.vertexAttribPointer(sdr.vertexNormalAttribute, ndim, gl.FLOAT, false, 0, 0);
		}
		if(tgtbuffer && sdr.vertexTangentAttribute != -1)
		{
			gl.enableVertexAttribArray(sdr.vertexTangentAttribute);
			gl.bindBuffer(gl.ARRAY_BUFFER, tgtbuffer);
			gl.vertexAttribPointer(sdr.vertexTangentAttribute, ndim, gl.FLOAT, false, 0, 0);
		}
		if(bnmbuffer && sdr.vertexBinormalAttribute != -1)
		{
			gl.enableVertexAttribArray(sdr.vertexBinormalAttribute);
			gl.bindBuffer(gl.ARRAY_BUFFER, bnmbuffer);
			gl.vertexAttribPointer(sdr.vertexBinormalAttribute, ndim, gl.FLOAT, false, 0, 0);
		}
		if(texcoordbuffer && sdr.VertexTexCoordAttribute != -1)
		{
			gl.enableVertexAttribArray(sdr.VertexTexCoordAttribute);
			gl.bindBuffer(gl.ARRAY_BUFFER, texcoordbuffer);
			gl.vertexAttribPointer(sdr.VertexTexCoordAttribute, 2, gl.FLOAT, false, 0, 0);
		}
		if(texture)
		{
			if(isArray(texture))
			{
				if(sdr.samplerArrayUniform)
				{
					var idxarray = new Array(i);
					for(var i = 0; i < texture.length; i++)
					{
						gl.activeTexture(gl.TEXTURE0 + i);
						gl.bindTexture(gl.TEXTURE_2D, texture[i]);
						idxarray[i] = i;
					}
					gl.uniform1iv(sdr.samplerArrayUniform, idxarray);
				}
			}
			else
			{
				gl.activeTexture(gl.TEXTURE0);
				gl.bindTexture(gl.TEXTURE_2D, texture);
				if(sdr.samplerUniform)
					gl.uniform1i(sdr.samplerUniform, 0);
				if(sdr.samplerArrayUniform)
					gl.uniform1iv(sdr.samplerArrayUniform, [0]);
			}
		}
		if(idxbuffer)
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxbuffer);
	}

	this.draw = function()
	{
		if(!posbuffer) // Mesh without vertex positions can't be rendered
			return;

		if(idxbuffer)
			gl.drawElements(primitivetype, numindices, gl.UNSIGNED_SHORT, 0);
		else
			gl.drawArrays(primitivetype, 0, numvertices);
	}

	this.free = function()
	{
		if(posbuffer)
		{
			gl.deleteBuffer(posbuffer);
			posbuffer = null;
		}
		if(nmlbuffer)
		{
			gl.deleteBuffer(posbuffer);
			posbuffer = null;
		}
		if(tgtbuffer)
		{
			gl.deleteBuffer(posbuffer);
			posbuffer = null;
		}
		if(bnmbuffer)
		{
			gl.deleteBuffer(posbuffer);
			posbuffer = null;
		}
		if(texcoordbuffer)
		{
			gl.deleteBuffer(posbuffer);
			posbuffer = null;
		}
		if(idxbuffer)
		{
			gl.deleteBuffer(posbuffer);
			posbuffer = null;
		}
	}
}


// >>> Section: Textures


function handleLoadedTexture(gl, texture, onload)
{
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.bindTexture(gl.TEXTURE_2D, null);
	
	if(typeof(onload) == 'function')
		onload(texture);
}
function LoadTexture(gl, filename, onload)
{
	var texture = gl.createTexture();
	texture.image = new Image();
	texture.image.onload = function() {handleLoadedTexture(gl, texture, onload)}
	texture.image.src = filename;
	return texture;
}
function LoadTextureFromImage(gl, image)
{
	var texture = gl.createTexture();
	texture.image = image;
	handleLoadedTexture(gl, texture, null);
	return texture;
}
function LoadTextureFromByteArray(gl, array, width, height)
{
	var texture = gl.createTexture();
	texture.byteArray = array;
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, array);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.bindTexture(gl.TEXTURE_2D, null);
	return texture;
}
function LoadTextureFromFloatArray(gl, array, width, height)
{
	if (gl.getExtension('OES_texture_float') === null)
	{
		console.warn("GlobalView warning: The browser doesn't support floatingpoint textures");
		return null;
	}
	var texture = gl.createTexture();
	texture.floatArray = array;
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, width, height, 0, gl.LUMINANCE, gl.FLOAT, array);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.bindTexture(gl.TEXTURE_2D, null);
	return texture;
}