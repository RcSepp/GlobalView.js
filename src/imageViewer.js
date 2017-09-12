//const LABEL_HEIGHT = 12, LABEL_WIDTH = 16.5;
var LABEL_HEIGHT = 12, LABEL_WIDTH = 16.5;
const LABEL_TEXT_PADDING = 2;

/**
 * An image label associated to a single datapoint of the dataset
 * @constructor
 * @export
 * @param {Object} globalView // {GlobalView}
 */
function Thumbnail(globalView)
{
	/** @type {WebGLTexture} */ this.tex = null;
	/** @type {Array<number>} */ this.imagePos = null;
	/** @type {Array<number>} */ this.refPos = null;
	/** @type {Array<number>} */ this.imageSize = null;
	/** @type {Array<number>} */ this.imageAnchor = null;
	
	/** @type {boolean} */ this.highlighted = false;
	
	/** @type {number} */ this.refIndex = -1;
	this['getPoint'] =
	/**
	 * @summary Retrieve index of associated datapoint
	 * @return {number}
	 */
	this.getPoint = function()
	{
		return this.refIndex;
	}
	
	/** @type {number} */ this.borderWidth = null;
	this['getBorderWidth'] =
	/**
	 * @summary Retrieve width of the image border
	 * @return {number}
	 */
	this.getBorderWidth = function()
	{
		return this.borderWidth ? this.borderWidth.slice() : null;
	}
	this['setBorderWidth'] =
	/**
	 * @summary Set width of the image border
	 * @param {number} width
	 */
	this.setBorderWidth = function(width)
	{
		this.borderWidth = width;
		globalView.invalidate();
	}
	
	/** @type {Array<number>} */ this.borderColor = null;
	this['getBorderColor'] =
	/**
	 * @summary Retrieve color of the image border
	 * @return {Array<number>} Float array [red, green, blue, alpha] or null
	 */
	this.getBorderColor = function()
	{
		return this.borderColor ? this.borderColor.slice() : null;
	}
	this['setBorderColor'] =
	/**
	 * @summary Set color of the image border
	 * @param {Array<number>} color Float array [red, green, blue, alpha] or null
	 */
	this.setBorderColor = function(color)
	{
		this.borderColor = color;
		globalView.invalidate();
	}
	
	/** @type {Array<number>} */ this.lineColor = null;
	this['getLineColor'] =
	/**
	 * @summary Retrieve color of the image line
	 * @return {Array<number>} Float array [red, green, blue, alpha] or null
	 */
	this.getLineColor = function()
	{
		return this.lineColor ? this.lineColor.slice() : null;
	}
	this['setLineColor'] =
	/**
	 * @summary Set color of the image line
	 * @param {Array<number>} color Float array [red, green, blue, alpha] or null
	 */
	this.setLineColor = function(color)
	{
		this.lineColor = color;
		globalView.invalidate();
	}
	
	/** @type {Array<number>} */ this.labelColor = null;
	this['getLabelColor'] =
	/**
	 * @summary Retrieve color of the image label
	 * @return {Array<number>} Float array [red, green, blue, alpha] or null
	 */
	this.getLabelColor = function()
	{
		return this.labelColor ? this.labelColor.slice() : null;
	}
	this['setLabelColor'] =
	/**
	 * @summary Set color of the image label
	 * @param {Array<number>} color Float array [red, green, blue, alpha] or null
	 */
	this.setLabelColor = function(color)
	{
		this.labelColor = color;
		globalView.invalidate();
	}
}

/**
 * A viewer that renders labels (thumbnails) to the global view.
 * @constructor
 * @package
 * @implements {Viewer}
 * @param {Object} gl // {WebGLRenderingContext}
 * @param {Object} globalView // {GlobalView}
 */
