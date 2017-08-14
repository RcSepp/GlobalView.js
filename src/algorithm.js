function addTransformFunctions(cls)
{
	cls.transformX = function(x) { return cls.transform[0] * x + cls.transform[1]; };
	cls.transformY = function(y) { return cls.transform[2] * y + cls.transform[3]; };
	cls.invTransformX = function(x) { return (x - cls.transform[1]) / cls.transform[0]; };
	cls.invTransformY = function(y) { return (y - cls.transform[3]) / cls.transform[2]; };
}

/**
 * @constructor
 * @package
 */
function DensityMap(obj)
{
	this.data = obj.data;
	this.width = obj.width;
	this.height = obj.height;
	this.minimum = obj.minimum;
	this.maximum = obj.maximum;
	this.scale = obj.scale;
	this.offset = obj.offset;
	this.transform = obj.transform;
	this.options = obj.options;
	this.transformX = function(x) { return this.transform[0] * x + this.transform[1]; };
	this.transformY = function(y) { return this.transform[2] * y + this.transform[3]; };
	this.invTransformX = function(x) { return (x - this.transform[1]) / this.transform[0]; };
	this.invTransformY = function(y) { return (y - this.transform[3]) / this.transform[2]; };
}

/**
 * @summary Options to the {@link algorithm#computeDensityMap|computeDensityMap()} function
 * @constructor
 * @export
 * @param {DensityMapOptions=} source If not null, creates a copy of source
 */
function DensityMapOptions(source)
{
	if (source)
	{
		// Copy constructor
		//this.targetWidth = source.targetWidth;
		//this.targetHeight = source.targetHeight;
		this['maxExpectedRuntime'] = source['maxExpectedRuntime'];
		this['cutoffIntensity'] = source['cutoffIntensity']
		this['gaussScale'] = source['gaussScale'];
		this['logScale'] = source['logScale'];
		this['inflateToFit'] = source['inflateToFit'];
		this['shrinkToFit'] = source['shrinkToFit'];
	}
	else
	{
		// Default constructor
		//this.targetWidth = this.targetHeight = 1024; // Initial density map size (affected by maxExpectedRuntime, inflateToFit and shrinkToFit)
		/**
		 * @alias maxExpectedRuntime
		 * @memberof DensityMapOptions
		 * @summary If the estimated runtime for computing the density map (in seconds) is higher than maxExpectedRuntime, the density map size is reduced
		 * @type {number}
		 * @default
		 */
		this['maxExpectedRuntime'] = 1.0;
		/**
		 * @alias cutoffIntensity
		 * @memberof DensityMapOptions
		 * @summary Densities below cutoffIntensity aren't computed
		 * @type {number}
		 * @default
		 */
		this['cutoffIntensity'] = 0.001;
		/**
		 * @alias gaussScale
		 * @memberof DensityMapOptions
		 * @summary Relative variance (variance normalized by density map size)
		 * @type {number}
		 * @default
		 */
		this['gaussScale'] = 1000;
		/**
		 * @alias logScale
		 * @memberof DensityMapOptions
		 * @summary When true, computes log-densities
		 * @type {boolean}
		 * @default
		 */
		this['logScale'] = true;
		/**
		 * @alias inflateToFit
		 * @memberof DensityMapOptions
		 * @summary When true, increases density map size to fit the full density map
		 * @type {boolean}
		 * @default
		 */
		this['inflateToFit'] = true;
		/**
		 * @alias shrinkToFit
		 * @memberof DensityMapOptions
		 * @summary When true, decreases density map size to the area of non-zero densities plus a zero-density border of 1 pixel thickness
		 * @type {boolean}
		 * @default
		 */
		this['shrinkToFit'] = true;
	}
}
DensityMapOptions.equals = (a, b) =>
	a['maxExpectedRuntime'] === b['maxExpectedRuntime'] &&
	a['cutoffIntensity'] === b['cutoffIntensity'] &&
	a['gaussScale'] === b['gaussScale'] &&
	a['logScale'] === b['logScale'] &&
	a['inflateToFit'] === b['inflateToFit'] &&
	a['shrinkToFit'] === b['shrinkToFit']
;

/**
 * @constructor
 * @package
 */
function ClusterMap(obj)
{
	this.data = obj.data;
	this.densities = obj.densities;
	this.minDensities = obj.minDensities;
	this.threshold = obj.threshold;
	this.n = obj.n;
	this.width = obj.width;
	this.height = obj.height;
	this.transform = obj.transform;
	this.transformX = function(x) { return this.transform[0] * x + this.transform[1]; };
	this.transformY = function(y) { return this.transform[2] * y + this.transform[3]; };
	this.invTransformX = function(x) { return (x - this.transform[1]) / this.transform[0]; };
	this.invTransformY = function(y) { return (y - this.transform[3]) / this.transform[2]; };
}

/**
 * @summary Options to the {@link algorithm#computeClusterMap_method3|computeClusterMap()} function
 * @constructor
 * @export
 * @param {ClusterMapOptions=} source If not null, creates a copy of source
 */
function ClusterMapOptions(source)
{
	if (source)
	{
		this.densityMap = source.densityMap;
		this['threshold'] = this.threshold = source.threshold;
	}
	else
	{
		this.densityMap = null;
		/**
		 * @alias threshold
		 * @memberof ClusterMapOptions
		 * @summary Densities below threshold * maximum-density are considered outliers
		 * @type {number}
		 * @default
		 */
		this['threshold'] = this.threshold = 0.1;
	}
}
ClusterMapOptions.equals = (a, b) =>
	DensityMapOptions.equals(a.densityMap.options, b.densityMap.options) &&
	a.threshold === b.threshold
;

/**
 * Compute a histogram of all points in the dataset over dimension d
 * @package
 * @param  {Dataset} dataset
 * @param  {number} d Index of the dataset dimension to use for binning
 * @param  {number} width The number of histogram bins
 * @return {Object} A 1D histogram
 */
function computeHistogram(dataset, d, width)
{
	var n = dataset.length;
	var v = dataset.dataVectors[d];
	var s = width / (v.maximum - v.minimum);
	var o = -v.minimum * s;
	var transform = [s, o, 1, 0];
	
	// Computed number of datapoints per histogram bin -> histogram, maximum
	var histogram = new Float32Array(width);
	var maximum = 1; // Start with 1, because as long as n > 0, there will be at least one bin with magnitude >= 1
	for (var i = 0; i < n; ++i)
	{
		var p = Math.floor(v.getValue(i) * s + o);
		if (++histogram[Math.min(width - 1, p)] > maximum)
			++maximum; // maximum can only grow by 1, so we know histogram[...] == maximum + 1
	}
	
	histogram = {
		data: histogram,
		maximum: maximum,
		width: width, height: 1,
		transform: transform,
	};
	return histogram;
}

/**
 * Compute a histogram of all points in the dataset over dimensions d0 and d1
 * @package
 * @param  {Dataset} dataset
 * @param  {number} d0 Index of the first dataset dimension to use for binning
 * @param  {number} d1 Index of the second dataset dimension to use for binning
 * @param  {number} width The number of histogram bins in the first dimension
 * @param  {number} height The number of histogram bins in the first second
 * @return {Object} A 2D histogram
 */
function computeHistogram2D(dataset, d0, d1, width, height)
{
	var n = dataset.length;
	var v0 = dataset.dataVectors[d0], v1 = dataset.dataVectors[d1];
	var s0 = width / (v0.maximum - v0.minimum);
	var o0 = -v0.minimum * s0;
	var s1 = height / (v1.maximum - v1.minimum);
	var o1 = -v1.minimum * s1;
	var transform = [s0, o0, s1, o1];
	
	// Computed number of datapoints per histogram bin -> histogram, maximum
	var histogram = new Float32Array(width * height);
	var maximum = 1; // Start with 1, because as long as n > 0, there will be at least one bin with magnitude >= 1
	for (var i = 0; i < n; ++i)
	{
		var p0 = Math.floor(v0.getValue(i) * s0 + o0);
		var p1 = Math.floor(v1.getValue(i) * s1 + o1);
		if (++histogram[Math.min(height - 1, p1) * width + Math.min(width - 1, p0)] > maximum)
			++maximum; // maximum can only grow by 1, so we know histogram[...] == maximum + 1
	}
	
	histogram = {
		data: histogram,
		maximum: maximum,
		width: width, height: height,
		transform: transform,
		/*transformX: x => transform[0] * x + transform[1],
		transformY: y => transform[2] * y + transform[3],
		invTransformX: x => (x - transform[1]) / transform[0],
		invTransformY: y => (y - transform[3]) / transform[2]*/
	};
	return histogram;
}
/**
 * This function can be computed by an asynchronous worker.
 * It inputs and outputs plain JavaScript objects, because data passed between the main thread and an asynchronous worker has to be primitive
 * (e.g. it cannot contain function objects).
 * @summary Compute a 2D density map from a 2D histogram computed by {@link computeHistogram2D}
 * @package
 * @param  {Object} histogram To create a histogram object from a 2D histogram, call `makeCloneable(histogram)`
 * @param  {DensityMapOptions} options
 * @return {Object} A density map object
 * 
 * To get a {@link DensityMap} from the output object, call `new DensityMap(output)`.
 */
