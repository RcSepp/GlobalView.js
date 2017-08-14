/**
 * A viewer that renders point density to the global view.
 * @constructor
 * @package
 * @implements {Viewer}
 * @param {Object} gl // {WebGLRenderingContext}
 * @param {Object} globalView // {GlobalView}
 */
function DensityViewer(gl, globalView)
{
	var sdrDensityMap = new Shader(gl, Shaders.vsTextured2, Shaders.fsViewDensityMap);
	sdrDensityMap.matWorldViewProj = sdrDensityMap.u4x4f("matWorldViewProj");
	sdrDensityMap.matTexCoordTransform = sdrDensityMap.u2x2f("matTexCoordTransform");
	sdrDensityMap.scale = sdrDensityMap.u1f("scale");
	sdrDensityMap.color = sdrDensityMap.u3f("color");
	var colormap = LoadTexture(gl, "cmDensityMap.png", function() { globalView.invalidate(); });
	
	var sdrClusterMap = new Shader(gl, Shaders.vsTextured2, Shaders.fsTextured);
	sdrClusterMap.matWorldViewProj = sdrClusterMap.u4x4f("matWorldViewProj");
	sdrClusterMap.matTexCoordTransform = sdrClusterMap.u2x2f("matTexCoordTransform");
	
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
	
	var dataset = null;
	
	var clusterMapOptions = new ClusterMapOptions();
	this.setClusterMapThreshold = function(threshold) {
		if (this.showDensityMap && clusterMapOptions.threshold !== threshold)
		{
			clusterMapOptions.threshold = threshold;
			dataset.requestClusterMap(globalView.getActiveColumn(0), globalView.getActiveColumn(1), clusterMapOptions, function() { globalView.invalidate(); }); // Request clusterMap and redraw once it's computed
		}
		else
			clusterMapOptions.threshold = threshold;
	};
	this.getClusterMapThreshold = () => clusterMapOptions.threshold;
	
	this.showDensityMap = false;
	this.showClusterMap = false;
	this.render = function(flipY, tf, d0, d1)
	{
		var pos = vec2.create();
		
		if (this.showClusterMap)
		{
			if (dataset && dataset.isClusterMapReady(d0, d1)) // If clusterMap is ready
			{
				var clusterMap = dataset.requestClusterMap(d0, d1, clusterMapOptions); // Retrieve clusterMap synchronously (since we already know it's ready)
				if (clusterMap.width === 0 || clusterMap.height === 0)
						return;
				
				// Create texture if it wasn't already created
				var texture = this.showDensityMap ? clusterMap.dtex : clusterMap.tex;
				if (!texture)
				{
					var densityMap = this.showDensityMap ? dataset.requestDensityMap(d0, d1, undefined, undefined) : null; // Retrieve densityMap synchronously (since we already know it's ready)
					var rgba = new Uint8Array(4 * clusterMap.data.length);
					for (var i = 0; i < clusterMap.data.length; ++i)
					{
						var c = clusterMap.data[i];
						
						if (c === 0)
						{
							rgba[4 * i + 0] = 0;
							rgba[4 * i + 1] = 0;
							rgba[4 * i + 2] = 0;
							rgba[4 * i + 3] = 0;
						}
						else
						{
							// Use random RGB color (deprecated)
							/*var clr = [Math.sin(++c) * 10000, Math.sin(++c) * 10000, Math.sin(++c) * 10000];
							clr[0] -= Math.floor(clr[0]);
							clr[1] -= Math.floor(clr[1]);
							clr[2] -= Math.floor(clr[2]);*/
							
							// Use evenly spaced hues
							--c; // --c ... ID to index
							var d = densityMap ? (densityMap.data[i] - clusterMap.minDensities[c]) / (clusterMap.densities[c] - clusterMap.minDensities[c]) : 0.75;
							if (d < 0.0) d = 0.0;
							c = (c + 0.5) / clusterMap.n; // +0.5 ... Use off-hues
							if (c > 1) c -= 1;
							
							var clr = [c, 0.5, 1]; // 0.5 ... Use 50% saturated colors
							clr = hsv2rgb(clr);
							
							rgba[4 * i + 0] = Math.floor(clr[0] * 255);
							rgba[4 * i + 1] = Math.floor(clr[1] * 255);
							rgba[4 * i + 2] = Math.floor(clr[2] * 255);
							rgba[4 * i + 3] = Math.floor(d * 255);
						}
					}
					//download("clustermap.png", imageUrlFromBytes(rgba, clusterMap.width, clusterMap.height));
					texture = LoadTextureFromByteArray(gl, rgba, clusterMap.width, clusterMap.height);
					if (this.showDensityMap)
						clusterMap.dtex = texture;
					else
						clusterMap.tex = texture;
				}
				
				sdrClusterMap.bind();
				meshQuad.bind(sdrClusterMap, texture);
				
				var mattrans = mat4.create();
				if (flipY === true)
					mat4.scale(mattrans, mattrans, [1.0, -1.0, 1.0]);
				tf.datasetCoordToDeviceCoord(pos, d0 > d1 ?
					[clusterMap.invTransformY(0), clusterMap.invTransformX(0)] :
					[clusterMap.invTransformX(0), clusterMap.invTransformY(0)]
				);
				mat4.translate(mattrans, mattrans, [pos[0], pos[1], 0.0]);
				tf.datasetDistToDeviceDist(pos, d0 > d1 ?
					[clusterMap.height / clusterMap.transform[2], clusterMap.width / clusterMap.transform[0]] :
					[clusterMap.width / clusterMap.transform[0], clusterMap.height / clusterMap.transform[2]]
				);
				mat4.scale(mattrans, mattrans, [pos[0], pos[1], 1.0]);
				sdrClusterMap.matWorldViewProj(mattrans);
				
				sdrClusterMap.matTexCoordTransform(new Float32Array(d0 > d1 ? [0, 1, 1, 0] : [1, 0, 0, 1]));
				meshQuad.draw();
			}
			else // If clusterMap isn't ready yet
				dataset.requestClusterMap(d0, d1, clusterMapOptions, function() { globalView.invalidate(); }); // Request clusterMap and redraw once it's computed
		}
		else if (this.showDensityMap)
		{
			if (dataset && dataset.isDensityMapReady(d0, d1)) // If densityMap is ready
			{
				var densityMap = /** @type {DensityMap} */(dataset.requestDensityMap(d0, d1, undefined, undefined)); // Retrieve densityMap synchronously (since we already know it's ready)
				if (densityMap.width === 0 || densityMap.height === 0)
					return;
				//download("densityMap.png", imageUrlFromBytes(F32toI24flipY(densityMap.data, [densityMap.minimum, densityMap.maximum], densityMap.width, densityMap.height), densityMap.width, densityMap.height));
				
				// Create texture if it wasn't already created
				if (!densityMap.texture)
					densityMap.texture = LoadTextureFromFloatArray(gl, densityMap.data, densityMap.width, densityMap.height);
				
				sdrDensityMap.bind();
				meshQuad.bind(sdrDensityMap, [densityMap.texture, /*colormap*/]);
				
				var mattrans = mat4.create();
				if (flipY === true)
					mat4.scale(mattrans, mattrans, [1.0, -1.0, 1.0]);
				tf.datasetCoordToDeviceCoord(pos, d0 > d1 ?
					[densityMap.invTransformY(0), densityMap.invTransformX(0)] :
					[densityMap.invTransformX(0), densityMap.invTransformY(0)]
				);
				mat4.translate(mattrans, mattrans, [pos[0], pos[1], 0.0]);
				tf.datasetDistToDeviceDist(pos, d0 > d1 ?
					[densityMap.height / densityMap.transform[2], densityMap.width / densityMap.transform[0]] :
					[densityMap.width / densityMap.transform[0], densityMap.height / densityMap.transform[2]]
				);
				mat4.scale(mattrans, mattrans, [pos[0], pos[1], 1.0]);
				sdrDensityMap.matWorldViewProj(mattrans);
				
				sdrDensityMap.matTexCoordTransform(new Float32Array(d0 > d1 ? [0, 1, 1, 0] : [1, 0, 0, 1]));
				sdrDensityMap.scale(1 / densityMap.maximum);
				//sdrDensityMap.scale(0.5);
				sdrDensityMap.color(gl.foreColor[0], gl.foreColor[1], gl.foreColor[2]);
				meshQuad.draw();
			}
			else // If densityMap isn't ready yet
				dataset.requestDensityMap(d0, d1, undefined, undefined, function() { globalView.invalidate(); }); // Request densityMap and redraw once it's computed
		}
	}
	
	this.setDataset = function(_dataset, options) { dataset = _dataset; }
	this.onInputChanged = function(activeInputs, animatedInputs, options) {}
	this.onOptionsChanged = function(options) {}
	this.onPlotBoundsChanged = function(plotBounds) {}
	
	this.updateImages = function(images, d0, d1)
	{
		var densityMap = dataset.requestDensityMap(d0, d1, undefined, undefined);
		if (densityMap.texture === null || d0 === d1)
			return;
		
		var width = densityMap.width, height = densityMap.height, densityScale = densityMap.scale, densityOffset = -densityMap.offset;
		
		var xMin = 0, xMax = width;
		var yMin = 0, yMax = height;
		
		var bodies = images.map(function(image) {
			var x = densityMap.transformX(image.imagePos[d0]);
			var y = densityMap.transformY(image.imagePos[d1]);
			var rx = densityMap.transformX(image.refPos[d0]);
			var ry = densityMap.transformY(image.refPos[d1]);
			return {x: x, y: y, rx: rx, ry: ry, vx: 0, vy: 0, fx: 0, fy: 0};
		});
		
		/*var repellPoint = function(body, point_x, point_y, magnitude, magnitude2)
		{
			var dx = body.x - point_x, dy = body.y - point_y;
			var dist = Math.sqrt(dx*dx + dy*dy);
			var F = magnitude / (dist*dist*dist) + magnitude2 / dist;
			F = Math.max(-1e1, Math.min(1e1, F));
			body.fx += F * dx;
			body.fy += F * dy;
		}*/
		
		var repellPoint = function(body, point_x, point_y, minDist, minDistMagnitude, maxDist, maxDistMagnitude)
		{
			var dx = body.x - point_x, dy = body.y - point_y;
			var dist = Math.sqrt(dx*dx + dy*dy);
			
			if (dist < minDist)
			{
				dist -= minDist;
				var F = -minDistMagnitude * dist;
				//if (dx < 1e-4 && dy < 1e-4) dx += 1e-4;
				body.fx += F * dx;
				body.fy += F * dy;
			}
			else if (dist > maxDist)
			{
				dist -= maxDist;
				var F = -maxDistMagnitude * dist;
				body.fx += F * dx;
				body.fy += F * dy;
			}
		}
		
		for (var i = 0; i < bodies.length; ++i)
		{
			/*for (var j = 0; j < bodies.length; ++j)
			{
				if (i !== j)
				{
					repellPoint(bodies[i], bodies[j].x, bodies[j].y, 20.0, 1e-3, Number.MAX_VALUE, 0);
					repellPoint(bodies[i], bodies[j].rx, bodies[j].ry, 20.0, 1e-3, Number.MAX_VALUE, 0);
				}
			}
			repellPoint(bodies[i], bodies[i].rx, bodies[i].ry, 20.0, 1e-3, 20.0, 1e-4);*/
			
			var sample_x = Math.floor(bodies[i].x), sample_y = Math.floor(bodies[i].y);
			var density = densityMap[sample_x * width + sample_y];
			var bestDir = null, lowestDensity = density;
			[[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]].forEach(function(dir) {
				var x = sample_x + dir[0];
				var y = sample_y + dir[1];
				if (x >= xMin && x < xMax && y >= yMin && y < yMax)
				{
					var density = densityMap[y * width + x];
					if (density < lowestDensity)
					{
						lowestDensity = density;
						bestDir = dir;
					}
				}
			});
			if (bestDir !== null)
			{
				repellPoint(bodies[i], bodies[i].x + bestDir[0], bodies[i].y + bestDir[1], Number.MIN_VALUE, 0, 0.0, density);
				console.log(density);
			}
			
			/*for (var j = i + 1; j < bodies.length; ++j)
			{
				var dx = bodies[i].x - bodies[j].x, dy = bodies[i].y - bodies[j].y;
				var dist = Math.sqrt(dx*dx + dy*dy);
				var F = 1e2 / (dist*dist*dist);
				bodies[i].fx += F * dx;
				bodies[i].fy += F * dy;
				bodies[j].fx -= F * dx;
				bodies[j].fy -= F * dy;
			}
			
			for (var j = 0; j < bodies.length; ++j)
				if (i !== j)
				{
					var dx = bodies[i].x - bodies[j].rx, dy = bodies[i].y - bodies[j].ry;
					var dist = Math.sqrt(dx*dx + dy*dy);
					var F = 1e2 / (dist*dist*dist);
					bodies[i].fx += F * dx;
					bodies[i].fy += F * dy;
				}
			
			var dx = bodies[i].x - bodies[i].rx, dy = bodies[i].y - bodies[i].ry;
			var dist = Math.sqrt(dx*dx + dy*dy);
			var F = -1e2 / (dist*dist*dist);
			bodies[i].fx += F * dx;
			bodies[i].fy += F * dy;*/
		}
		
		for (var i = 0; i < bodies.length; ++i)
		{
			bodies[i].x += bodies[i].fx;
			bodies[i].y += bodies[i].fy;
			
			images[i].imagePos[d0] = densityMap.invTransformX(bodies[i].x);
			images[i].imagePos[d1] = densityMap.invTransformY(bodies[i].y);
		}
			
		
		/*images.forEach(function(image) {
			var p0 = Math.floor(densityMap.transformX(image.imagePos[d0]));
			var p1 = Math.floor(densityMap.transformY(image.imagePos[d1]));
			
			var bestDir = null, bestDensity = densityMap[p1 * width + p0];
			[[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]].forEach(function(dir) {
				var x = p0 + dir[0];
				var y = p1 + dir[1];
				if (x >= xMin && x < xMax && y >= yMin && y < yMax)
				{
					//var sqDensity = Math.pow(densityOffset + densityMap[y * width + x] * densityScale, 2);
					var density = densityMap[y * width + x];
					if (density < bestDensity)
					{
						bestDensity = density;
						bestDir = dir;
					}
				}
			});
			if (bestDir !== null)
			{
				p0 += bestDir[0];
				p1 += bestDir[1];
				
				image.imagePos[d0] = densityMap.invTransformX(p0);
				image.imagePos[d1] = densityMap.invTransformY(p1);
			}
		});*/
	}
}