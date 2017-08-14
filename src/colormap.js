const COLORMAP_WIDTH = 10; // [pixel]

/**
 * A class holding the active colormap for the global view.
 * This class also draws a color axis to the right of the scatter plot.
 * @constructor
 * @package
 * @implements {Viewer}
 * @param {Object} gl // {WebGLRenderingContext}
 * @param {Object} globalView // {GlobalView}
 */
function Colormap(gl, globalView)
{
	const TICK_LENGTH = 6; // [pixel]
	const NUM_TICKS = 10;
	
	var sdrLine = new Shader(gl, Shaders.vsSimple, Shaders.fsLine);
	sdrLine.color = sdrLine.u4f("color");
	sdrLine.color.apply(sdrLine, gl.foreColor);
	sdrLine.matWorldViewProj = sdrLine.u4x4f("matWorldViewProj");
	this.updateColorSchema = function() {
		sdrLine.color.apply(sdrLine, gl.foreColor);
	}
	
	var sdrColormap = new Shader(gl, Shaders.vsTextured, Shaders.fsTextured1D);
	sdrColormap.matWorldViewProj = sdrColormap.u4x4f("matWorldViewProj");
	var colormaps = {
		exhue: LoadTexture(gl, "exhue.png", function() { globalView.invalidate(); }),//function() { setTimeout(function() { globalView.invalidate(); }, 1000); }),
		rainbow: LoadTexture(gl, "rainbow.png", function() { globalView.invalidate(); }),//function() { setTimeout(function() { globalView.invalidate(); }, 1000); }),
		2: LoadTextureFromByteArray(gl, new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255]), 2, 1)
	};
	this.builtinColormaps = ["exhue", "rainbow"];