function computeDensityMap(histogram, options)
{
	var _tiktok_start;
	var tik = function() { _tiktok_start = performance.now(); }
	var tok = function() { return (performance.now() - _tiktok_start) / 1000; }
	
	// Get required information from histogram
	var width = histogram.width, height = histogram.height, transform = histogram.transform.slice(), initialDensities = histogram.data;
	var minDensity, maxDensity = histogram.maximum;
	
	// Set parameters
	const cutoffIntensity = options['cutoffIntensity'];
	const gaussScale = options['gaussScale'];
	var normalizedGaussScale = -gaussScale / (width*height);
	const logScale = options['logScale'];
	const inflateToFit = options['inflateToFit'];
	var maxExtend = Math.max(width, height);
	
	// Compute a measure of expected runtime
	var expectedRuntime = 0;
	var newBounds_l = Number.MAX_VALUE, newBounds_r = Number.MIN_VALUE, newBounds_t = Number.MAX_VALUE, newBounds_b = Number.MIN_VALUE;
	tik();
	if (inflateToFit)
	{
		for (var y = 0; y < height; ++y)
			for (var x = 0; x < width; ++x)
				if (initialDensities[y * width + x] !== 0.0)
				{
					var r = Math.floor(Math.sqrt(Math.log(cutoffIntensity / initialDensities[y * width + x]) / normalizedGaussScale)) - 1;
					r = Math.max(1, Math.min(maxExtend, r));
					
					expectedRuntime += r*r * Math.PI;
					newBounds_l = Math.min(newBounds_l, x - r);
					newBounds_r = Math.max(newBounds_r, x + r);
					newBounds_t = Math.min(newBounds_t, y - r);
					newBounds_b = Math.max(newBounds_b, y + r);
				}
	}
	else
	{
		for (var y = 0; y < height; ++y)
			for (var x = 0; x < width; ++x)
				if (initialDensities[y * width + x] !== 0.0)
				{
					var r = Math.floor(Math.sqrt(Math.log(cutoffIntensity / initialDensities[y * width + x]) / normalizedGaussScale)) - 1;
					r = Math.max(1, Math.min(maxExtend, r));
					
					var trimX = Math.min(r, Math.min(x, width - x)) / r;
					var trimY = Math.min(r, Math.min(y, height - y)) / r;
					trimX = 0.5 + 0.5 * trimX*trimX;
					trimY = 0.5 + 0.5 * trimY*trimY;
					expectedRuntime += r*r * Math.PI * trimX * trimY;
				}
	}
	var t1 = tok(); // t1 = Runtime of runtime estimation
	
	expectedRuntime = inflateToFit ? 0.011447356659209 * Math.pow(expectedRuntime, 0.508796587646921) : 0.017471566555264 * Math.pow(expectedRuntime, 0.466050299746328);
	expectedRuntime *= t1;
	//console.log("Expected runtime: " + expectedRuntime + "s");
	
	while (expectedRuntime > options['maxExpectedRuntime'] && width >= 2 && height >= 2)
	{
		// Downscale density map size by a factor of 2
		var downScaledWidth = width >> 1, downScaledHeight = height >> 1;
		//console.log("Expected runtime too high. Down-scaling to: " + downScaledWidth + "x" + downScaledHeight);
		
		transform[0] *= downScaledWidth / width;
		transform[1] *= downScaledWidth / width;
		transform[2] *= downScaledHeight / height;
		transform[3] *= downScaledHeight / height;
		
		// Recompute number of datapoints per density map pixel
		var downScaledInitialDensities = new Float32Array(downScaledWidth * downScaledHeight);
		maxDensity = 1;
		for (var y = 0; y < downScaledHeight; ++y)
			for (var x = 0; x < downScaledWidth; ++x)
				maxDensity = Math.max(maxDensity, downScaledInitialDensities[y * downScaledWidth + x] =
					initialDensities[(2 * y + 0) * width + (2 * x + 0)] +
					initialDensities[(2 * y + 0) * width + (2 * x + 1)] +
					initialDensities[(2 * y + 1) * width + (2 * x + 0)] +
					initialDensities[(2 * y + 1) * width + (2 * x + 1)]);
		initialDensities = downScaledInitialDensities;
		width = downScaledWidth;
		height = downScaledHeight;
		maxExtend = Math.max(width, height);
		normalizedGaussScale = -gaussScale / (width*height);
		
		// Recompute expected runtime
		expectedRuntime = 0;
		newBounds_l = Number.MAX_VALUE; newBounds_r = Number.MIN_VALUE; newBounds_t = Number.MAX_VALUE; newBounds_b = Number.MIN_VALUE;
		tik();
		if (inflateToFit)
		{
			for (var y = 0; y < height; ++y)
				for (var x = 0; x < width; ++x)
					if (initialDensities[y * width + x] !== 0.0)
					{
						var r = Math.floor(Math.sqrt(Math.log(cutoffIntensity / initialDensities[y * width + x]) / normalizedGaussScale)) - 1;
						r = Math.max(1, Math.min(maxExtend, r));
						
						expectedRuntime += r*r * Math.PI;
						newBounds_l = Math.min(newBounds_l, x - r);
						newBounds_r = Math.max(newBounds_r, x + r);
						newBounds_t = Math.min(newBounds_t, y - r);
						newBounds_b = Math.max(newBounds_b, y + r);
					}
		}
		else
		{
			for (var y = 0; y < height; ++y)
				for (var x = 0; x < width; ++x)
					if (initialDensities[y * width + x] !== 0.0)
					{
						var r = Math.floor(Math.sqrt(Math.log(cutoffIntensity / initialDensities[y * width + x]) / normalizedGaussScale)) - 1;
						r = Math.max(1, Math.min(maxExtend, r));
						
						var trimX = Math.min(r, Math.min(x, width - x)) / r;
						var trimY = Math.min(r, Math.min(y, height - y)) / r;
						trimX = 0.5 + 0.5 * trimX*trimX;
						trimY = 0.5 + 0.5 * trimY*trimY;
						expectedRuntime += r*r * Math.PI * trimX * trimY;
					}
		}
		t1 = tok(); // t1 = Runtime of runtime estimation
		
		expectedRuntime = inflateToFit ? 0.011447356659209 * Math.pow(expectedRuntime, 0.508796587646921) : 0.017471566555264 * Math.pow(expectedRuntime, 0.466050299746328);
		expectedRuntime *= t1;
		//console.log("Expected runtime: " + expectedRuntime + "s");
	}
	//console.log("Expected runtime acceptable");
	
	var densitMapWidth, densitMapHeight;
	if (inflateToFit)
	{
		if (options['shrinkToFit'])
		{
			// Inflate output size to keep a 1-pixel-wide frame of zeros around the density map
			// This allows algorithms that march through densities to stay within density map bounds without explictly checking
			--newBounds_l;
			++newBounds_r;
			--newBounds_t;
			++newBounds_b;
		}

		densitMapWidth = newBounds_r - newBounds_l + 1;
		densitMapHeight = newBounds_b - newBounds_t + 1;

		transform[1] -= newBounds_l;
		transform[3] -= newBounds_t;
	}
	else
	{
		densitMapWidth = width;
		densitMapHeight = height;
	}
	var densities = new Float32Array(densitMapWidth * densitMapHeight);
	
	/*// Precompute extends of gaussians up to maxDensity based on cutoffIntensity and normalizedGaussScale -> ext[]
	var ext = new Float32Array(maxDensity);
	for (var i = 0; i < maxDensity; ++i)
	{
		ext[i] = Math.floor(Math.sqrt(Math.log(cutoffIntensity / (i + 1)) / normalizedGaussScale));
		ext[i] = Math.min(ext[i], maxExtend); // Set upper bound for ext[i]: Precomputed map of gaussian scales shouldn't be larger than densityMap (size*size)
	}*/
	
	// Compute extend of the largest gaussian based on cutoffIntensity and normalizedGaussScale -> maxExtend
	//console.log(maxExtend);
	maxExtend = Math.min(Math.floor(Math.sqrt(Math.log(cutoffIntensity / maxDensity) / normalizedGaussScale)), maxExtend); // Set upper bound for maxExtend: Precomputed map of gaussian scales shouldn't be larger than densityMap (size*size)
	//var maxExtend = ext[maxDensity - 1]; // Get precomputed maxExtend
	//console.log(maxExtend);
	
	// Precompute 2D map array of gaussian scales within maxExtend*maxExtend -> gauss[]
	var gauss = new Float32Array(maxExtend * maxExtend);
	for (var y = 0; y < maxExtend; ++y)
		for (var x = 0; x < maxExtend; ++x)
			gauss[y * maxExtend + x] = Math.exp(normalizedGaussScale * (x*x + y*y));
	
	// Draw gaussians -> densities[]
	tik();
	if (inflateToFit)
	{
		for (var y = 0; y < height; ++y)
			for (var x = 0; x < width; ++x)
				if (initialDensities[y * width + x] !== 0.0)
				{
					var initialDensities_xy = initialDensities[y * width + x];
					
					// Compute extend of gaussian with value initialDensities_xy -> yExtend
					var yExtend = Math.sqrt(Math.log(cutoffIntensity / initialDensities_xy) / normalizedGaussScale);
					yExtend = Math.min(Math.floor(yExtend), maxExtend) - 1;
					if (yExtend <= 0)
					{
						densities[y * densitMapWidth + x] += initialDensities_xy;
						continue;
					}
					//var yExtend = ext[initialDensities_xy - 1] - 1; // Get precomputed yExtend
					var sqYExtend = yExtend*yExtend;
					
					for (var yy = y - yExtend, yend = y + yExtend; yy <= yend; ++yy)
					{
						// Compute horizontal extend of gaussian at height yy - y => xExtend
						var xExtend = Math.floor(Math.sqrt(sqYExtend - (yy - y)*(yy - y)));
						
						for (var xx = x - xExtend, xend = x + xExtend; xx <= xend; ++xx)
							densities[(yy - newBounds_t) * densitMapWidth + xx - newBounds_l] += initialDensities_xy * gauss[Math.abs(y - yy) * maxExtend + Math.abs(x - xx)];
					}
				}
	}
	else
	{
		for (var y = 0; y < height; ++y)
			for (var x = 0; x < width; ++x)
				if (initialDensities[y * width + x] !== 0.0)
				{
					var initialDensities_xy = initialDensities[y * width + x];
					
					// Compute extend of gaussian with value initialDensities_xy -> yExtend
					var yExtend = Math.sqrt(Math.log(cutoffIntensity / initialDensities_xy) / normalizedGaussScale);
					yExtend = Math.min(Math.floor(yExtend), maxExtend) - 1;
					if (yExtend <= 0)
					{
						densities[y * densitMapWidth + x] += initialDensities_xy;
						continue;
					}
					//var yExtend = ext[initialDensities_xy - 1] - 1; // Get precomputed yExtend
					var sqYExtend = yExtend*yExtend;
					
					for (var yy = Math.max(0, y - yExtend), yend = Math.min(densitMapHeight - 1, y + yExtend); yy <= yend; ++yy)
					{
						// Compute horizontal extend of gaussian at height yy - y => xExtend
						var xExtend = Math.floor(Math.sqrt(sqYExtend - (yy - y)*(yy - y)));
						
						for (var xx = Math.max(0, x - xExtend), xend = Math.min(densitMapWidth - 1, x + xExtend); xx <= xend; ++xx)
							densities[yy * densitMapWidth + xx] += initialDensities_xy * gauss[Math.abs(y - yy) * maxExtend + Math.abs(x - xx)];
					}
				}
	}
	var t2 = tok(); // t2 = Measured runtime
	//console.log("Actual runtime: " + t2 + "s");
	
	// Free precomputed gaussian scales
	gauss = null;
	
	// Compute overall bounds of density map
	minDensity = Number.MAX_VALUE; maxDensity = Number.MIN_VALUE;
	newBounds_l = densitMapWidth - 1; newBounds_r = 0; newBounds_t = densitMapHeight - 1; newBounds_b = 0;
	for (var y = 0, i = 0; y < densitMapHeight; ++y)
		for (var x = 0; x < densitMapWidth; ++x, ++i)
		{
			var density = logScale ? Math.log(densities[i]) : densities[i];
			if (density > 0.0)
			{
				densities[i] = density;
				minDensity = Math.min(minDensity, density);
				maxDensity = Math.max(maxDensity, density);
				newBounds_l = Math.min(newBounds_l, x);
				newBounds_r = Math.max(newBounds_r, x);
				newBounds_t = Math.min(newBounds_t, y);
				newBounds_b = Math.max(newBounds_b, y);
			}
			else
				densities[i] = 0.0;
		}
	
	if (options['shrinkToFit'])
	{
		if (inflateToFit)
		{
			// Inflate output size to keep a 1-pixel-wide frame of zeros around the density map
			// This allows algorithms that march through densities to stay within density map bounds without explictly checking
			--newBounds_l;
			++newBounds_r;
			--newBounds_t;
			++newBounds_b;
		}

		transform[1] -= newBounds_l;
		transform[3] -= newBounds_t;

		// Shrink density map to exclude non-empty area
		var resizedDensitMapWidth = Math.max(0, newBounds_r - newBounds_l + 1), resizedDensitMapHeight = Math.max(0, newBounds_b - newBounds_t + 1), resizedDensityMapLength = resizedDensitMapWidth * resizedDensitMapHeight;
		var resizedDensities = new Float32Array(resizedDensityMapLength);
		if (resizedDensities.length !== 0)
			for (var y = 0, i = 0, j = newBounds_l + newBounds_t * densitMapWidth; y < resizedDensitMapHeight; ++y, j += densitMapWidth - resizedDensitMapWidth)
				for (var x = 0; x < resizedDensitMapWidth; ++x, ++i, ++j)
				resizedDensities[i] = densities[j];
		densities = resizedDensities;
		densitMapWidth = resizedDensitMapWidth;
		densitMapHeight = resizedDensitMapHeight;
	}
	
	var densityMap = {
		data: densities,
		minimum: minDensity,
		maximum: maxDensity,
		scale: 1.0 / (maxDensity - minDensity),
		offset: -minDensity  / (maxDensity - minDensity),
		width: densitMapWidth, height: densitMapHeight,
		transform: transform,
		options: options,
		/*transformX: x => transform[0] * x + transform[1],
		transformY: y => transform[2] * y + transform[3],
		invTransformX: x => (x - transform[1]) / transform[0],
		invTransformY: y => (y - transform[3]) / transform[2]*/
	}
	return densityMap;
}
/**
 * @summary Create a triangular matrix (d0 < d1) of density maps for each combination of dimensions
 * @package
 * @param  {Dataset} dataset
 * @param  {number} width
 * @param  {number} height
 * @param  {DensityMapOptions} options
 * @return {Array<Array<DensityMap>>} 2D array of density maps
 * 
 * The density map of dimensions d0 and d1 can be accessed using `densityMapArray[d0][d1 - d0 - 1]`.
 */
