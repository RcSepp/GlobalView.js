/**
 * A class drawing x- and y axes to the left- and bottom of the scatter plot.
 * @constructor
 * @package
 * @implements {Viewer}
 * @param {Object} gl // {WebGLRenderingContext}
 * @param {Object} globalView // {GlobalView}
 */
function CoordinateSystem(gl, globalView)
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
	
	// Create a 2D line mesh
	var meshLine = new Mesh(gl, new Float32Array([
		// Positions
		0, 0, 0,
		1, 0, 0
	]), null, null, null, null, null, gl.LINES);
	
	var axes = [
		{minimum: 0, maximum: 100, values: null, tickOffset: 0, tickDistance: 10, tickCount: 11, tickLength: TICK_LENGTH},
		{minimum: 0, maximum: 100, values: null, tickOffset: 0, tickDistance: 10, tickCount: 11, tickLength: TICK_LENGTH}
	];
	
	/** @type {number} */ var xTickLabel_top = 0;
	/** @type {number} */ var yTickLabel_left = 0;
	
	this.visible = [true, true];
	this.render = function(flipY, plotBounds)
	{
		var mattrans = mat4.create();
		
		// >>> Draw axes
		
		sdrLine.bind();
		meshLine.bind(sdrLine, null);
		// Draw x-axis
		if (this.visible[0])
		{
			mat4.identity(mattrans);
			if (flipY === true)
				mat4.scale(mattrans, mattrans, [1.0, -1.0, 1.0]);
			mat4.translate(mattrans, mattrans, [2 * (plotBounds.x + 0.5) / gl.width - 1, 2 * (plotBounds.y + 0.5) / gl.height - 1, 0]); // 0.5 ... center inside pixel
			mat4.scale(mattrans, mattrans, [2 * plotBounds.width / gl.width, 1, 1]);
			sdrLine.matWorldViewProj(mattrans);
			meshLine.draw();
		}
		// Draw y-axis
		if (this.visible[1])
		{
			mat4.identity(mattrans);
			if (flipY === true)
				mat4.scale(mattrans, mattrans, [1.0, -1.0, 1.0]);
			mat4.translate(mattrans, mattrans, [2 * (plotBounds.x + 0.5) / gl.width - 1, 2 * (plotBounds.y + 0.5) / gl.height - 1, 0]); // 0.5 ... center inside pixel
			mat4.rotateZ(mattrans, mattrans, Math.PI / 2.0);
			mat4.scale(mattrans, mattrans, [2 * plotBounds.height / gl.height, 1, 1]);
			sdrLine.matWorldViewProj(mattrans);
			meshLine.draw();
		}
		
		// >>> Draw ticks and tick labels
		
		// Draw x-axis ticks and tick labels
		xTickLabel_top = 0;
		if (this.visible[0])
		{
			var axis = axes[0];
			mat4.identity(mattrans);
			if (flipY === true)
				mat4.scale(mattrans, mattrans, [1.0, -1.0, 1.0]);
			mat4.translate(mattrans, mattrans, [2 * (plotBounds.x + 0.5) / gl.width - 1, 2 * (plotBounds.y + 0.5) / gl.height - 1, 0]); // 0.5 ... center inside pixel
			mat4.rotateZ(mattrans, mattrans, -Math.PI / 2.0);
			mat4.scale(mattrans, mattrans, [2 * axis.tickLength / gl.height, 2 * plotBounds.width / gl.width, 1]);
			sdrLine.matWorldViewProj(mattrans);
			meshLine.draw();
			mat4.translate(mattrans, mattrans, [0.0, 1.0, 0.0]);
			sdrLine.matWorldViewProj(mattrans);
			meshLine.draw();
			mat4.translate(mattrans, mattrans, [0.0, -1.0, 0.0]);
			for (var i = 0; i < axis.tickCount; ++i)
			{
				var x = axis.tickOffset + i * axis.tickDistance;
				var tickPos = (x - axis.minimum) / (axis.maximum - axis.minimum);
				
				mat4.translate(mattrans, mattrans, [0.0, tickPos, 0.0]);
				sdrLine.matWorldViewProj(mattrans);
				meshLine.draw();
				mat4.translate(mattrans, mattrans, [0.0, -tickPos, 0.0]);
				
				var tickLabel = axis.values ? axis.values[x] : x.toPrecision(6) / 1;
				gl.drawText(tickLabel, plotBounds.x + plotBounds.width * tickPos, gl.height - plotBounds.y + axis.tickLength + 2, 'topcenter');
			}
			xTickLabel_top = gl.height - plotBounds.y + axis.tickLength + 10 + gl.measureTextHeight();
		}
		// Draw y-axis ticks and tick labels
		yTickLabel_left = 0;
		if (this.visible[1])
		{
			var axis = axes[1];
			mat4.identity(mattrans);
			if (flipY === true)
				mat4.scale(mattrans, mattrans, [1.0, -1.0, 1.0]);
			mat4.translate(mattrans, mattrans, [2 * (plotBounds.x + 0.5) / gl.width - 1, 2 * (plotBounds.y + 0.5) / gl.height - 1, 0]); // 0.5 ... center inside pixel
			mat4.scale(mattrans, mattrans, [-2 * axis.tickLength / gl.width, 2 * plotBounds.height / gl.height, 1]);
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
				yTickLabel_left = Math.max(yTickLabel_left, gl.measureTextWidth(tickLabel));
				gl.drawText(tickLabel, plotBounds.x - axis.tickLength - 2, gl.height - plotBounds.y - plotBounds.height * tickPos, 'middleright');
			}
			yTickLabel_left = Math.ceil(plotBounds.x - axis.tickLength - 10 - yTickLabel_left);
		}
		
		// >>> Draw axis labels
		
		// Draw x-axis label
		if (this.visible[0] && axes[0].label)
			gl.drawText(axes[0].label, plotBounds.x + plotBounds.width / 2, xTickLabel_top, 'topcenter');
		if (this.visible[1] && axes[1].label)
			gl.drawText(axes[1].label, yTickLabel_left, gl.height - plotBounds.y - plotBounds.height / 2, 'bottomcenter', -Math.PI / 2);
	}
	
	function checkOverlap(d)
	{
		const MIN_TICK_LABEL_DISTANCE = gl.measureTextWidth('  '); // Minimum distance between tick labels in pixel
		switch (d)
		{
		case 0:
			var axis = axes[0], overlap = Number.MIN_VALUE, plotBounds = globalView.getPlotBounds();
			for (var i = 0; i < axis.tickCount; ++i)
			{
				var x = axis.tickOffset + i * axis.tickDistance;
				var tickPos = (x - axis.minimum) / (axis.maximum - axis.minimum);
				
				var tickLabel = axis.values ? axis.values[x] : x.toPrecision(6) / 1;
				
				var labelWidth = gl.measureTextWidth(tickLabel);
				var leftLabelBound = plotBounds.x + plotBounds.width * tickPos - labelWidth / 2;
				if (leftLabelBound < overlap + MIN_TICK_LABEL_DISTANCE)
					return false;
				
				overlap = leftLabelBound + labelWidth;
			}
			return true;
			
		case 1:
			var axis = axes[1], plotBounds = globalView.getPlotBounds();
			return plotBounds.height * axis.tickDistance / (axis.maximum - axis.minimum) >= gl.measureTextHeight() + MIN_TICK_LABEL_DISTANCE;
			
		default: return true;
		}
	}
	
	/**
	 * @param  {number} d
	 * @param  {number} minimum
	 * @param  {number} maximum
	 * @param  {boolean=} changeTickDistance=true
	 */
	this.setNumericRange = function(d, minimum, maximum, changeTickDistance)
	{
		var axis = axes[d];
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
			
			if (checkOverlap(d))
				break;
		}
	}
	this.setEnumRange = function(d, minimum, maximum, values)
	{
		var axis = axes[d];
		axis.minimum = minimum -= 0.5; // 0.5 ... Move to center of value-bin
		axis.maximum = maximum -= 0.5; // 0.5 ... Move to center of value-bin
		axis.values = values;
		
		axis.tickDistance = 1;
		axis.tickOffset = Math.max(0, Math.ceil(minimum / axis.tickDistance) * axis.tickDistance);
		axis.tickCount = Math.min(values.length - axis.tickOffset, Math.floor((maximum - axis.tickOffset + 1) / axis.tickDistance));
	}
	this.setLabel = function(d, label)
	{
		axes[d].label = label;
	}
	
	this.setDataset = function(dataset, options) {}
	this.onInputChanged = function(activeInputs, animatedInputs, options) {}
	this.onOptionsChanged = function(options)
	{
		axes[0].tickLength = TICK_LENGTH + (options['showXAxisHistogram'] ? options['histogramHeight'] : 0);
		axes[1].tickLength = TICK_LENGTH + (options['showYAxisHistogram'] ? options['histogramHeight'] : 0);
	}
	this.onPlotBoundsChanged = function(plotBounds)
	{
		for (var i = 0; i < 2; ++i)
			axes[i].values === null ?
				this.setNumericRange(i, axes[i].minimum, axes[i].maximum, true) :
				this.setEnumRange(i, axes[i].minimum + 0.5, axes[i].maximum + 0.5, axes[i].values);
	}
	
	this.labelFromPoint = function(plotBounds, p)
	{
		if (this.visible[0])
		{
			var halfTextWidth = gl.measureTextWidth(axes[0].label) / 2;
			var plotCenter = plotBounds.x + plotBounds.width / 2;
			if (p[0] >= plotCenter - halfTextWidth && p[0] < plotCenter + halfTextWidth && p[1] >= xTickLabel_top && p[1] <= xTickLabel_top + gl.measureTextHeight() + 2)
				return 0;
		}
		if (this.visible[1])
		{
			var halfTextWidth = gl.measureTextWidth(axes[1].label) / 2;
			var plotCenter = gl.height - plotBounds.y - plotBounds.height / 2;
			if (p[0] >= yTickLabel_left - gl.measureTextHeight() && p[0] <= yTickLabel_left + 2 && p[1] >= plotCenter - halfTextWidth && p[1] < plotCenter + halfTextWidth)
				return 1;
		}
		return null;
	}
	this.getLabelBounds = function(plotBounds, d)
	{
		switch (d)
		{
		case 0:
			if (!this.visible[0])
				return null;
			var halfTextWidth = gl.measureTextWidth(axes[0].label) / 2;
			var plotCenter = plotBounds.x + plotBounds.width / 2;
			return {'l': plotCenter - halfTextWidth, 'r': plotCenter + halfTextWidth, 't': xTickLabel_top, 'b': xTickLabel_top + gl.measureTextHeight() + 2};
			
		case 1:
			if (!this.visible[1])
				return null;
			var halfTextWidth = gl.measureTextWidth(axes[1].label) / 2;
			var plotCenter = gl.height - plotBounds.y - plotBounds.height / 2;
			return {'l': yTickLabel_left - gl.measureTextHeight(), 'r': yTickLabel_left + 2, 't': plotCenter - halfTextWidth, 'b': plotCenter + halfTextWidth};
		}
		return null;
	}
	
	this.free = function()
	{
		meshLine.free();
	}
}