var texColormap = colormaps.exhue;
	
	// Create a 2D line mesh
	var meshLine = new Mesh(gl, new Float32Array([
		// Positions
		0, 0, 0,
		1, 0, 0
	]), null, null, null, null, null, gl.LINES);

	// Create a 2D line quad mesh
	var meshLineQuad = new Mesh(gl, new Float32Array([
		// Positions
		0, 0, 0,
		1, 0, 0,
		1, 1, 0,
		0, 1, 0
	]), null, null, null, null, null, gl.LINE_LOOP);
	
	// Create a 2D quad mesh
	var meshQuad = new Mesh(gl, new Float32Array([
		// Positions
		0, 1, 0,
		0, 0, 0,
		1, 1, 0,
		1, 0, 0
	]), null, null, null, new Float32Array([
		// Texture coordinates
		0, 1,
		0, 0,
		1, 1,
		1, 0
	]));
	
	var axis = {minimum: 0, maximum: 100, values: null, tickOffset: 0, tickDistance: 10, tickCount: 11, tickLength: TICK_LENGTH};
	
	this.visible = true;
	this.render = function(flipY, plotBounds)
	{
		if (!this.visible)
			return;
		
		// >>> Draw colormap
		
		sdrColormap.bind();
		meshQuad.bind(sdrColormap, texColormap);
		
		var mattrans = mat4.create();
		mat4.identity(mattrans);
		if (flipY === true)
			mat4.scale(mattrans, mattrans, [1.0, -1.0, 1.0]);
		mat4.translate(mattrans, mattrans, [2 * (plotBounds.x + plotBounds.width + 0.5) / gl.width - 1, 2 * (plotBounds.y + 0.5) / gl.height - 1, 0]); // 0.5 ... center inside pixel
		mat4.scale(mattrans, mattrans, [2 * COLORMAP_WIDTH / gl.width, 2 * plotBounds.height / gl.height, 1]);
		sdrColormap.matWorldViewProj(mattrans);
		meshQuad.draw();
		
		// >>> Draw borders
		
		sdrLine.bind();
		meshLineQuad.bind(sdrLine, null);
		
		sdrLine.matWorldViewProj(mattrans);
		meshLineQuad.draw();
		
		// >>> Draw ticks and tick labels
		
		// Draw y-axis ticks and tick labels
		var tickLabel_left = 0.0;
		mat4.identity(mattrans);
		if (flipY === true)
			mat4.scale(mattrans, mattrans, [1.0, -1.0, 1.0]);
		mat4.translate(mattrans, mattrans, [2 * (plotBounds.x + plotBounds.width + COLORMAP_WIDTH + 0.5) / gl.width - 1, 2 * (plotBounds.y + 0.5) / gl.height - 1, 0]); // 0.5 ... center inside pixel
		mat4.scale(mattrans, mattrans, [2 * axis.tickLength / gl.width, 2 * plotBounds.height / gl.height, 1]);
		sdrLine.matWorldViewProj(mattrans);
		meshLine.draw();
		mat4.translate(mattrans, mattrans, [0.0, 1.0, 0.0]);
		sdrLine.matWorldViewProj(mattrans);
		meshLine.draw();
		mat4.translate(mattrans, mattrans, [0.0, -1.0, 0.0]);
		for (var i = 0; i < axis.tickCount; ++i)
		{
			var y = axis.tickOffset + i * axis.tickDistance;
			var tickPos = (y - axis.minimum) / (axis.maximum - axis.minimum);
			
			mat4.translate(mattrans, mattrans, [0.0, tickPos, 0.0]);
			sdrLine.matWorldViewProj(mattrans);
			meshLine.draw();
			mat4.translate(mattrans, mattrans, [0.0, -tickPos, 0.0]);
			
			var tickLabel = axis.values ? axis.values[y] : y.toPrecision(6) / 1;
			tickLabel_left = Math.max(tickLabel_left, gl.measureTextWidth(tickLabel));
			gl.drawText(tickLabel, plotBounds.x + plotBounds.width + COLORMAP_WIDTH + axis.tickLength + 2, gl.height - plotBounds.y - plotBounds.height * tickPos, 'middleleft');
		}
		tickLabel_left = Math.ceil(plotBounds.x + plotBounds.width + COLORMAP_WIDTH + axis.tickLength + 10 + tickLabel_left);
		
		// >>> Draw axis label
		
		if (axis.label)
			gl.drawText(axis.label, tickLabel_left, gl.height - plotBounds.y - plotBounds.height / 2, 'topcenter', -Math.PI / 2);
	}
	
	function checkOverlap()
	{
		const MIN_TICK_LABEL_DISTANCE = gl.measureTextWidth('  '); // Minimum distance between tick labels in pixel
		var plotBounds = globalView.getPlotBounds();
		return plotBounds.height * axis.tickDistance / (axis.maximum - axis.minimum) >= gl.measureTextHeight() + MIN_TICK_LABEL_DISTANCE;
	}
	
	/**
	 * @param  {number} minimum
	 * @param  {number} maximum
	 * @param  {boolean=} changeTickDistance=true
	 */
	this.setNumericRange = function(minimum, maximum, changeTickDistance)
	{
		axis.minimum = minimum;
		axis.maximum = maximum;
		axis.values = null;
		
		for (var numTicks = NUM_TICKS; numTicks >= 0; --numTicks)
		{
			if (changeTickDistance === false)
			{
				axis.tickOffset = Math.ceil(minimum / axis.tickDistance) * axis.tickDistance;
				axis.tickCount = Math.floor((maximum - axis.tickOffset) / axis.tickDistance) + 1;
			}
			else
			{
				axis.tickDistance = (maximum - minimum) / numTicks;
				var exp = Math.ceil(Math.log(axis.tickDistance) / Math.log(10)); // Compute power-of-10 just above tickDistance -> pow(10, exp)
				
				// Try less aggressive rounding in each iteration until break condition is met
				for (var i = 0; i < 10; ++i) // Maximum 10 iterations
				{
					axis.tickDistance = (maximum - minimum) / numTicks;
					var base = Math.pow(10, exp--);
					axis.tickDistance = Math.round(axis.tickDistance / base) * base; // Round tickDistance to base
					axis.tickOffset = Math.ceil(minimum / axis.tickDistance) * axis.tickDistance;
					axis.tickCount = Math.floor((maximum - axis.tickOffset) / axis.tickDistance) + 1;
					if (axis.tickCount >= numTicks - 2 && axis.tickCount <= numTicks + 2) // Condition: numTicks - 2 <= tickCount <= numTicks + 2
						break;
				}
			}
			
			if (checkOverlap())
				break;
		}
	}
	this.setEnumRange = function(minimum, maximum, values)
	{
		axis.minimum = minimum -= 0.5; // 0.5 ... Move to center of value-bin
		axis.maximum = maximum -= 0.5; // 0.5 ... Move to center of value-bin
		axis.values = values;
		
		axis.tickDistance = 1;
		axis.tickOffset = Math.max(0, Math.ceil(minimum / axis.tickDistance) * axis.tickDistance);
		axis.tickCount = Math.min(values.length - axis.tickOffset, Math.floor((maximum - axis.tickOffset + 1) / axis.tickDistance));
	}
	this.setLabel = function(label)
	{
		axis.label = label;
	}
	
	var pointColor = null;
	this.setDataset = function(dataset, options) {}
	this.onInputChanged = function(activeInputs, animatedInputs, options) {}
	this.onOptionsChanged = function(options)
	{
		axis.tickLength = TICK_LENGTH + (options['showColormapHistogram'] ? options['histogramHeight'] : 0);
		if (options['pointColor'] !== pointColor)
		{
			pointColor = options['pointColor'];
			
if (pointColor === null)
texColormap = colormaps.exhue;
else
{
			var c = parseColormap(pointColor);
			if (c)
				texColormap = LoadTextureFromByteArray(gl, c, c.length / 4, 1);
}
		}
	}
	this.onPlotBoundsChanged = function(plotBounds)
	{
		axis.values === null ?
			this.setNumericRange(axis.minimum, axis.maximum, true) :
			this.setEnumRange(axis.minimum + 0.5, axis.maximum + 0.5, axis.values);
	}
	
	this.getTexture = function()
	{
		return texColormap;
	}
	
	this.free = function()
	{
		meshLine.free();
	}
}