function computeDensityMapND(dataset, width, height, options)
{
	var nc = dataset.numColumns;
	var densityMap = new Array(nc - 1);
	for (var d0 = 0; d0 < nc; ++d0)
	{
		densityMap[d0] = new Array(nc - d0 - 1);
		for (var d1 = d0 + 1; d1 < nc; ++d1)
			densityMap[d0][d1 - d0 - 1] = new DensityMap(computeDensityMap(computeHistogram2D(dataset, d0, d1, width, height), options));
	}
	return densityMap;
}

/*function computePointDensityIndex(dataset, d0, d1, densityMap)
{
	var data = dataset.fdata;
	var n = dataset.length;
	var nc = dataset.numColumns;
	var s0 = 1 / (dataset.columns[d0].maximum - dataset.columns[d0].minimum);
	var o0 = -dataset.columns[d0].minimum * s0;
	var s1 = 1 / (dataset.columns[d1].maximum - dataset.columns[d1].minimum);
	var o1 = -dataset.columns[d1].minimum * s1;
	var densities = densityMap.data, size = densityMap.size;
	
	// Compute density at each datapoint
	var pointDensities = new Float32Array(n);
	for (var i = 0; i < n; ++i)
	{
		var p0 = data[i * nc + d0] * s0 + o0;
		var p1 = data[i * nc + d1] * s1 + o1;
		
		var idx = Math.min(Math.floor(p1 * size), size - 1) * size + Math.min(Math.floor(p0 * size), size - 1);
		pointDensities[i] = densities[idx];
	}
	
	// Create indices sorted by density
	var indices = Array.from(pointDensities.keys());
	indices.sort(function(idxA, idxB) { return pointDensities[idxA] - pointDensities[idxB]; });
	
	return indices;
}*/

/**
 * This function computes point densities for each point in the dataset.
 * It returns the first `Math.floor(k * (1 - targetRatio))` lowest density points (outliers) and
 * the first `Math.floor(k * targetRatio)` highest density points (cluster centers),
 * given that all returned points are at least 'dist' apart.
 * @summary Choose k characteristic points from the given dataset based on the given density map
 * @package
 * @param  {Dataset} dataset
 * @param  {number} d0 The first input dimension (This value must match the one used to compute the histogram)
 * @param  {number} d1 The second input dimension (This value must match the one used to compute the histogram)
 * @param  {DensityMap} densityMap
 * @param  {number} k Maximum number of points to return
 * @param  {number} dist Minimum Euclidean distance between returned points in normalized space (in percentage of overall data space bounds)
 * @param  {number} targetRatio A ratio between 0 (only outliers) and 1 (only cluster centers)
 * @return {Array<number>} An array of up to k point indices of characteristic points
 */
function findRepresentativePoints(dataset, d0, d1, densityMap, k, dist, targetRatio)
{
	if (k <= 0)
		return []; // No representative points
	
	var n = dataset.length;
	var densities = densityMap.data, width = densityMap.width, height = densityMap.height;
	var v0 = dataset.dataVectors[d0], v1 = dataset.dataVectors[d1];
	
	// Compute density at each datapoint
	var pointDensities = new Float32Array(n);
	for (var i = 0; i < n; ++i)
	{
		var p0 = Math.floor(densityMap.transformX(v0.getValue(i)));
		var p1 = Math.floor(densityMap.transformY(v1.getValue(i)));
		
		pointDensities[i] = densities[Math.min(height - 1, p1) * width + Math.min(width - 1, p0)];
	}
	
	// Create indices sorted by density
	var indices = Array.from(pointDensities.keys());
	indices.sort(function(idxA, idxB) { return pointDensities[idxA] - pointDensities[idxB]; });
	
	/*// If k >= n, all points are representative
	if (k >= n)
		return indices;*/
	
	// Find k representative points
	var sqDist = dist * dist;
	var d_high = indices.length - 1, d_low = 0;
	var pointIsHigh, numHighRepresentativePoints = 0, ratio = 0.5; // Initial ratio is "fifty-fifty"
	var next = function() {
		if (ratio < targetRatio || (ratio === targetRatio && targetRatio >= 0.5)) // If ratio is too low or ratio is perfect and targetRatio is high
		{
			pointIsHigh = 1;
			return d_high--; // Retrieve next high density data point
		}
		else // If ratio is too high or ratio is perfect and targetRatioChoose k characteristic points from the given dataset based on the given density map is low
		{
			pointIsHigh = 0;
			return d_low++; // Retrieve next low density data point
		}
	}
	var representativePoints = [ indices[next()] ]; // Set first represenatative point
	numHighRepresentativePoints += pointIsHigh;
	ratio = numHighRepresentativePoints / representativePoints.length;
	while (d_high >= d_low && representativePoints.length < k)
	{
		var di = indices[next()];
		var di_0 = densityMap.transformX(v0.getValue(di)) / densityMap.width;
		var di_1 = densityMap.transformY(v1.getValue(di)) / densityMap.height;
		
		if (representativePoints.every(function(p) {
				var p0 = densityMap.transformX(v0.getValue(p)) / densityMap.width;
				var p1 = densityMap.transformY(v1.getValue(p)) / densityMap.height;
				return Math.pow(p0 - di_0, 2) + Math.pow(p1 - di_1, 2) > sqDist;
			}))
		{
			representativePoints.push(di);
			numHighRepresentativePoints += pointIsHigh;
			ratio = numHighRepresentativePoints / representativePoints.length;
		}
	}
//console.log([targetRatio, ratio]);
//console.log("[" + representativePoints.join(", ") + "]");
	return representativePoints;
}

/**
 * This function calls {@link findRepresentativePoints} first with a point distance of 0.1
 * and then iteratively shrinks the distance by half until the full k number of points are returned.
 * @summary Call {@link findRepresentativePoints}, choosing the maximum point distance that yields k points
 * @package
 * @param  {Dataset} dataset
 * @param  {number} d0 The first input dimension (This value must match the one used to compute the histogram)
 * @param  {number} d1 The second input dimension (This value must match the one used to compute the histogram)
 * @param  {DensityMap} densityMap
 * @param  {number} k Maximum number of points to return
 * @param  {number} targetRatio A ratio between 0 (only outliers) and 1 (only cluster centers)
 * @return {Array<number>} An array of up to k point indices of characteristic points
 */
function findRepresentativePoints2(dataset, d0, d1, densityMap, k, targetRatio)
{
	if (isUndefined(targetRatio)) targetRatio = 0.5; // Default ratio is "fifty-fifty"
	
	k = Math.min(k, dataset.length);
	var dist = 0.1;
	var representativePoints;
	while ((representativePoints = findRepresentativePoints(dataset, d0, d1, densityMap, k, dist, targetRatio)).length < k)
		dist /= 2.0;
	return representativePoints;
}

/**
 * @summary N-dimensional version of {@link findRepresentativePoints}
 * @package
 * @param  {Dataset} dataset
 * @param  {Array<Array<DensityMap>>} densityMap
 * @param  {number} k Maximum number of points to return
 * @param  {number} dist Minimum Euclidean distance between returned points in normalized space (in percentage of overall data space bounds)
 * @return {Array<number>} An array of up to k point indices of characteristic points
 */
