/**
 * A helper class that attaches a 2D canvas to the parent div of the given WebGL canvas.
 * This 2D canvas is used to draw text.
 * @constructor
 * @package
 * @param {Object} gl // {WebGLRenderingContext}
 * @param {HTMLCanvasElement} canvas
 */
function TextRenderContext(gl, canvas)
{
	var textCanvas = document.createElement('canvas');
	textCanvas.style.backgroundColor = 'transparent';
	textCanvas.style.pointerEvents = 'none';
	textCanvas.style.zIndex = canvas.style.zIndex + 1;
	textCanvas.style.position = "static";//"absolute";
	//textCanvas.style.left = textCanvas.style.top = "0px";
	textCanvas.style.width = textCanvas.style.height = "100%";
	canvas.parentElement.appendChild(textCanvas);
	var ctx = textCanvas.getContext("2d");
	var _font = ctx.font;
	var fontHeight = ctx.measureText('M').width;
	
	
	this.clear = function()
	{
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.strokeStyle = ctx.fillStyle = gl.foreColorString;
	}
	
	gl.drawText = function(str, x, y, anchor, rotation, color)
	{
		x = Math.floor(x);
		y = Math.floor(y);
		
		if (color)
			ctx.fillStyle = color;
		
		var offsetV;
		switch (anchor)
		{
		default: // 'topleft'
			ctx.textAlign = "left";
			offsetV = fontHeight;
			break;
		case 'topcenter':
			ctx.textAlign = "center";
			offsetV = fontHeight;
			break;
		case 'topright':
			ctx.textAlign = "right";
			offsetV = fontHeight;
			break;
		case 'middleleft':
			ctx.textAlign = "left";
			offsetV = fontHeight * 0.53;
			break;
		case 'middlecenter':
			ctx.textAlign = "center";
			offsetV = fontHeight * 0.53;
			break;
		case 'middleright':
			ctx.textAlign = "right";
			offsetV = fontHeight * 0.53;
			break;
		case 'bottomleft':
			ctx.textAlign = "left";
			offsetV = 0;
			break;
		case 'bottomcenter':
			ctx.textAlign = "center";
			offsetV = 0;
			break;
		case 'bottomright':
			ctx.textAlign = "right";
			offsetV = 0;
			break;
		}
		if (rotation == 0)
			ctx.fillText(str, x, y + offsetV);
		else
		{
			ctx.save();
			ctx.translate(x, y);
			ctx.rotate(rotation);
			ctx.translate(0, offsetV);
			ctx.fillText(str, 0, 0);
			ctx.restore();
		}
		
		if (color)
			ctx.fillStyle = gl.foreColorString;
	}
	gl.measureTextWidth = function(str)
	{
		return ctx.measureText(str).width;
	}
	gl.measureTextHeight = function()
	{
		return fontHeight;
	}
	
	gl.drawRect = function(x, y, width, height)
	{
		if (width < 0)
		{
			x += width;
			width = -width;
		}
		if (height < 0)
		{
			y += height;
			height = -height;
		}
		
		x = Math.floor(x) + 0.5;
		y = Math.floor(y) + 0.5;
		width = Math.floor(width);
		height = Math.floor(height);
		
		//ctx.strokeStyle = gl.foreColorString;
		ctx.strokeRect(x, y, width, height);
	}
	
	gl.drawPolygon = function(points, color)
	{
		if (points.length < 2)
			return;
		
		if (color)
			ctx.fillStyle = color;
		ctx.beginPath();
		ctx.moveTo(points[0][0], points[0][1]);
		for (var i = 1; i < points.length; ++i)
			ctx.lineTo(points[i][0], points[i][1]);
		ctx.closePath();
		ctx.stroke();
		if (color)
			ctx.fillStyle = gl.foreColorString;
	}
	gl.fillPolygon = function(points, color)
	{
		if (points.length < 2)
			return;
		
		if (color)
			ctx.fillStyle = color;
		ctx.beginPath();
		ctx.moveTo(points[0][0], points[0][1]);
		for (var i = 1; i < points.length; ++i)
			ctx.lineTo(points[i][0], points[i][1]);
		ctx.closePath();
		ctx.fill();
		if (color)
			ctx.fillStyle = gl.foreColorString;
	}
	
	this.setFont = function(font)
	{
		ctx.font = _font = font;
		
		// Compute fontHeight (Source: http://stackoverflow.com/a/7462767)
		var body = document.getElementsByTagName("body")[0];
		var dummy = document.createElement("div");
		var dummyText = document.createTextNode("M");
		dummy.appendChild(dummyText);
		dummy.style.font = font;
		body.appendChild(dummy);
		fontHeight = dummy.offsetHeight * 0.62;
		body.removeChild(dummy);
	}
	
	this.onResize = function()
	{
		/*var canvasBounds = canvas.getBoundingClientRect();
		textCanvas.style.left = canvasBounds.left;
		textCanvas.style.top = canvasBounds.top;
		textCanvas.style.width = textCanvas.width = canvasBounds.width;
		textCanvas.style.height = textCanvas.height = canvasBounds.height;*/
		
		if (offscreenRendering !== null)
		{
			textCanvas.width = offscreenRendering.width;
			textCanvas.height = offscreenRendering.height;
		}
		else
		{
			var rect = textCanvas.getBoundingClientRect();
			textCanvas.style.marginTop = -(rect.bottom - rect.top) + "px";
			textCanvas.width = rect.right - rect.left;
			textCanvas.height = rect.bottom - rect.top;
		}
		this.setFont(_font); // Reset canvas font
	}
	
	var offscreenRendering = null;
	this.enableOffscreenRendering = function(width, height)
	{
		if (offscreenRendering !== null)
			return;
		offscreenRendering = {};
		
		offscreenRendering.width = width;
		offscreenRendering.height = height;
		offscreenRendering.oldCanvas = textCanvas;
		offscreenRendering.oldContext = ctx;
		textCanvas = document.createElement('canvas');
		ctx = textCanvas.getContext("2d");
		this.onResize();
	}
	this.disableOffscreenRendering = function()
	{
		if (offscreenRendering === null)
			return;
		
		textCanvas = offscreenRendering.oldCanvas;
		ctx = offscreenRendering.oldContext;
		offscreenRendering = null;
		//this.onResize();
	}
	this.getCanvas = function()
	{
		return textCanvas;
	}
	
	this.onResize();
}