function validateColor(color)
{
	if (isString(color))
	{
		if (!isUndefined(colorNameToHex(color)))
			return true; // color is known color name
		var rgb;
		if ((rgb = hexToRgb(color)) !== null &&
			rgb.r >= 0x00 && rgb.r <= 0xFF &&
			rgb.g >= 0x00 && rgb.g <= 0xFF &&
			rgb.b >= 0x00 && rgb.b <= 0xFF)
			return true; // color is hex color
		return "Unknown color " + color;
	}
	
	if (isArray(color))
	{
		if (color.length !== 4)
			return "Color array needs to have 4 components (RGBA).";
		return true;
	}
	
	return "Unknown color " + color;
}
function parseColor(color)
{
	if (isString(color))
	{
		var hex = colorNameToHex(color);
		var rgb = hexToRgb(hex ? hex : color);
		return rgb ? new Uint8Array([rgb.r, rgb.g, rgb.b, 255]) : null;
	}
	
	if (isArray(color))
		return color.length >= 4 ? new Uint8Array([color[0], color[1], color[2], color[3]]) : null;
	
	return null;
}

function validateColormap(colormap)
{
if (colormap === null) return true;
	if (isString(colormap))
		return validateColor(colormap);
	
	if (isArray(colormap))
	{
		if (colormap.length === 0)
			return "Colormap array cannot be empty.";
		if (isString(colormap[0]))
		{
			var err;
			for (var i = 0; i < colormap.length; ++i)
				if ((err = validateColor(colormap[i])) !== true)
					return err;
			return true;
		}
		else
		{
			if (colormap.length % 4 !== 0)
				return "Colormap array length must be multiple of 4.";
			for (var i = 0; i < colormap.length; ++i)
				if (!isNumber(colormap[i]) || colormap[i] < 0x00 || colormap[i] > 0xFF)
					return "Colormap array must contain numbers between 0 and 255.";
			return true;
		}
	}
	
	return "Unknown colormap " + colormap;
}
function parseColormap(colormap)
{
	if (isString(colormap))
		return parseColor(colormap);
	
	if (isArray(colormap))
	{
		if (colormap.length === 0)
			return null;
		if (isString(colormap[0]))
		{
			var array = [], color;
			for (var i = 0; i < colormap.length; ++i)
				if ((color = parseColor(colormap[i])))
					Array.prototype.push.apply(array, color);
				else
					return null;
			return new Uint8Array(array);
		}
		else if(isNumber(colormap[0]))
			return new Uint8Array(colormap);
	}
	
	return null;
}