function findRepresentativePointsND(dataset, densityMap, k, dist)
{
	if (k <= 0)
		return []; // No representative points
	
	var data = dataset.fdata;
	var n = dataset.length;
	var nc = dataset.numColumns;
	var size = densityMap[0][0].width;
	var offsets = new Float32Array(nc), scales = new Float32Array(nc), p = new Float32Array(nc);
	for (var c = 0; c < nc; ++c)
	{
		scales[c] = 1 / (dataset.columns[c].maximum - dataset.columns[c].minimum);
		offsets[c] = -dataset.columns[c].minimum * scales[c];
	}
	
	// Compute density at each datapoint
	var pointDensities = new Float32Array(n);
	for (var i = 0; i < n; ++i)
	{
		for (var c = 0; c < nc; ++c)
			p[c] = data[i * nc + c] * scales[c] + offsets[c];
		
		pointDensities[i] = 0.0;
		for (var d0 = 0; d0 < nc; ++d0)
			for (var d1 = d0 + 1; d1 < nc; ++d1)
			{
				var idx = Math.min(Math.floor(p[d1] * size), size - 1) * size + Math.min(Math.floor(p[d0] * size), size - 1);
				pointDensities[i] += densityMap[d0][d1 - d0 - 1].data[idx];
			}
	}
	
	// Create indices sorted by density
	var indices = Array.from(pointDensities.keys());
	indices.sort(function(idxA, idxB) { return pointDensities[idxA] - pointDensities[idxB]; });
	
	/*// If k >= n, all points are representative
	if (k >= n)
		return indices;*/
	
	// Find k representative points
	var sqDist = dist * dist, dpsq = new Float32Array(nc);
	var d_high = indices.length - 1, d_low = 0;
	var representativePoints = [ indices[d_high--] ]; // First represenatative point is point with highest density
	while (d_high >= d_low && representativePoints.length < k)
	{
		var di = indices[representativePoints.length & 0x1 ? d_low++ : d_high--];
		for (var c = 0; c < nc; ++c)
			p[c] = data[di * nc + c] * scales[c];
		
		if (representativePoints.every(function(r) {
				for (var c = 0; c < nc; ++c)
					dpsq[c] = Math.pow(data[r * nc + c] * scales[c] - p[c], 2);
				
				for (var d0 = 0; d0 < nc; ++d0)
					for (var d1 = d0 + 1; d1 < nc; ++d1)
						if (dpsq[d0] + dpsq[d1] <= sqDist)
							return false;
				return true;
			}))
			representativePoints.push(di);
	}
//console.log("[" + representativePoints.join(", ") + "]");
	return representativePoints;
}
/**
 * @summary N-dimensional version of {@link findRepresentativePoints2}
 * @package
 * @param  {Dataset} dataset
 * @param  {Array<Array<DensityMap>>} densityMap
 * @param  {number} k Maximum number of points to return
 * @return {Array<number>} An array of up to k point indices of characteristic points
 */
function findRepresentativePointsND2(dataset, densityMap, k)
{
	k = Math.min(k, dataset.length);
	var dist = 0.2;
	var representativePoints;
	while ((representativePoints = findRepresentativePointsND(dataset, densityMap, k, dist)).length < k)
		dist /= 2.0;
	return representativePoints;
}

/**
 * @summary Find a low density point close to the p-th point of the dataset
 * @package
 * @param  {Dataset} dataset
 * @param  {number} d0 The first input dimension (This value must match the one used to compute the histogram)
 * @param  {number} d1 The second input dimension (This value must match the one used to compute the histogram)
 * @param  {number} p Index of the reference point
 * @param  {DensityMap} densityMap
 * @param  {Object} stencilMap A binary matrix of same size as the density map that records low-density points to avoid overlap
 * @param  {number} minDistX Minimum distance to reserve around the returned point in x-direction of normalized space (in percentage of overall data space width)
 * @param  {number} minDistY Minimum distance to reserve around the returned point in y-direction of normalized space (in percentage of overall data space height)
 * @return {Array<number>} 2D coordinates of the found point in data space
 */
function findClosePointOfLowDensity(dataset, d0, d1, p, densityMap, stencilMap, minDistX, minDistY)
{
	var densities = densityMap.data, width = densityMap.width, height = densityMap.height, densityScale = densityMap.scale, densityOffset = -densityMap.offset;
	var v0 = dataset.dataVectors[d0], v1 = dataset.dataVectors[d1];
	
	// Transform density, minDistX, minDistY from [0 ... 1] space to density map space
	densityOffset *= (width + height) / 2;
	densityScale *= (width + height) / 2;
	minDistX = Math.ceil(minDistX * width);
	minDistY = Math.ceil(minDistY * height);
	
	// Transform data point and data space bounds from data space to density map space
	var p0 = densityMap.transformX(v0.getValue(p));
	var p1 = densityMap.transformY(v1.getValue(p));
	var xmin = Math.min(0, Math.floor(densityMap.transformX(v0.minimum)) - minDistX - 1); //TODO: -1 ... Why?
	var xmax = Math.max(width, Math.ceil(densityMap.transformX(v0.maximum)) + minDistX + 2); //TODO: +2 ... Why?
	var ymin = Math.min(0, Math.floor(densityMap.transformY(v1.minimum)) - minDistY - 1); //TODO: -1 ... Why?
	var ymax = Math.max(height, Math.ceil(densityMap.transformY(v1.maximum)) + minDistY + 2); //TODO: +2 ... Why?
	var stencilStride = xmax - xmin;
	
	// Create stencilMap if it doesn't exist
	if (!stencilMap.data)
		stencilMap.data = new Uint8Array((stencilMap.width = xmax - xmin) * (stencilMap.height = ymax - ymin));
	var stencil = stencilMap.data;
	
	// Mark p in stencil map
	var imgxmin = Math.max(xmin, Math.floor(p0) - minDistX), imgxmax = Math.min(xmax, Math.floor(p0) + minDistX);
	var imgymin = Math.max(ymin, Math.floor(p1) - minDistY), imgymax = Math.min(ymax, Math.floor(p1) + minDistY);
	for (var y = imgymin; y < imgymax; ++y)
		for (var x = imgxmin; x < imgxmax; ++x)
			stencil[(y - ymin) * stencilStride + (x - xmin)] = 1;
	
	// Square minimum distances
	var sqMinDistX = minDistX*minDistX, sqMinDistY = minDistY*minDistY;
	var sqDensityOffset = densityOffset*densityOffset;
	
	var closestPoint = null, closestPointPenalty = Number.MAX_VALUE;
	var sqdx, sqdy
	for (var y = ymin; y < ymax; ++y)
		for (var x = xmin; x < xmax; ++x)
			if (stencil[(y - ymin) * stencilStride + (x - xmin)] === 0)
			{
				sqdx = Math.pow(x - p0, 2);
				sqdy = Math.pow(y - p1, 2);
				if (sqdx > sqMinDistX && sqdy > sqMinDistY)
				{
					var sqDensity = x >= 0 && x < width && y >= 0 && y < height ? Math.pow(densityOffset + densities[y * width + x] * densityScale, 2) : sqDensityOffset;
					var sqDist = sqdx + sqdy;
					var penalty = 1e10 * sqDensity + sqDist;
					if (penalty < closestPointPenalty)
					{
						closestPointPenalty = penalty;
						closestPoint = [x, y];
					}
				}
			}
	if (closestPoint === null)
		return closestPoint;
	
	// Mark image in stencil map
	imgxmin = Math.max(xmin, closestPoint[0] - 2 * minDistX); imgxmax = Math.min(xmax, closestPoint[0] + 2 * minDistX);
	imgymin = Math.max(ymin, closestPoint[1] - 2 * minDistY); imgymax = Math.min(ymax, closestPoint[1] + 2 * minDistY);
	for (var y = imgymin; y < imgymax; ++y)
		for (var x = imgxmin; x < imgxmax; ++x)
			stencil[(y - ymin) * stencilStride + (x - xmin)] = 1;
	
	//downloadStencilMap(stencilMap);
	
	// Transform closestPoint back from density map space to data space
	closestPoint[0] = densityMap.invTransformX(closestPoint[0]);//(closestPoint[0] / width - o0) / s0;
	closestPoint[1] = densityMap.invTransformY(closestPoint[1]);//(closestPoint[1] / height - o1) / s1;
	
	return closestPoint;
}
/**
 * This function marks regions of minDistX/minDistY around each point in points in the stencil map.
 * These regions are ignored when looking for points of low density using {@link findClosePointOfLowDensity}.
 * @package
 * @summary Mark the given points in the stencil map
 * @param  {Dataset} dataset
 * @param  {number} d0 The first input dimension (This value must match the one used to compute the histogram)
 * @param  {number} d1 The second input dimension (This value must match the one used to compute the histogram)
 * @param  {Array<number>} points Indices to points to mark
 * @param  {DensityMap} densityMap
 * @param  {Object} stencilMap A binary matrix of same size as the density map that records low-density points to avoid overlap
 * @param  {number} minDistX Minimum distance to reserve around the marked points in x-direction of normalized space (in percentage of overall data space width)
 * @param  {number} minDistY Minimum distance to reserve around the marked points in y-direction of normalized space (in percentage of overall data space height)
 */
function markPointsInStencilMap(dataset, d0, d1, points, densityMap, stencilMap, minDistX, minDistY)
{
	var width = densityMap.width, height = densityMap.height;
	var v0 = dataset.dataVectors[d0], v1 = dataset.dataVectors[d1];
	
	// Transform minDistX, minDistY from [0 ... 1] space to density map space
	minDistX = Math.ceil(minDistX * width);
	minDistY = Math.ceil(minDistY * height);
	
	// Transform data space bounds from data space to density map space
	var xmin = Math.min(0, Math.floor(densityMap.transformX(v0.minimum)) - minDistX - 1); //TODO: -1 ... Why?
	var xmax = Math.max(width, Math.ceil(densityMap.transformX(v0.maximum)) + minDistX + 2); //TODO: +2 ... Why?
	var ymin = Math.min(0, Math.floor(densityMap.transformY(v1.minimum)) - minDistY - 1); //TODO: -1 ... Why?
	var ymax = Math.max(height, Math.ceil(densityMap.transformY(v1.maximum)) + minDistY + 2); //TODO: +2 ... Why?
	var stencilStride = xmax - xmin;
	
	// Create stencilMap if it doesn't exist
	if (!stencilMap.data)
		stencilMap.data = new Uint8Array((stencilMap.width = xmax - xmin) * (stencilMap.height = ymax - ymin));
	var stencil = stencilMap.data;
	
	points.forEach(function(p) {
		var p0 = Math.floor(densityMap.transformX(v0.getValue(p)));
		var p1 = Math.floor(densityMap.transformY(v1.getValue(p)));
		var imgxmin = Math.max(xmin, p0 - minDistX), imgxmax = Math.min(xmax, p0 + minDistX);
		var imgymin = Math.max(ymin, p1 - minDistY), imgymax = Math.min(ymax, p1 + minDistY);
		for (var y = imgymin; y < imgymax; ++y)
			for (var x = imgxmin; x < imgxmax; ++x)
				stencil[(y - ymin) * stencilStride + (x - xmin)] = 1;
	});
	//downloadStencilMap(stencilMap);
}
/**
 * @summary Download the given stencil map as black-and-white image
 * @package
 * @param  {Object} stencilMap
 * @param  {string=} fileName=stencilMap.png The file name of the downloaded image.
 */
function downloadStencilMap(stencilMap, fileName)
{
	if (!fileName)
		fileName = "stencilMap.png";
	
	var bytes = new Uint8Array(4 * stencilMap.width * stencilMap.height);
	for (var i = 0; i < stencilMap.data.length; ++i)
	{
		bytes[i * 4 + 0] = bytes[i * 4 + 1] = bytes[i * 4 + 2] = stencilMap.data[i] != 0 ? 255 : 0;
		bytes[i * 4 + 3] = 255;
	}
	download(fileName, imageUrlFromBytes(bytes, stencilMap.width, stencilMap.height));
}
/**
 * This function uses uniform cost search to explore regions beyond local minima.
 * @summary Find a low density point close to the p-th point of the dataset by following the gradient of the density map
 * @package
 * @param  {Dataset} dataset
 * @param  {number} d0 The first input dimension (This value must match the one used to compute the histogram)
 * @param  {number} d1 The second input dimension (This value must match the one used to compute the histogram)
 * @param  {number} p Index of the reference point
 * @param  {DensityMap} densityMap
 * @param  {number} minDistX Minimum distance to reserve around the returned point in x-direction of normalized space (in percentage of overall data space width)
 * @param  {number} minDistY Minimum distance to reserve around the returned point in y-direction of normalized space (in percentage of overall data space height)
 * @return {Array<number>} 2D coordinates of the found point in data space
 * @deprecated Use {@link findClosePointOfLowDensity} instead
 */