function ImageViewer(gl, globalView)
{
	var sdrImage = new Shader(gl, Shaders.vsTextured, Shaders.fsTextured);
	sdrImage.matWorldViewProj = sdrImage.u4x4f("matWorldViewProj");
	
	var sdrLine = new Shader(gl, Shaders.vsSimple, Shaders.fsLine);
	sdrLine.color = sdrLine.u4f("color");
	sdrLine.color.apply(sdrLine, gl.foreColor);
	sdrLine.matWorldViewProj = sdrLine.u4x4f("matWorldViewProj");
	
	// Create a 2D line mesh
	var meshLine = new Mesh(gl, new Float32Array([
		// Positions
		0, 0, 0,
		1, 0, 0
	]), null, null, null, null, null, gl.LINES);
	
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
	
	// Create a 2D line quad mesh
	var meshLineQuad = new Mesh(gl, new Float32Array([
		// Positions
		0, 0, 0,
		0, 1, 0,
		1, 1, 0,
		1, 0, 0
	]), null, null, null, null, null, gl.LINE_LOOP);
	
	// Create a 2D arrow mesh
LABEL_HEIGHT = gl.measureTextHeight() + 2 * LABEL_TEXT_PADDING;
LABEL_WIDTH = gl.measureTextWidth('888') + 2 * LABEL_TEXT_PADDING;
	var meshLabel = new Mesh(gl, new Float32Array([
		// Positions
		0.0,  0.0, 0,
		0.5 * LABEL_HEIGHT,  0.5 * LABEL_HEIGHT, 0,
		0.5 * LABEL_HEIGHT + LABEL_WIDTH,  0.5 * LABEL_HEIGHT, 0,
		0.5 * LABEL_HEIGHT + LABEL_WIDTH, -0.5 * LABEL_HEIGHT, 0,
		0.5 * LABEL_HEIGHT, -0.5 * LABEL_HEIGHT, 0
	]), null, null, null, null, null, gl.TRIANGLE_FAN);
	
	// Create a 2D line arrow mesh
	var meshLineLabel = new Mesh(gl, new Float32Array([
		// Positions
		0.0,  0.0, 0,
		0.5 * LABEL_HEIGHT,  0.5 * LABEL_HEIGHT, 0,
		0.5 * LABEL_HEIGHT + LABEL_WIDTH,  0.5 * LABEL_HEIGHT, 0,
		0.5 * LABEL_HEIGHT + LABEL_WIDTH, -0.5 * LABEL_HEIGHT, 0,
		0.5 * LABEL_HEIGHT, -0.5 * LABEL_HEIGHT, 0
	]), null, null, null, null, null, gl.LINE_LOOP);
	
	/** @type Array<Thumbnail> */ var images = [];
	
	var PixelAlignX = x => (Math.floor(x * gl.width / 2.0) + 0.5) * 2.0 / gl.width;
	var PixelAlignY = y => (Math.floor(y * gl.height / 2.0) + 0.5) * 2.0 / gl.height;
	
	this.render = function(flipY, tf)
	{
		if (images.length === 0)
			return;
		var mattrans = mat4.create();
		var imagePos = vec2.create(), refPos = vec2.create(), imageSize = vec2.create();
		
		//gl.disable(gl.SCISSOR_TEST);
		
		if (options['labelThumbnails'])
		{
			// Draw labels at image.refPos
			var label = 1;
			images.forEach(function(image) {
				if (image.imagePos === image.refPos)
					return;
				tf.transformPos(refPos, image.refPos);
				
				sdrLine.bind();
				mat4.identity(mattrans);
				if (flipY === true)
					mat4.scale(mattrans, mattrans, [1.0, -1.0, 1.0]);
				refPos[0] = PixelAlignX(refPos[0]);
				refPos[1] = PixelAlignY(refPos[1]);
				mat4.translate(mattrans, mattrans, [refPos[0], refPos[1], 0]);
				mat4.scale(mattrans, mattrans, [2 / gl.width, 2 / gl.height, 1]);
				sdrLine.matWorldViewProj(mattrans);
				
				sdrLine.color.apply(sdrLine, image.highlighted ? [1, 1, 0, 1] : (image.labelColor ? image.labelColor : defaultImageLabelColor));
				meshLabel.bind(sdrLine, null);
				meshLabel.draw();
				
				sdrLine.color.apply(sdrLine, image.borderColor ? image.borderColor : defaultImageBorderColor);
				meshLineLabel.bind(sdrLine, null);
				meshLineLabel.draw();
				
				refPos[0] = (1 + refPos[0]) * gl.width / 2;
				refPos[1] = (1 - refPos[1]) * gl.height / 2;
				refPos[0] += 0.5 * LABEL_HEIGHT + LABEL_WIDTH - LABEL_TEXT_PADDING; // Right-align label
				refPos[1] -= 0.5 * LABEL_HEIGHT - LABEL_TEXT_PADDING; // Right-align label
				gl.drawText(label++, refPos[0], refPos[1], 'topright');
			});
		}
		else
		{
			// Draw lines between image.imagePos and image.refPos
			sdrLine.bind();
			meshLine.bind(sdrLine, null);
			images.forEach(function(image) {
				if (!image.imagePos || image.imagePos === image.refPos)
					return;
				mat4.identity(mattrans);
				if (flipY === true)
					mat4.scale(mattrans, mattrans, [1.0, -1.0, 1.0]);
				tf.transformPos(imagePos, image.imagePos);
				tf.transformPos(refPos, image.refPos);
				mat4.translate(mattrans, mattrans, [imagePos[0], imagePos[1], 0.0]);
				var dx = refPos[0] - imagePos[0], dy = refPos[1] - imagePos[1];
				mat4.rotateZ(mattrans, mattrans, Math.atan2(dy, dx));
				mat4.scale(mattrans, mattrans, [Math.sqrt(dx*dx + dy*dy), 1.0, 1.0]);
				sdrLine.matWorldViewProj(mattrans);
				sdrLine.color.apply(sdrLine, image.lineColor ? image.lineColor : defaultImageLineColor);
				meshLine.draw();
			});
		}
		
		//gl.disable(gl.SCISSOR_TEST);
		
		sdrImage.bind();
		var label = 1;
		images.forEach(function(image) {
			if (!image.imagePos)
				return;
			
			//var normalizedImagePos = vec2.create();
			//tf.transformPos(normalizedImagePos, image.imagePos);
			//if (normalizedImagePos[0] < 0.0 || normalizedImagePos[0] >= 1.0 || normalizedImagePos[1] < 0.0 || normalizedImagePos[1] >= 1.0)
			//	return;
			
			tf.transformPos(imagePos, image.imagePos);
			
			// Set image size
			tf.transformNml2(imageSize, image.imageSize);
			var w = image.tex.image.width, h = image.tex.image.height;
			//imageSize[0] *= 2 / gl.width; imageSize[1] *= 2 / gl.height; // Transform imageSize from normalized space to device space
			var scale;
			if (Math.max(imageSize[0], imageSize[0] * h / w, 1.0) < Math.max(imageSize[1] * w / h, imageSize[1]))
				scale = [2 * Math.floor(imageSize[0]) / gl.width, 2 * Math.floor(imageSize[0] * h / w) / gl.height, 1];
			else
				scale = [2 * Math.floor(imageSize[1] * w / h) / gl.width, 2 * Math.floor(imageSize[1]) / gl.height, 1];
			
			var borderWidth = image.borderWidth ? image.borderWidth : defaultImageBorderWidth;
			if (borderWidth > 0)
			{
				scale[0] += 2 * borderWidth / gl.width;
				scale[1] += 2 * borderWidth / gl.height;
				
				meshQuad.bind(sdrLine);
				mat4.identity(mattrans);
				if (flipY === true)
					mat4.scale(mattrans, mattrans, [1.0, -1.0, 1.0]);
				imagePos[0] = PixelAlignX(imagePos[0]);
				mat4.translate(mattrans, mattrans, [imagePos[0], PixelAlignY(imagePos[1]), 0.0]);
				mat4.scale(mattrans, mattrans, scale);
				mat4.translate(mattrans, mattrans, image.imageAnchor); // Move anchor to imageAnchor
				sdrLine.matWorldViewProj(mattrans);
				sdrLine.color.apply(sdrLine, image.borderColor ? image.borderColor : defaultImageBorderColor);
				meshQuad.draw();
				
				scale[0] -= 2 * borderWidth / gl.width;
				scale[1] -= 2 * borderWidth / gl.height;
			}
			
			meshQuad.bind(sdrImage, image.tex);
			mat4.identity(mattrans);
			if (flipY === true)
				mat4.scale(mattrans, mattrans, [1.0, -1.0, 1.0]);
			imagePos[0] = PixelAlignX(imagePos[0]);
			mat4.translate(mattrans, mattrans, [imagePos[0], PixelAlignY(imagePos[1]), 0.0]);
			mat4.scale(mattrans, mattrans, scale);
			mat4.translate(mattrans, mattrans, image.imageAnchor); // Move anchor to imageAnchor
			sdrImage.matWorldViewProj(mattrans);
			meshQuad.draw();
			
			if (options['labelThumbnails'])
			{
				// Draw thumbnail label below thumbnail
				mat4.identity(mattrans);
				if (flipY === true)
					mat4.scale(mattrans, mattrans, [1.0, -1.0, 1.0]);
				imagePos[0] += image.imageAnchor[0] * scale[0]; // Move stripe position depending on image anchor
				imagePos[1] += image.imageAnchor[1] * scale[1]; // Move stripe position depending on image anchor
				
				mat4.translate(mattrans, mattrans, [imagePos[0], PixelAlignY(imagePos[1]), 0.0]);
				scale[1] = 2 * LABEL_HEIGHT / gl.height;
				scale[1] = PixelAlignY(scale[1]);
				//scale[0] += 2 / gl.width; // Widen by 1 pixel
				mat4.scale(mattrans, mattrans, scale);
				mat4.translate(mattrans, mattrans, [-0.0, -1.0, 0.0]); // Move anchor to top of stripe
				sdrLine.matWorldViewProj(mattrans);
				
				sdrLine.color.apply(sdrLine, image.highlighted ? [1, 1, 0, 1] : (image.labelColor ? image.labelColor : defaultImageLabelColor));
				meshQuad.bind(sdrLine, null);
				meshQuad.draw();
				
				sdrLine.color.apply(sdrLine, image.borderColor ? image.borderColor : defaultImageBorderColor);
				meshLineQuad.bind(sdrLine, null);
				meshLineQuad.draw();
				
				imagePos[0] += 1.0 * scale[0] - LABEL_TEXT_PADDING * 2 / gl.width; // Right-align label (right-padding = 4)
				imagePos[1] -= LABEL_TEXT_PADDING * 2 / gl.height; // Right-align label (top-padding = 5)
				imagePos[1] = PixelAlignY(imagePos[1]);
				gl.drawText(label++, gl.width * (1 + imagePos[0]) / 2, gl.height * (1 - imagePos[1]) / 2, 'topright');
			}
		});
		
		//gl.enable(gl.SCISSOR_TEST);
	}
	
	var options = {}, defaultImageBorderWidth = 1, defaultImageBorderColor = gl.foreColor, defaultImageLineColor = gl.foreColor, defaultImageLabelColor = gl.backColor;
	this.setDataset = function(dataset, options) {}
	this.onInputChanged = function(activeInputs, animatedInputs, options) {}
	this.onOptionsChanged = function(_options)
	{
		options = _options;
		defaultImageBorderWidth = options['thumbnailBorderWidth'];
		defaultImageBorderColor = options['thumbnailBorderColor'] ? new Float32Array(parseColor(options['thumbnailBorderColor'])).map(c => c / 255.0) : gl.foreColor;
		defaultImageLineColor = options['thumbnailLineColor'] ? new Float32Array(parseColor(options['thumbnailLineColor'])).map(c => c / 255.0) : gl.foreColor;
		defaultImageLabelColor = options['thumbnailLabelColor'] ? new Float32Array(parseColor(options['thumbnailLabelColor'])).map(c => c / 255.0) : gl.backColor;
	}
	this.onPlotBoundsChanged = function(plotBounds) {}
	
	/**
	 * @param  {string} imageFilename
	 * @param  {number} refIndex
	 * @param  {Array<number>} refPos
	 * @param  {Array<number>=} imagePos
	 * @param  {Array<number>=} imageSize
	 * @param  {string=} imageAnchor (default: 'middlecenter')
	 */
	this.showImage = function(imageFilename, refIndex, refPos, imagePos, imageSize, imageAnchor)
	{
		// Convert imageAnchor from string to vec3
		var imageAnchorVector;
		switch(imageAnchor)
		{
		case 'topleft':			imageAnchorVector = [-0.0, -1.0, 0.0]; break;
		case 'topcenter':		imageAnchorVector = [-0.5, -1.0, 0.0]; break;
		case 'topright':		imageAnchorVector = [-1.0, -1.0, 0.0]; break;
		case 'middleleft':		imageAnchorVector = [-0.0, -0.5, 0.0]; break;
		default:				imageAnchorVector = [-0.5, -0.5, 0.0]; break;
		case 'middleright':		imageAnchorVector = [-1.0, -0.5, 0.0]; break;
		case 'bottomleft':		imageAnchorVector = [-0.0, -0.0, 0.0]; break;
		case 'bottomcenter':	imageAnchorVector = [-0.5, -0.0, 0.0]; break;
		case 'bottomright':		imageAnchorVector = [-1.0, -0.0, 0.0]; break;
		}
		
		var newImage = new Thumbnail(globalView);
		newImage.tex = LoadTexture(gl, imageFilename, function() { globalView.invalidate(); });
		newImage.imagePos = imagePos;
		newImage.refIndex = refIndex;
		newImage.refPos = refPos;
		newImage.imageSize = imageSize;
		newImage.imageAnchor = imageAnchorVector;
		newImage.borderColor = null;
		images.push(newImage);
	}
	this.clearImages = function()
	{
		images = [];
	}
	/**
	 * @return {Array<Thumbnail>}
	 */
	this.getImages = function()
	{
		return images;
	}
	
	this.resolveIntersections = function(tf)
	{
		var a = vec2.create(), b = vec2.create(), c = vec2.create(), d = vec2.create();
		for (var i = 1; i < images.length; ++i)
			if (images[i].imagePos)
			{
				tf.transformPos(a, images[i].imagePos);
				tf.transformPos(b, images[i].refPos);
				for (var j = 0; j < i; ++j)
					if (images[j].imagePos)
					{
						tf.transformPos(c, images[j].imagePos);
						tf.transformPos(d, images[j].refPos);
						
						if (vec2.sqrDist(a, b) + vec2.sqrDist(c, d) > vec2.sqrDist(a, d) + vec2.sqrDist(c, b) && !linesIntersect(a, d, c, b))
						{
							//console.log("exchange {0} - {1}".format(i, j));
							var tmp = images[j].imagePos;
							images[j].imagePos = images[i].imagePos;
							images[i].imagePos = tmp;
							i = j = 0; break; //EDIT: How neccessary is this?
						}
					}
			}
		for (var i = 1; i < images.length; ++i)
			if (images[i].imagePos)
			{
				tf.transformPos(a, images[i].imagePos);
				tf.transformPos(b, images[i].refPos);
				for (var j = 0; j < i; ++j)
					if (images[j].imagePos)
					{
						tf.transformPos(c, images[j].imagePos);
						tf.transformPos(d, images[j].refPos);
						
						if (linesIntersect(a, b, c, d))
						{
							//console.log("intersection {0} - {1}".format(i, j));
							var tmp = images[j].imagePos;
							images[j].imagePos = images[i].imagePos;
							images[i].imagePos = tmp;
							i = j = 0; break; //EDIT: How neccessary is this?
						}
					}
			}
	}
	
	this.imageFromPoint = function(tf, p)
	{
		var imagePos = vec2.create(), refPos = vec2.create(), imageSize = vec2.create();
		
		var selectedImage = null;
		images.forEach(function(image) {
			if (!image.imagePos)
				return;
			
			tf.transformPos(imagePos, image.imagePos);
			
			tf.transformNml2(imageSize, image.imageSize);
			var w = image.tex.image.width, h = image.tex.image.height;
			var size;
			if (Math.max(imageSize[0], imageSize[0] * h / w, 1.0) < Math.max(imageSize[1] * w / h, imageSize[1]))
				size = [Math.floor(imageSize[0]) * 2 / gl.width, Math.floor(imageSize[0] * h / w) * 2 / gl.height, 1];
			else
				size = [Math.floor(imageSize[1] * w / h) * 2 / gl.width, Math.floor(imageSize[1]) * 2 / gl.height, 1];
			var imageBounds = [
				imagePos[0] + (image.imageAnchor[0]) * size[0],
				imagePos[0] + (image.imageAnchor[0] + 1.0) * size[0],
				imagePos[1] + (image.imageAnchor[1]) * size[1],
				imagePos[1] + (image.imageAnchor[1] + 1.0) * size[1]]
			
			if (options['labelThumbnails'])
				imageBounds[2] -= LABEL_HEIGHT * 2 / gl.height;
			
			if (p[0] >= imageBounds[0] && p[0] <= imageBounds[1] &&
				p[1] >= imageBounds[2] && p[1] <= imageBounds[3])
			{
				selectedImage = image;
				return;
			}
		});
		
		return selectedImage;
	}
}