function findClosePointOfLowDensity_descend(dataset, d0, d1, p, densityMap, minDistX, minDistY)
{
	var data = dataset.fdata;
	var n = dataset.length;
	var nc = dataset.numColumns;
	var s0 = 1 / (dataset.columns[d0].maximum - dataset.columns[d0].minimum);
	var o0 = -dataset.columns[d0].minimum * s0;
	var s1 = 1 / (dataset.columns[d1].maximum - dataset.columns[d1].minimum);
	var o1 = -dataset.columns[d1].minimum * s1;
	var densities = densityMap.data, width = densityMap.width, height = densityMap.height, densityScale = densityMap.scale, densityOffset = -densityMap.offset;
	
	// Transform data point from data space to density map space
	var p0 = (data[p * nc + d0] * s0 + o0) * width;
	var p1 = (data[p * nc + d1] * s1 + o1) * height;
//console.log(p0);
//console.log(p1);
	
	// Transform density, minDistX, minDistY from [0 ... 1] space to density map space
	densityOffset *= (width + height) / 2;
	densityScale *= (width + height) / 2;
	minDistX = Math.ceil(minDistX * width);
	minDistY = Math.ceil(minDistY * height);
	
	// Define overall bounds
	var xMin = minDistX, xMax = width - minDistX;
	var yMin = minDistY, yMax = height - minDistY;
	
	var computePenalty = function(x, y) {
		var sqDensity = Math.pow(densityOffset + densities[y * width + x] * densityScale, 2);
		var sqDist = Math.pow(x - p0, 2) + Math.pow(y - p1, 2);
		return 1e5 * sqDensity + sqDist;
	};
	
	var bestState = {penalty: Number.MAX_VALUE}, maxIterations = 5000;
	var searchProblem = {
		getStartState: function() {
			return {
				x: Math.max(xMin, Math.min(xMax - 1, Math.floor(p0))),
				y: Math.max(yMin, Math.min(yMax - 1, Math.floor(p1)))
			};
		},
		isGoalState: function(state) {
			return --maxIterations === 0;
		},
		forEachSuccessor: function(state, onSuccessor) {
			[[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]].forEach(function(action) {
				var x = state.x + action[0];
				var y = state.y + action[1];
				if (x >= xMin && x < xMax && y >= yMin && y < yMax)
				{
					var newState = {x: x, y: y, penalty: computePenalty(x, y)};
					if (newState.penalty < bestState.penalty && (x < p0 - minDistX || x > p0 + minDistX) && (y < p0 - minDistY || y > p0 + minDistY))
						bestState = newState;
					onSuccessor(newState, newState.penalty);
				}
			});
		},
		computeHash: function(state) {
			return state.y * width + state.x;
		},
		heuristic: function(state) {
			return Math.pow(densityOffset + densities[state.y * width + state.x] * densityScale, 2);
		}
	};
//var tStart = performance.now();
	//BreadthFirstSearch(searchProblem);
	//DepthFirstSearch(searchProblem);
	SimpleUniformCostSearch(searchProblem);
	//SimpleAStarSearch(searchProblem);
	//SimpleGreedySearch(searchProblem);
//var tEnd = performance.now();
//console.log((tEnd - tStart) / 1000.0);
	var closestPoint = [bestState.x, bestState.y];
	/*var x = Math.floor(p0), y = Math.floor(p1);
	var cX, cY, currentPenalty, lastPenalty, lowestPenalty = Number.MAX_VALUE;
	do
	{
		lastPenalty = lowestPenalty;
		[[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]].forEach(function(offset) {
			cX = x + offset[0];
			cY = y + offset[1];
			if (cX >= xMin && cX < xMax && cY >= yMin && cY < yMax)
			{
				currentPenalty = computePenalty(cX, cY);
				if (currentPenalty < lowestPenalty)
				{
					lowestPenalty = currentPenalty;
					x = cX;
					y = cY;
				}
			}
		});
	}
	while (lowestPenalty !== lastPenalty);
	closestPoint = [x, y];*/
//console.log(closestPoint);
	
	
/*var xMin = Math.max(0, closestPoint[0] - 2 * minDistX), xMax = Math.min(width, closestPoint[0] + 2 * minDistX);
var yMin = Math.max(0, closestPoint[1] - 2 * minDistY), yMax = Math.min(height, closestPoint[1] + 2 * minDistY);
for (var y = yMin; y < yMax; ++y)
	for (var x = xMin; x < xMax; ++x)
		densities[y * width + x] = 1e20;*/
	
	// Transform closestPoint back from density map space to data space
	closestPoint[0] = (closestPoint[0] / width - o0) / s0;
	closestPoint[1] = (closestPoint[1] / height - o1) / s1;
	
	return closestPoint;
}

/**
 * @summary N-dimensional version of {@link findClosePointOfLowDensity_descend}
 * @package
 * @param  {Dataset} dataset
 * @param  {number} p Index of the reference point
 * @param  {Array<Array<DensityMap>>} densityMap
 * @param  {number} minDist Minimum distance to reserve around the returned point in normalized space (in percentage of overall data space bounds)
 * @return {Array<number>} {@link Dataset#numColumns}-diemnsional coordinates of the found point in data space
 * @deprecated This function is slow and yields unsatisfying results. Consider using 2D algorithms instead.
 */
function findClosePointOfLowDensityND_descend(dataset, p, densityMap, minDist)
{
	var data = dataset.fdata;
	var n = dataset.length;
	var nc = dataset.numColumns;
	var size = densityMap[0][0].width, densityScale = densityMap[0][0].scale, densityOffset = -densityMap[0][0].offset; //EDIT: Take offset/scale over all density maps
	
	// Transform data point from data space to [0 ... size] space
	var start = new Float32Array(nc);
	for (var c = 0; c < nc; ++c)
		start[c] = (data[p * nc + c] - dataset.columns[c].minimum) * size / (dataset.columns[c].maximum - dataset.columns[c].minimum);
	
	// Transform density and minDist from [0 ... 1] space to [0 ... size] space
	densityOffset *= size;
	densityScale *= size;
	minDist = Math.ceil(minDist * size);
	
	// Define overall bounds
	var min = minDist, max = size - minDist;
	
	
	var actions = [];
	var a = new Float32Array(nc), i;
	for (var c = 0; c < nc; ++c)
		a[c] = -1;
	do
	{
		if (!a.every(function(aa){ return aa === 0; }))
			actions.push(a.slice());
		i = 0;
		while (i !== a.length && ++a[i] === 2)
		{
			a[i] = 0;
			++i;
		}
	} while (i !== a.length);
	
	var computePenalty = function(p) {
		var sqDensity = 0.0;
		for (var d0 = 0; d0 < nc; ++d0)
			for (var d1 = d0 + 1; d1 < nc; ++d1)
				sqDensity += Math.pow(densityOffset + densityMap[d0][d1 - d0 - 1].data[p[d1] * size + p[d0]] * densityScale, 2);
		var sqDist = p.reduce(function(a, p, pi) {
			var dp = Math.abs(p - start[pi]);
			return a + (dp > minDist ? Math.pow(dp - minDist, 2) : Math.pow(minDist - dp, 2));
		})
		return sqDensity + sqDist;
	};
	
	var bestState = {penalty: Number.MAX_VALUE}, maxIterations = 100;//5000;
	var searchProblem = {
		getStartState: function() {
			var _start = new Float32Array(nc);
			for (var c = 0; c < nc; ++c)
				_start[c] = Math.max(min, Math.min(max - 1, Math.floor(start[c])));
			return {p: _start};
		},
		isGoalState: function(state) {
			return --maxIterations === 0;
		},
		forEachSuccessor: function(state, onSuccessor) {
			actions.forEach(function(action) {
				var p = new Float32Array(nc);
				for (var c = 0; c < nc; ++c)
				{
					p[c] = state.p[c] + action[c];
					if (p[c] < min || p[c] >= max)
						return;
				}
				var newState = {p: p, penalty: computePenalty(p)};
				if (newState.penalty < bestState.penalty /*&& p.every(function(pp, pi) { return pp < start[pi] - minDist || pp > start[pi] + minDist; })*/)
					bestState = newState;
				onSuccessor(newState, newState.penalty);
			});
		},
		computeHash: function(state) {
			var factor = 1.0, hash = 0.0;
			for (var c = 0; c < nc; ++c)
			{
				hash += state.p[c] * factor;
				factor *= size;
			}
			return hash;
		},
		heuristic: function(state) {
			var sqDensity = 0.0;
			for (var d0 = 0; d0 < nc; ++d0)
				for (var d1 = d0 + 1; d1 < nc; ++d1)
					sqDensity += Math.pow(densityOffset + densityMap[d0][d1 - d0 - 1].data[state.p[d1] * size + state.p[d0]] * densityScale, 2);
			return sqDensity;
		}
	};
//var tStart = performance.now();
	//BreadthFirstSearch(searchProblem);
	//DepthFirstSearch(searchProblem);
	SimpleUniformCostSearch(searchProblem);
	//SimpleAStarSearch(searchProblem);
	//SimpleGreedySearch(searchProblem);
//var tEnd = performance.now();
//console.log((tEnd - tStart) / 1000.0);
	var closestPoint = bestState.p;
	
/*var xMin = Math.max(0, closestPoint[0] - 2 * minDistX), xMax = Math.min(size, closestPoint[0] + 2 * minDistX);
var yMin = Math.max(0, closestPoint[1] - 2 * minDistY), yMax = Math.min(size, closestPoint[1] + 2 * minDistY);
for (var y = yMin; y < yMax; ++y)
	for (var x = xMin; x < xMax; ++x)
		densityMap[y * size + x] = 1e20;*/
	
	// Transform closestPoint back from [0 ... size] space to data space
	for (var c = 0; c < nc; ++c)
		closestPoint[c] = dataset.columns[c].minimum + closestPoint[c] * (dataset.columns[c].maximum - dataset.columns[c].minimum) / size;
	
	return closestPoint;
}
/**
 * This function uses rejection sampling
 * @summary Find a point within the density map by sampling densities
 * @package
 * @param  {DensityMap} densityMap
 * @return {Array<number>} 2D coordinates of the sampled point in density map coordinates
 */
function sampleDensityMap(densityMap)
{
	var width = densityMap.width, height = densityMap.height, scale = densityMap.maximum;
	
	var sample_x, sample_y, sample_d;
	//var nAttempts = 0;
	do {
		sample_x = Math.random() * width;
		sample_y = Math.random() * height;
		sample_d = Math.random() * scale;
		//++nAttempts;
	} while (densityMap.data[Math.floor(sample_y) * width + Math.floor(sample_x)] < sample_d);
	
	return [sample_x, sample_y];
}
/**
 * This function uses rejection sampling
 * @summary Find a point within a fixed column of the density map by sampling densities
 * @package
 * @param  {DensityMap} densityMap
 * @param  {number} sample_y The column of the density map to sample
 * @param  {number} maxIterations The maximum number of attempts, before `NaN` is returned
 * @return {number} The y-coordinate (row) of the sampled point or `NaN` if maxIterations attempts were unsuccessful
 */
function sampleDensityMapRow(densityMap, sample_y, maxIterations)
{
	if (isUndefined(maxIterations)) maxIterations = Number.MAX_SAFE_INTEGER;
	
	var width = densityMap.width, height = densityMap.height, scale = densityMap.maximum;
	sample_y = Math.floor(sample_y) * height;
	
	var sample_x, sample_d;
	do {
		sample_x = Math.random() * width;
		sample_d = Math.random() * scale;
	} while (--maxIterations && densityMap.data[sample_y + Math.floor(sample_x)] < sample_d);
	
	return densityMap.data[sample_y + Math.floor(sample_x)] >= sample_d ? sample_x : NaN;
}
/**
 * This function uses rejection sampling
 * @summary Find a point within a fixed row of the density map by sampling densities
 * @package
 * @param  {DensityMap} densityMap
 * @param  {number} sample_x The row of the density map to sample
 * @param  {number} maxIterations The maximum number of attempts, before `NaN` is returned
 * @return {number} The x-coordinate (column) of the sampled point or `NaN` if maxIterations attempts were unsuccessful
 */
function sampleDensityMapColumn(densityMap, sample_x, maxIterations)
{
	if (isUndefined(maxIterations)) maxIterations = Number.MAX_SAFE_INTEGER;
	
	var width = densityMap.width, height = densityMap.height, scale = densityMap.maximum;
	sample_x = Math.floor(sample_x);
	
	var sample_y, sample_d;
	do {
		sample_y = Math.random() * height;
		sample_d = Math.random() * scale;
	} while (--maxIterations && densityMap.data[Math.floor(sample_y) * width + sample_x] < sample_d);
	
	return densityMap.data[Math.floor(sample_y) * width + sample_x] >= sample_d ? sample_y : NaN;
}

/**
 * This function uses rejection sampling
 * @summary Find a point in n-dimensional space by sampling a chain of (n-1) 2D density maps
 * @package
 * @param  {Array<DensityMap>} densityMapChain An array of density maps of the form `[DensityMap(d0=0, d1=1), DensityMap(d0=1, d1=2) ... DensityMap(d0=n-2, d1=n-1)]`
 * @return {Array<number>} n-dimensional coordinates of the sampled point in density map coordinates
 */
function sampleDensityMapChain(densityMapChain)
{
	var chainLength = densityMapChain.length, sample = new Array(chainLength + 1);
	
	// Pick an initial densityMap from the chain
	var sample_m = Math.floor(Math.random() * chainLength);
	
	var i;
	do {
		// Sample the initial map
		var initialSamples = sampleDensityMap(densityMapChain[sample_m]);
		sample[sample_m] = initialSamples[0];
		sample[sample_m + 1] = initialSamples[1];
		
		// Sample below initialSamples
		var lastSample = initialSamples[0];
		for (i = sample_m - 1; i >= 0 && !isNaN(lastSample); --i)
			sample[i] = lastSample = sampleDensityMapRow(densityMapChain[i], lastSample, sample_m - i);
		if (isNaN(lastSample))
			continue;
		
		// Sample above initialSamples
		lastSample = initialSamples[1];
		for (i = sample_m + 1; i < chainLength && !isNaN(lastSample); ++i)
			sample[i + 1] = lastSample = sampleDensityMapColumn(densityMapChain[i], lastSample, i - sample_m);
	} while(isNaN(lastSample));
	
	return sample;
}

/**
 * @package
 * @param  {Dataset} dataset
 * @param  {number} d0
 * @param  {number} d1
 * @param  {DensityMap} densityMap
 * @return {Object}
 * @deprecated Use {@link computeClusterMap_method3} instead
 */
function computeClusterMap_method1(dataset, d0, d1, densityMap)
{
	var data = dataset.fdata;
	var n = dataset.length;
	var nc = dataset.numColumns;
	var s0 = 1 / (dataset.columns[d0].maximum - dataset.columns[d0].minimum);
	var o0 = -dataset.columns[d0].minimum * s0;
	var s1 = 1 / (dataset.columns[d1].maximum - dataset.columns[d1].minimum);
	var o1 = -dataset.columns[d1].minimum * s1;
	var densities = densityMap.data, width = densityMap.width, height = densityMap.height;
	
	// Compute density at each datapoints -> pointDensities
	var pointDensities = new Float32Array(n);
	for (var i = 0; i < n; ++i)
	{
		var p0 = data[i * nc + d0] * s0 + o0;
		var p1 = data[i * nc + d1] * s1 + o1;
		
		var idx = Math.min(Math.floor(p1 * height), height - 1) * width + Math.min(Math.floor(p0 * width), width - 1);
		pointDensities[i] = densities[idx];
	}
	
	// Create indices sorted by density
	var indices = Array.from(pointDensities.keys());
	indices.sort(function(idxA, idxB) { return pointDensities[idxA] - pointDensities[idxB]; });
	
	// Allocate cluster map
	var clustermap = new Uint32Array(width*height);
	
	var currentClusterId = 1; // Cluster IDs start at 1. 0 represents empty areas
	
	var floodFillRecursive = function(x, y, d) {
		clustermap[y * width + x] = currentClusterId;

		--x;
		--y;
		if (x !== -1 && y !== -1)
		{
			var nd = densities[y * width + x];
			if (nd !== 0 && nd < d && clustermap[y * width + x] === 0)
				floodFillRecursive(x, y, nd);
		}
		
		++x;
		if (y !== -1)
		{
			var nd = densities[y * width + x];
			if (nd !== 0 && nd < d && clustermap[y * width + x] === 0)
				floodFillRecursive(x, y, nd);
		}
		
		++x;
		if (x !== width && y !== -1)
		{
			var nd = densities[y * width + x];
			if (nd !== 0 && nd < d && clustermap[y * width + x] === 0)
				floodFillRecursive(x, y, nd);
		}
		
		++y;
		if (x !== width)
		{
			var nd = densities[y * width + x];
			if (nd !== 0 && nd < d && clustermap[y * width + x] === 0)
				floodFillRecursive(x, y, nd);
		}
		
		++y;
		if (x !== width && y !== height)
		{
			var nd = densities[y * width + x];
			if (nd !== 0 && nd < d && clustermap[y * width + x] === 0)
				floodFillRecursive(x, y, nd);
		}
		
		--x;
		if (y !== height)
		{
			var nd = densities[y * width + x];
			if (nd !== 0 && nd < d && clustermap[y * width + x] === 0)
				floodFillRecursive(x, y, nd);
		}
		
		--x;
		if (x !== -1 && y !== height)
		{
			var nd = densities[y * width + x];
			if (nd !== 0 && nd < d && clustermap[y * width + x] === 0)
				floodFillRecursive(x, y, nd);
		}
		
		++y;
		if (x !== -1)
		{
			var nd = densities[y * width + x];
			if (nd !== 0 && nd < d && clustermap[y * width + x] === 0)
				floodFillRecursive(x, y, nd);
		}
	};
	
	//for (var i = n - 1; i >= 0; --i) // Iteraterate points in order of decreasing point density
	for (var i = 0; i < n; ++i) // Iteraterate points in order of increasing point density
	{
		var p0 = data[indices[i] * nc + d0] * s0 + o0;
		var p1 = data[indices[i] * nc + d1] * s1 + o1;
		
		var x = Math.clamp(Math.floor(p0 * width), 0, width - 1);
		var y = Math.clamp(Math.floor(p1 * height), 0, height - 1);
		if (clustermap[y * width + x] === 0) // If clustermap[y * width + x] doesn't contain a cluster
		{
			floodFillRecursive(x, y, densities[y * width + x]);
			++currentClusterId;
		}
	}
	
	return clustermap;
}

/**
 * @package
 * @param  {Dataset} dataset
 * @param  {number} d0
 * @param  {number} d1
 * @param  {DensityMap} densityMap
 * @return {Object}
 * @deprecated Use {@link computeClusterMap_method3} instead
 */
function computeClusterMap_method2(dataset, d0, d1, densityMap)
{
	var data = dataset.fdata;
	var n = dataset.length;
	var nc = dataset.numColumns;
	var s0 = 1 / (dataset.columns[d0].maximum - dataset.columns[d0].minimum);
	var o0 = -dataset.columns[d0].minimum * s0;
	var s1 = 1 / (dataset.columns[d1].maximum - dataset.columns[d1].minimum);
	var o1 = -dataset.columns[d1].minimum * s1;
	var densities = densityMap.data, width = densityMap.width, height = densityMap.height;
	
	// Compute density at each datapoints -> pointDensities
	var pointDensities = new Float32Array(n);
	for (var i = 0; i < n; ++i)
	{
		var p0 = data[i * nc + d0] * s0 + o0;
		var p1 = data[i * nc + d1] * s1 + o1;
		
		var idx = Math.min(Math.floor(p1 * height), height - 1) * width + Math.min(Math.floor(p0 * width), width - 1);
		pointDensities[i] = densities[idx];
	}
	
	// Create indices sorted by density
	var indices = Array.from(pointDensities.keys());
	indices.sort(function(idxA, idxB) { return pointDensities[idxA] - pointDensities[idxB]; });
	
	// Allocate cluster map
	var clustermap = new Uint32Array(width*height);
	//var clusterQueues = [];
	
	var currentClusterId = 1; // Cluster IDs start at 1. 0 represents empty areas
	
	var neighborQueue = new PriorityQueue('d'); // Queue of all neighbors of clusters (candidates ro be included in the cluster)
	
	//for (var i = n - 1; i >= 0; --i) // Iteraterate points in order of decreasing point density
	for (var i = 0; i < n; ++i) // Iteraterate points in order of increasing point density
	{
		var p0 = data[indices[i] * nc + d0] * s0 + o0;
		var p1 = data[indices[i] * nc + d1] * s1 + o1;
		
		var x = Math.clamp(Math.floor(p0 * width), 0, width - 1);
		var y = Math.clamp(Math.floor(p1 * height), 0, height - 1);
		if (clustermap[y * width + x] === 0) // If clustermap[y * width + x] doesn't contain a cluster
		{
			clustermap[y * width + x] = currentClusterId;
			var d = densities[y * width + x]; //EDIT: Not sure if we need 'nd < n'
			
			if (--x !== -1)
			{
				var nd = densities[y * width + x];
				if (nd !== 0 && nd < d && clustermap[y * width + x] === 0)
					neighborQueue.push({c: clustermap[y * width + x] = currentClusterId, x: x, y: y, d: densities[y * width + x]});
			}
			
			++x;
			if (++x !== width)
			{
				var nd = densities[y * width + x];
				if (nd !== 0 && nd < d && clustermap[y * width + x] === 0)
					neighborQueue.push({c: clustermap[y * width + x] = currentClusterId, x: x, y: y, d: densities[y * width + x]});
			}
			
			--x;
			if (--y !== -1)
			{
				var nd = densities[y * width + x];
				if (nd !== 0 && nd < d && clustermap[y * width + x] === 0)
					neighborQueue.push({c: clustermap[y * width + x] = currentClusterId, x: x, y: y, d: densities[y * width + x]});
			}
			
			++y;
			if (++y !== height)
			{
				var nd = densities[y * width + x];
				if (nd !== 0 && nd < d && clustermap[y * width + x] === 0)
					neighborQueue.push({c: clustermap[y * width + x] = currentClusterId, x: x, y: y, d: densities[y * width + x]});
			}
			
			++currentClusterId; // EDIT: Maybe use 'i + 1' as cluster ID
		}
	}
	
	while (neighborQueue.length)
	{
		var neighbor = neighborQueue.shift();
		var x = neighbor.x, y = neighbor.y, d = neighbor.d, id = neighbor.c;
		
		if (--x !== -1)
		{
			var nd = densities[y * width + x];
			if (nd !== 0 && nd < d && clustermap[y * width + x] === 0)
				neighborQueue.push({c: clustermap[y * width + x] = id, x: x, y: y, d: densities[y * width + x]});
		}
		
		++x;
		if (++x !== width)
		{
			var nd = densities[y * width + x];
			if (nd !== 0 && nd < d && clustermap[y * width + x] === 0)
				neighborQueue.push({c: clustermap[y * width + x] = id, x: x, y: y, d: densities[y * width + x]});
		}
		
		--x;
		if (--y !== -1)
		{
			var nd = densities[y * width + x];
			if (nd !== 0 && nd < d && clustermap[y * width + x] === 0)
				neighborQueue.push({c: clustermap[y * width + x] = id, x: x, y: y, d: densities[y * width + x]});
		}
		
		++y;
		if (++y !== height)
		{
			var nd = densities[y * width + x];
			if (nd !== 0 && nd < d && clustermap[y * width + x] === 0)
				neighborQueue.push({c: clustermap[y * width + x] = id, x: x, y: y, d: densities[y * width + x]});
		}
	}
	
	return clustermap;
}

/**
 * This function can be computed by an asynchronous worker.
 * It inputs and outputs plain JavaScript objects, because data passed between the main thread and an asynchronous worker has to be primitive
 * (e.g. it cannot contain function objects).
 * @summary Compute a {@link ClusterMap} from a {@link DensityMap} computed by {@link computeDensityMap}
 * @package
 * @param  {Object} densityMap To create a densityMap object from a {@link DensityMap}, call `makeCloneable(densityMap)`
 * @param  {number} d0 The first input dimension (This value must match the one used to compute the histogram)
 * @param  {number} d1 The second input dimension (This value must match the one used to compute the histogram)
 * @param  {ClusterMapOptions} options
 * @return {Object} A cluster map object
 * 
 * To get a {@link ClusterMap} from the output object, call `new ClusterMap(clusterMap)`
 */
function computeClusterMap_method3(densityMap, d0, d1, options)
{
	var densities = densityMap.data, width = densityMap.width, height = densityMap.height, len = width*height;
	var densityThreshold = options.threshold * densityMap.maximum;
	
	// Allocate cluster map
	var clustermap = new Uint32Array(len);
	
	// Walk through density map and combine regions of density>=densityThreshold into clusters -> clusters, clustermap
	var leftClusterId, topClusterId;
	var clusters = [];
	for (var y = 0; y < height; ++y)
	{
		leftClusterId = 0;
		for (var x = 0; x < width; ++x)
		{
			var d = densities[y * width + x];
			
			if (d >= densityThreshold)
			{
				if (leftClusterId !== 0)
				{
					if (y !== 0 && (topClusterId = clustermap[(y - 1) * width + x]) !== 0 && topClusterId !== leftClusterId)
					{
						// Link clusters
						var leftCluster = clusters[leftClusterId - 1];
						var topCluster = clusters[topClusterId - 1];
						clusters[leftClusterId - 1] = ForwardList.sortedMerge(leftCluster, topCluster);
						clusters[topClusterId - 1] = clusters[leftClusterId - 1];
						topClusterId = leftClusterId;
					}
					clustermap[y * width + x] = leftClusterId;
				}
				else if (y !== 0 && (topClusterId = clustermap[(y - 1) * width + x]) !== 0)
					clustermap[y * width + x] = leftClusterId = topClusterId;
				else
					clusters.push(new ForwardList(clustermap[y * width + x] = leftClusterId = clusters.length + 1));
			}
			else
				//clustermap[y * width + x] = leftClusterId = 0; // For languages that don't initialize arrays
				leftClusterId = 0;
		}
	}
	
	// Combine lists of merged cluster IDs to cluster IDs -> clusters
	var clusterId = 1;
	for (var i = 0; i < clusters.length; ++i)
	{
		if (clusters[i] === null)
			clusters[i] = 0;
		else if (clusters[i] instanceof ForwardList)
		{
			clusters[i].forEach(function(id) {
				clusters[id - 1] = clusterId;
			});
			++clusterId;
		}
	}
	var numClusters = --clusterId;
	
	// Assign cluster IDs to clustermap -> clustermap
	for (var i = 0; i < len; ++i)
		clustermap[i] = clustermap[i] ? clusters[clustermap[i] - 1] : 0;
	
	// Compute cluster densities (= maximum densities per cluster) -> clusterDensities
	var clusterDensities = Array.apply(null, Array(numClusters)).map(Number.prototype.valueOf, Number.MIN_VALUE);
	for (var i = 0; i < len; ++i)
		if ((clusterId = clustermap[i]))
			clusterDensities[clusterId - 1] = Math.max(clusterDensities[clusterId - 1], densityMap.data[i]);
	
	var clusterMinDensities = Array.apply(null, Array(numClusters)).map(Number.prototype.valueOf, densityThreshold);
	
	
	if (false)
	{
		// Extend clusters to fill entire density != 0 area
		
		var neighborQueue = new PriorityQueue('d'); // Queue of all neighbors of clusters (candidates ro be included in the cluster)
		
		for (var y = 0; y < height; ++y)
			for (var x = 0; x < width; ++x)
				if (clustermap[y * width + x] !== 0 &&
					(
						(x < width - 1 && clustermap[y * width + x - 1] === 0) ||
						(x > 0 && clustermap[y * width + x + 1] === 0) ||
						(y > 0 && clustermap[(y - 1) * width + x] === 0) ||
						(y < height - 1 && clustermap[(y + 1) * width + x] === 0)
					))
					neighborQueue.push({c: clustermap[y * width + x], x: x, y: y, d: densities[y * width + x]});
		
		while (neighborQueue.length)
		{
			var neighbor = neighborQueue.shift();
			var x = neighbor.x, y = neighbor.y, d = neighbor.d, id = neighbor.c;
			
			if (--x !== -1)
			{
				var nd = densities[y * width + x];
				if (nd !== 0 && clustermap[y * width + x] === 0)
				{
					neighborQueue.push({c: clustermap[y * width + x] = id, x: x, y: y, d: nd = densities[y * width + x]});
					clusterMinDensities[id - 1] = Math.min(clusterMinDensities[id - 1], nd);
				}
			}
			
			++x;
			if (++x !== width)
			{
				var nd = densities[y * width + x];
				if (nd !== 0 && clustermap[y * width + x] === 0)
				{
					neighborQueue.push({c: clustermap[y * width + x] = id, x: x, y: y, d: nd = densities[y * width + x]});
					clusterMinDensities[id - 1] = Math.min(clusterMinDensities[id - 1], nd);
				}
			}
			
			--x;
			if (--y !== -1)
			{
				var nd = densities[y * width + x];
				if (nd !== 0 && clustermap[y * width + x] === 0)
				{
					neighborQueue.push({c: clustermap[y * width + x] = id, x: x, y: y, d: nd = densities[y * width + x]});
					clusterMinDensities[id - 1] = Math.min(clusterMinDensities[id - 1], nd);
				}
			}
			
			++y;
			if (++y !== height)
			{
				var nd = densities[y * width + x];
				if (nd !== 0 && clustermap[y * width + x] === 0)
				{
					neighborQueue.push({c: clustermap[y * width + x] = id, x: x, y: y, d: nd = densities[y * width + x]});
					clusterMinDensities[id - 1] = Math.min(clusterMinDensities[id - 1], nd);
				}
			}
		}
	}
	
	
	var clusterMap = {
		data: clustermap,
		densities: clusterDensities,
		minDensities: clusterMinDensities,
		threshold: densityThreshold,
		n: numClusters,
		width: width, height: height,
		transform: densityMap.transform,
		/*transformX: densityMap.transformX,
		transformY: densityMap.transformY,
		invTransformX: densityMap.invTransformX,
		invTransformY: densityMap.invTransformY*/
	}
	return clusterMap;
}




/*function computeDensityMap_gpu(gl, meshDataPoints, dataset, d0, d1, size)
{
	// Compile shaders
	var sdrPoints = new Shader(gl, [meshDataPoints.getPosCode(), Shaders.vsDensityMap], Shaders.fsDensityMap);
	sdrPoints.transform = sdrPoints.u1fv("transform");
	var posattr = [sdrPoints.getAttribLocation("p0"), sdrPoints.getAttribLocation("p1"), sdrPoints.getAttribLocation("p2"), sdrPoints.getAttribLocation("p3")];
	var sdrBlur = new Shader(gl, Shaders.vsBlurDensityMap, Shaders.fsBlurDensityMap);
	sdrBlur.pixelSize = sdrBlur.u2f("pixelSize");
	sdrBlur.pixelSize(1.0 / size, 1.0 / size);
	sdrBlur.gauss = sdrBlur.u1fv("gauss");
	var gauss = new Float32Array(33 * 33);
	var gaussScale = Math.log(0.1) / (33*33);
	for (var y = -16; y <= 16; ++y)
		for (var x = -16; x <= 16; ++x)
			gauss[(y + 16) * 33 + x + 16] = Math.exp(gaussScale * (x*x + y*y)) / 1024.0;
	sdrBlur.gauss(gauss);
	var meshQuad = new Mesh(gl, new Float32Array([-1, 1, 0, -1, -1, 0, 1, 1, 0, 1, -1, 0]), null, null, null, new Float32Array([0, 1, 0, 0, 1, 1, 1, 0]));
	
	var rttTextures = [gl.createTexture(), gl.createTexture()];
	var rttFramebuffers = [gl.createFramebuffer(), gl.createFramebuffer()];
	for (var i = 0; i < rttTextures.length; ++i)
	{
		// Create render target textures -> rttTextures[i]
		gl.bindTexture(gl.TEXTURE_2D, rttTextures[i]);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		
		// Create render target framebuffers -> rttFramebuffers[i]
		gl.bindFramebuffer(gl.FRAMEBUFFER, rttFramebuffers[i]);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
		
		// Bind framebuffer and renderbuffer
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, rttTextures[i], 0);
	}
	gl.bindTexture(gl.TEXTURE_2D, null);
	gl.bindRenderbuffer(gl.RENDERBUFFER, null);
	
	// Set viewport
	var oldViewportSize = gl.getParameter(gl.VIEWPORT);
	gl.viewport(0, 0, size, size);
	
	
	// Create transform
	var nc = dataset.numColumns;
	var s0 = 1 / (dataset.columns[d0].maximum - dataset.columns[d0].minimum);
	var t0 = -dataset.columns[d0].minimum * s0;
	var s1 = 1 / (dataset.columns[d1].maximum - dataset.columns[d1].minimum);
	var t1 = -dataset.columns[d1].minimum * s1;
	var transform = matN.zero(nc + 1, 3);
	matN.set(transform, d0, 0, 2 * s0);
	matN.set(transform, nc, 0, t0 - 1);
	matN.set(transform, d1, 1, -2 * s1);
	matN.set(transform, nc, 1, 1 - t1);
	
	// Render
	var oldClearColor = gl.getParameter(gl.COLOR_CLEAR_VALUE);
	gl.clearColor(0.0, 0.0, 0.0, 0.0);
	gl.clear(gl.COLOR_BUFFER_BIT);
	sdrPoints.bind();
	sdrPoints.transform(transform);
	meshDataPoints.draw();
	
	
	// Render
	gl.bindFramebuffer(gl.FRAMEBUFFER, rttFramebuffers[0]);
	//gl.clearColor(0.0, 0.0, 0.0, 0.0);
	//gl.clear(gl.COLOR_BUFFER_BIT);
	sdrBlur.bind();
	meshQuad.bind(sdrBlur, rttTextures[1]);
	meshQuad.draw();
	
	for (var i = 0; i < 4; ++i)
	{
		gl.bindFramebuffer(gl.FRAMEBUFFER, rttFramebuffers[1]);
		sdrBlur.bind();
		meshQuad.bind(sdrBlur, rttTextures[0]);
		meshQuad.draw();
		
		gl.bindFramebuffer(gl.FRAMEBUFFER, rttFramebuffers[0]);
		sdrBlur.bind();
		meshQuad.bind(sdrBlur, rttTextures[1]);
		meshQuad.draw();
	}
	
	
	// Read pixels
	var bytes = new Uint8Array(size * size * 4);
	gl.readPixels(0, 0, size, size, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
	
	var densityMap = new Float32Array(size * size);
	for (var i = 0; i < size * size; ++i)
	{
		var value = (bytes[4 * i + 0] << 0) | (bytes[4 * i + 1] << 8) | (bytes[4 * i + 2] << 16);
		densityMap[i] = value / 0xFFFFFF;
		//bytes[i * 4 + 1] = bytes[i * 4 + 2] = bytes[i * 4 + 0] = bytes[i * 4 + 3] = 255;
	}
	
	
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	for (var i = 0; i < rttTextures.length; ++i)
	{
		// Remove framebuffers
		gl.deleteFramebuffer(rttFramebuffers[i]);
		
		//EDIT: Remove render target textures?
	}
	
	// Restore viewport and clear color
	gl.viewport.apply(gl, oldViewportSize);
	gl.clearColor.apply(gl, oldClearColor);
	
	// Remove shaders
	sdrPoints.free();
	sdrBlur.free();
	
	
	
	
	var n = dataset.length;
	var data = dataset.fdata;
	for (var i = 0; i < n; ++i)
	{
		var p0 = data[i * nc + d0] * matN.get(transform, d0, 0) + matN.get(transform, nc, 0);
		var p1 = data[i * nc + d1] * matN.get(transform, d1, 1) + matN.get(transform, nc, 1);
		
		p0 = (p0 + 1) / 2;
		p1 = (p1 + 1) / 2;
		
		var idx = Math.min(Math.floor(p1 * size), size - 1) * size + Math.min(Math.floor(p0 * size), size - 1);
		var density = densityMap[idx];
		bytes[idx * 4 + 0] = bytes[idx * 4 + 3] = 255;
		bytes[idx * 4 + 1] = bytes[idx * 4 + 2] = 0;
data[i * nc + 5] = density * 2 - 1;
	}
	
	
	
	// Download image
	download("densityMap.png", imageUrlFromBytes(bytes, size, size));
	
	
//computePointDensity(dataset, d0, d1, densityMap, size);
meshDataPoints.rebindPosBuffer();
	return densityMap;
}

function computePointDensity(dataset, d0, d1, densityMap, densityMapSize)
{
	var data = dataset.fdata;
	var n = dataset.length;
	var nc = dataset.numColumns;
	var s0 = 1 / (dataset.columns[d0].maximum - dataset.columns[d0].minimum);
	var o0 = -dataset.columns[d0].minimum * s0;
	var s1 = 1 / (dataset.columns[d1].maximum - dataset.columns[d1].minimum);
	var o1 = -dataset.columns[d1].minimum * s1;
	
	
	for (var i = 0; i < n; ++i)
	{
		var p0 = data[i * nc + d0] * s0 + o0;
		var p1 = 1.0 - (data[i * nc + d1] * s1 + o1);
		var density = densityMap[Math.floor(p1 * densityMapSize) * densityMapSize + Math.floor(p0 * densityMapSize)];
data[i * nc + 5] = density * 2 - 1;
	}
}*/

/**
 * @summary Download the given density map as floating point image
 * @package
 * @param  {DensityMap} densityMap
 * @param  {string=} fileName=densityMap.png The file name of the downloaded image.
 */
function downloadDensityMap(densityMap, fileName)
{
	if (!fileName)
		fileName = "densityMap.png";
	
	download(fileName, imageUrlFromBytes(F32toI24flipY(densityMap.data, [densityMap.minimum, densityMap.maximum], densityMap.width, densityMap.height), densityMap.width, densityMap.height));
}

/**
 * @summary 2D vector-line intersection test
 * @package
 * @param  {Array<number>} vpos Origin of the vector
 * @param  {Array<number>} vdir Direction of the vector
 * @param  {Array<number>} a Start point of the line
 * @param  {Array<number>} b End point of the line
 * @return {Array<number>} Point of intersection or null if no intersection occured
 */
function vectorLineIntersection2D(vpos, vdir, a, b)
{
	var x1 = vpos[0], y1 = vpos[1], x2 = vpos[0] + vdir[0], y2 = vpos[1] + vdir[1]; 
	var x3 = a[0], y3 = a[1], x4 = b[0], y4 = b[1]; 
	
	var denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
	if (denom > -1e-5 && denom < 1e-5)
		return null; // Line and vector are parallel or coincident
	
	//console.log([(x1 * y2 - y1 * x2) / denom, (x3 * y4 - y3 * x4) / denom]);
	
	var xi = ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / denom;
	var yi = ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / denom;
	
	
	var u = Math.abs(x4 - x3) > Math.abs(y4 - y3) ? (xi - x3) / (x4 - x3) : (yi - y3) / (y4 - y3);
	//console.log(u);
	if (u < 0.0 || u > 1.0)
		return null; // Intersection lies outside the range a...b
	
	
	return [xi, yi];
}

/**
 * Source: http://ideone.com/PnPJgb
 * @summary 2D line-line intersection test
 * @package
 * @param  {Array<number>} a Start point of line 1
 * @param  {Array<number>} b End point of line 1
 * @param  {Array<number>} c Start point of line 2
 * @param  {Array<number>} d End point of line 2
 * @return {boolean} True if the two lines intersect
 */
function linesIntersect(a, b, c, d)
{
	var CmP = [c[0] - a[0], c[1] - a[1]];
	var r = [b[0] - a[0], b[1] - a[1]];
	var s = [d[0] - c[0], d[1] - c[1]];
	
	var CmPxr = CmP[0] * r[1] - CmP[1] * r[0];
	var CmPxs = CmP[0] * s[1] - CmP[1] * s[0];
	var rxs = r[0] * s[1] - r[1] * s[0];
	
	if (CmPxr === 0)
		// Lines are collinear, and therefore intersect if they have any overlap
		return ((c[0] - a[0] < 0) !== (c[0] - b[0] < 0)) || ((c[1] - a[1] < 0) !== (c[1] - b[1] < 0));
	
	if (rxs === 0)
		// Lines are parallel
		return false;
	
	var rxsr = 1 / rxs;
	var t = CmPxs * rxsr;
	var u = CmPxr * rxsr;
	
	return (t >= 0) && (t <= 1) && (u >= 0) && (u <= 1);
}


/**
 * Tests if point P lies within polygon V.
 * <pre>
 * // Copyright 2000 softSurfer, 2012 Dan Sunday
 * // This code may be freely used and modified for any purpose
 * // providing that this copyright notice is included with it.
 * // SoftSurfer makes no warranty for this code, and cannot be held
 * // liable for any real or imagined damage resulting from its use.
 * // Users of this code must verify correctness for their application.
 * </pre>
 * @summary 2D winding number test by Dan Sunday
 * @package
 * @param  {Array<number>} P The point to be tested
 * @param  {Array<Array<number>>} V A closed (first point == last point) polygon of points
 * @return {boolean} True if point P is included by polygon V
 */
function pointInsidePolygon(P, V)
{
	var n = V.length - 1, wn = 0; // wn: The winding number counter
	
	var isLeft = function(P0, P1, P2) { return ( (P1[0] - P0[0]) * (P2[1] - P0[1]) - (P2[0] -  P0[0]) * (P1[1] - P0[1]) ); };

	// loop through all edges of the polygon
	for (var i = 0; i < n; i++)
	{
		// Test edge from V[i] to V[i + 1]
		if (V[i][1] <= P[1]) // If edge-start is on or below P
		{
			if (V[i + 1][1] > P[1]) // If edge is upward crossing
				if (isLeft( V[i], V[i + 1], P) > 0) // If P is to the left of edge
					++wn; // We have a valid up intersect
		}
		else // If edge-start is above P
		{
			if (V[i + 1][1] <= P[1]) // If edge is downward crossing
				if (isLeft( V[i], V[i + 1], P) < 0) // If P is to the right of edge
					--wn; // We have a valid down intersect
		}
	}
	return wn !== 0;
}
