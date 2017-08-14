/**
 * A vector of data values inside the dataset.
 * The source of a data vector can be either a column in the dataset's data table or a formula.
 * The length of the vector is fixed by the dataset.
 * The DataVector class doesn't store actual values, it only defines functions to read from the dataset.
 * @constructor
 * @export
 * @param {Dataset} dataset The underlying dataset
 * @param {number|string} source Either a column index into the dataset, or a formula
 */
function DataVector(dataset, source)
{
	var nc = dataset.numColumns;
	
	if (isNumber(source))
	{
		var c = Math.round(source);
		this['getValue'] = this.getValue = function(i)
		{
			//return Math.log(dataset.fdata[i * nc + c]);
			return dataset.fdata[i * nc + c];
		}
		
		//this.getValueCode = "log(c{0})".format(c);
		this.getValueCode = "c" + c;//"{" + c + "}";
		
		var column = dataset.columns[c];
		this['minimum'] = this.minimum = column.minimum;
		this['maximum'] = this.maximum = column.maximum;
		this.offset = -column.minimum * (this.scale = 1 / (column.maximum - column.minimum));
		this['values'] = this.values = column.values;
		this['label'] = this.label = column.label;
	}
	else
	{
		var stack = new Array(16);
		var globalTypes = {
			'n': FormulaCompiler.types.float,
			'PI': FormulaCompiler.types.float,
			'i': FormulaCompiler.types.float
		};
		for (var c = 0; c < nc; ++c) globalTypes['c' + c] = FormulaCompiler.types.float;
		var globals = {
			'n': dataset.length,
			'PI': Math.PI
		};
		
		var code = FormulaCompiler.compile(source + ";", globalTypes);
		if (isString(code))
		{
			console.error("GlobalView error: Error while parsing data vector formula '{0}'".format(source));
			console.error("                  " + code);
			return;
		}
		var formula = source;
		this.getValueCode = formula;
		
		this['getValue'] = this.getValue = function(i)
		{
			globals['i'] = i;
			for (var c = 0; c < nc; ++c)
				globals['c' + c] = dataset.fdata[i * nc + c];
			
			return FormulaCompiler.run(code, stack, globals);
		}
		
		this.minimum = Number.MAX_VALUE;
		this.maximum = Number.MIN_VALUE;
		for (var i = 0, n = dataset.length; i < n; ++i)
		{
			var value = this.getValue(i);
			this.minimum = Math.min(this.minimum, value);
			this.maximum = Math.max(this.maximum, value);
		}
		this['minimum'] = this.minimum;
		this['maximum'] = this.maximum;
		//console.log([this.minimum, this.maximum]);
		this.scale = this.maximum - this.minimum;
		if (this.scale > -1e-5 && this.scale < 1e-5)
			this.offset = 0.5 - 0.5 * (this.minimum + this.maximum) * (this.scale = 0.5);
		else
			this.offset = -this.minimum * (this.scale = 1 / this.scale);
		this['values'] = this.values = null;
		this['label'] = this.label = formula;
	}
}

/**
 * A dataset template for the GlobalView scatter plot framework
 * @abstract
 * @constructor
 * @export
 */
function Dataset()
{
	/**
	 * @summary Number of columns in the {@link Dataset#data} table
	 * @type {number}
	 */
	this.numColumns = this['numColumns'] = 0;
	/**
	 * Note: Each dataVector has exactly 'length' elements
	 * @summary Number of rows in the {@link Dataset#data} table
	 * @type {number}
	 */
	this.length = this['length'] = 0;
	/**
	 * @summary Metadata about one column of data in the {@link Dataset#data} table
	 * @type {Object}
	 * @deprecated Use {@link Dataset#dataVectors} for access to metadata instead
	 */
	this.columns = this['columns'] = [];
	/**
	 * An input dimension to the plot.
	 * A data vector doesn't physically contain data.
	 * Instead it holds meta data and a transfer function that produces data based on zero or more columns from the {@link Dataset#fdata} table
	 * @summary A logical vector of data
	 * @type {Array<DataVector>}
	 */
	this.dataVectors = this['dataVectors'] = [];
	/**
	 * The data matrix isn't limited to numeric data.
	 * Categorical columns are stored as strings.
	 * {@link Dataset#dataVectors} access the numeric version of this matrix ({@link Dataset#fdata}).
	 * It is of size {@link Dataset#numColumns} by {@link Dataset#length}.
	 * @summary A matrix of data
	 * @type {Float32Array|Array}
	 */
	this.data = this['data'] = [];
	/**
	 * This matrix is the numeric version of {@link Dataset#data}.
	 * Categorical columns are stored as 0-based indices.
	 * @summary A matrix of numeric data for the {@link Dataset#dataVectors}
	 * @type {Float32Array}
	 */
	this.fdata = this['fdata'] = new Float32Array(0);
	/**
	 * This vector is of length {@link Dataset#length}.
	 * @summary A vector of data point names
	 * @type {Array<string>}
	 */
	this.names = this['names'] = null;
	/**
	 * This vector is of length {@link Dataset#length}.
	 * @summary A vector of data point image URLs.
	 * @type {Array<string>}
	 */
	this.imageFilenames = this['imageFilenames'] = null;
	
	/**
	 * @type {Array<Array<Object>>}
	 */
	var _densityMaps = [];
	/**
	 * @type {Array<Array<Object>>}
	*/
	var _clusterMaps = [];
	
	this['isDensityMapReady'] =
	/**
	 * Checks if a density map on dimensions d0 and d1 is available.
	 * Hint: d0 and d1 can't be identical. The order of d0 and d1 is ignored.
	 * @param  {number!} d0
	 * @param  {number!} d1
	 * @return {boolean!} True, if a densitymap for dimensions d0, d1 has been computed
	 */
	this.isDensityMapReady = function(d0, d1)
	{
		// Validate inputs
		if (d0 >= this.dataVectors.length || d1 >= this.dataVectors.length)
			return false;
		
		// Assure d0 < d1
		if (d0 === d1)
			return false;
		if (d1 < d0)
		{
			// Swap d0 <-> d1
			var temp = d0;
			d0 = d1;
			d1 = temp;
		}
		
		return _densityMaps.length > d0 && _densityMaps[d0].length > d1 && _densityMaps[d0][d1] &&
			(isUndefined(_densityMaps[d0][d1].pending) || _densityMaps[d0][d1].old);
	}
	
	this['iterateDensityMaps'] =
	/**
	 * Calls the given function for each computed density map
	 * @param  {function(DensityMap!)!} callback
	 */
	this.iterateDensityMaps = function(callback)
	{
		_densityMaps.forEach(_densityMaps => _densityMaps.forEach(densityMap => densityMap && (isUndefined(densityMap.pending) || densityMap.old) ? callback(densityMap.old || densityMap) : null));
	}
	
	this['requestDensityMap'] = 
	/**
	 * This function returns a density map for the given dimensions. If the density map doesn't exist it is computed.
	 * When a function is passed to ondone, the density map is computed by a background worker, otherwise it is computed on the current thread.
	 * After the worker has finished all ondone events for calls to this function are fired.
	 * Hint: d0 and d1 can't be identical. The order of d0 and d1 is ignored.
	 * @summary Returns a density map for dimensions d0 and d1.
	 * @param  {!number} d0
	 * @param  {!number} d1
	 * @param  {number=} size=1024 The width and height of the density map
	 * @param  {DensityMapOptions=} options
	 * @param  {function(DensityMap)=} ondone A function to be called when the density map is ready
	 * @return {DensityMap}
	 */
	this.requestDensityMap = function(d0, d1, size, options, ondone)
	{
		// Validate inputs
		if (d0 >= this.dataVectors.length || d1 >= this.dataVectors.length)
		{
			console.warn("GlobalView warning: Requesting density map for dimensions {0}, {1} on a dataset with only {2} data vectors".format(d0, d1, this.dataVectors.length));
			return null;
		}
		var isAsync = isFunction(ondone) ;//&& !/Firefox/i.test(navigator.userAgent);// Firefox tends to crash with Parallel.js
		
		// Assure d0 < d1
		if (d0 === d1)
			return null;
		if (d1 < d0)
		{
			// Swap d0 <-> d1
			var temp = d0;
			d0 = d1;
			d1 = temp;
		}
		
		while (_densityMaps.length <= d0)
			_densityMaps.push([]);
		while (_densityMaps[d0].length <= d1)
			_densityMaps[d0].push(null);
		var densityMap = _densityMaps[d0][d1];
		
		if (!size) size = 1024;
		
		if (densityMap && options && densityMap.options && !DensityMapOptions.equals(options, densityMap.options)) // If options changed
			densityMap = null; // Recompute density map
		
		if (isAsync) // If async
		{
			if (!densityMap) // If _densityMaps[d0][d1] isn't computed or being computed yet
			{
				// While we compute _densityMaps[d0][d1], replace it with an array of functions to execute when it is ready
				_densityMaps[d0][d1] = {pending: [ondone], old: _densityMaps[d0][d1]};
				
				// Compute histogram synchronously
				var histogram = computeHistogram2D(this, d0, d1, size, size);
				
				// Execute an asynchronous worker that computes _densityMaps[d0][d1]
				const p = new Parallel([makeCloneable(histogram), new DensityMapOptions(options)], { evalPath: 'eval.js' });
				p.require(DensityMap);
				p.require(computeDensityMap);
				p.spawn(params => {
					return computeDensityMap.apply(null, params);
				}).then(densityMap => {
					densityMap = new DensityMap(densityMap);
					// Free histogram
					histogram = null;
					
					// Set _densityMaps[d0][d1]
					_densityMaps[d0][d1].old = null;
					var pending = _densityMaps[d0][d1].pending;
					_densityMaps[d0][d1] = densityMap;
					
					if (_clusterMaps.length > d0 && _clusterMaps[d0].length > d1 && _clusterMaps[d0][d1] && isUndefined(_clusterMaps[d0][d1].pending))
						_clusterMaps[d0][d1] = null;
					
					// Execute queued 'ondone' functions
					pending.forEach(ondone => { ondone(densityMap); });
				});
			}
			else if (!isUndefined(densityMap.pending)) // If _densityMaps[d0][d1] is currently being computed asynchronously
			{
				if (densityMap.old && (!options || DensityMapOptions.equals(densityMap.old.options, options))) // If the deprecated densityMap satisfies our requested options
					ondone(/** @type {DensityMap} */(densityMap.old));
				else
					densityMap.pending.push(ondone);
			}
			else // If _densityMaps[d0][d1] is available
				ondone(/** @type {DensityMap} */(densityMap));
			return null;
		}
		else
		{
			if (!densityMap) // If _densityMaps[d0][d1] isn't computed or being computed yet
			{
				//var tStart = performance.now();
				var histogram = computeHistogram2D(this, d0, d1, size, size);
				_densityMaps[d0][d1] = densityMap = new DensityMap(computeDensityMap(histogram, new DensityMapOptions(options)));
				histogram = null; // Free histogram
				//console.log(performance.now() - tStart + "ms");
			}
			else if (densityMap.old && (!options || DensityMapOptions.equals(densityMap.old.options, options))) // If the deprecated densityMap satisfies our requested options
				densityMap = densityMap.old;
			else
				while (!isUndefined(_densityMaps[d0][d1].pending)) {} // Wait while _densityMaps[d0][d1] is being computed asynchronously
			
			if (isFunction(ondone))
				ondone(/** @type {DensityMap} */(densityMap));
			return /** @type {DensityMap} */(densityMap);
		}
	}
	
	this['isClusterMapReady'] =
	this.isClusterMapReady = function(d0, d1)
	{
		// Validate inputs
		if (d0 >= this.dataVectors.length || d1 >= this.dataVectors.length)
			return false;
		
		// Assure d0 < d1
		if (d0 === d1)
			return false;
		if (d1 < d0)
		{
			// Swap d0 <-> d1
			var temp = d0;
			d0 = d1;
			d1 = temp;
		}
		
		return _clusterMaps.length > d0 && _clusterMaps[d0].length > d1 && _clusterMaps[d0][d1] &&
			(isUndefined(_clusterMaps[d0][d1].pending) || _clusterMaps[d0][d1].old);
	}
	this['requestClusterMap'] = this.requestClusterMap = function(d0, d1, options, ondone)
	{
		// Validate inputs
		if (d0 >= this.dataVectors.length || d1 >= this.dataVectors.length)
		{
			console.warn("GlobalView warning: Requesting cluster map for dimensions {0}, {1} on a dataset with only {2} data vectors".format(d0, d1, this.dataVectors.length));
			return null;
		}
		var isAsync = isFunction(ondone) ;//&& !/Firefox/i.test(navigator.userAgent);// Firefox tends to crash with Parallel.js
		
		// Assure d0 < d1
		if (d0 === d1)
			return;
		if (d1 < d0)
		{
			// Swap d0 <-> d1
			var temp = d0;
			d0 = d1;
			d1 = temp;
		}
		
		while (_clusterMaps.length <= d0)
			_clusterMaps.push([]);
		while (_clusterMaps[d0].length <= d1)
			_clusterMaps[d0].push(null);
		var clusterMap = _clusterMaps[d0][d1];
		
		if (clusterMap && options && clusterMap.options && !ClusterMapOptions.equals(options, clusterMap.options)) // If options changed
			clusterMap = null; // Recompute density map
		
		if (isAsync) // If async
		{
			if (!clusterMap) // If _clusterMaps[d0][d1] isn't computed or being computed yet
			{
				// While we compute _clusterMaps[d0][d1], replace it with an array of functions to execute when it is ready
				_clusterMaps[d0][d1] = {pending: [ondone]};
				
				this.requestDensityMap(d0, d1, undefined, undefined, function(densityMap) {
					// Execute an asynchronous worker that computes _clusterMaps[d0][d1]
					const p = new Parallel([makeCloneable(densityMap), d0, d1, new ClusterMapOptions(options)], { evalPath: 'eval.js' });
					p.require(computeClusterMap_method3);
					p.require(ForwardList);
					p.require(PriorityQueue);
					p.spawn(params => {
						return computeClusterMap_method3.apply(null, params);
					}).then(clusterMap => {
						clusterMap = new ClusterMap(clusterMap);
						// Set _clusterMaps[d0][d1]
						var pending = _clusterMaps[d0][d1].pending;
						_clusterMaps[d0][d1] = clusterMap;
						
						// Execute queued 'ondone' functions
						pending.forEach(ondone => { ondone(clusterMap); });
					});
				});
			}
			else if (!isUndefined(clusterMap.pending)) // If _clusterMaps[d0][d1] is currently being computed asynchronously
			{
				if (clusterMap.old && (!options || ClusterMapOptions.equals(clusterMap.old.options, options))) // If the deprecated clusterMap satisfies our requested options
					ondone(/** @type {ClusterMap} */(clusterMap.old));
				else
					clusterMap.pending.push(ondone);
			}
			else // If _clusterMaps[d0][d1] is available
				ondone(clusterMap);
		}
		else
		{
			if (!clusterMap) // If _clusterMaps[d0][d1] isn't computed or being computed yet
			{
				var densityMap = this.requestDensityMap(d0, d1, undefined, undefined);
				if (densityMap)
				{
					//var tStart = performance.now();
					_clusterMaps[d0][d1] = clusterMap = new ClusterMap(computeClusterMap_method3(densityMap, d0, d1, new ClusterMapOptions(options)));
					//console.log(performance.now() - tStart + "ms");
				}
				else
					_clusterMaps[d0][d1] = clusterMap = null;
			}
			else if (clusterMap.old && (!options || ClusterMapOptions.equals(clusterMap.old.options, options))) // If the deprecated clusterMap satisfies our requested options
				clusterMap = clusterMap.old;
			else
				while (!isUndefined(clusterMap.pending)) {} // Wait while _clusterMaps[d0][d1] is being computed asynchronously
			
			if (isFunction(ondone))
				ondone(clusterMap);
			return clusterMap;
		}
	}
	
	this['inflate'] = this.inflate = function(factor, densityMapChain)
	{
		var n = this.length, n_inflated = Math.floor(factor * n), nc = this.numColumns;
		if (isNaN(n_inflated) || n_inflated <= n)
			return;
		var fdata = this.fdata, fdata_inflated = new Float32Array(n_inflated * nc);
		var data = this.data, data_inflated = new Array(n_inflated * nc);
		
		for (var i = 0, len = n * nc; i < len; ++i)
			fdata_inflated[i] = fdata[i];
		for (var i = 0, len = n * nc; i < len; ++i)
			data_inflated[i] = data[i];
		
		var column, samples, sample, sampleScale = 1 / densityMapChain[0].size;
		for (var i, i_inflated = n, len = n * nc; i_inflated < n_inflated; ++i_inflated)
		{
			i = i_inflated % n;
			
			samples = sampleDensityMapChain(densityMapChain);
			for (var c = 0; c < nc; ++c)
			{
				column = this.columns[c];
				sample = column.minimum + (column.maximum - column.minimum) * samples[c] * sampleScale;
				
				if (column.values) // If column is qualitative
				{
					fdata_inflated[i_inflated * nc + c] = sample = Math.max(0, Math.min(column.values.length - 1, Math.round(sample)));
					data_inflated[i_inflated * nc + c] = column.values[sample];
				}
				else // If column is numeric
				{
					fdata_inflated[i_inflated * nc + c] = sample;
					data_inflated[i_inflated * nc + c] = sample;
				}
			}
		}
		this['fdata'] = this.fdata = fdata_inflated;
		this['data'] = this.data = data_inflated;
		
		if (this.names !== null)
		{
			var names = /** @type {Array<string>} */ (this.names), names_inflated = new Array(n_inflated);
			for (var i = 0, len = n; i < len; ++i)
				names_inflated[i] = names[i];
			for (var index = 0, i_inflated = n, len = n * nc; i_inflated < n_inflated; ++i_inflated)
				names_inflated[i_inflated] = "generated datapoint " + ++index;
			this['names'] = this.names = names_inflated;
		}
		
		if (this.imageFilenames !== null)
		{
			var imageFilenames = /** @type {Array<string>} */ (this.imageFilenames), imageFilenames_inflated = new Array(n_inflated);
			for (var i = 0, len = n; i < len; ++i)
				imageFilenames_inflated[i] = imageFilenames[i];
			for (var i_inflated = n, len = n * nc; i_inflated < n_inflated; ++i_inflated)
				imageFilenames_inflated[i_inflated] = imageFilenames[i_inflated % n];
			this['imageFilenames'] = this.imageFilenames = imageFilenames_inflated;
		}
		
		this['length'] = this.length = n_inflated;
	}
	
	this['save'] = this.save = function(filename, nameColumn, nameColumnLabel)
	{
		var nc = this.numColumns, csv_nc;
		if (this.names && !isUndefined(nameColumn) && !isUndefined(nameColumnLabel))
			csv_nc = nc + 1;
		else
		{
			nameColumn = -1;
			csv_nc = nc;
		}
		
		var csv = new Array(this.length + 1); // +1 ... Header row
		
		// Create csv header array
		var header = new Array(csv_nc);
		for (var c = 0, ci = 0; c < csv_nc; ++c, ++ci)
		{
			if (c === nameColumn)
			{
				header[c] = nameColumnLabel;
				--ci;
			}
			else
				header[c] = this.columns[ci].label;
		}
		csv[0] = header;
		
		// Create csv body arrays
		for (var i = 0; i < this.length; ++i)
		{
			var row = new Array(csv_nc);
			for (var c = 0, ci = 0; c < csv_nc; ++c, ++ci)
			{
				if (c === nameColumn)
				{
					row[c] = this.names[i];
					--ci;
				}
				else
					row[c] = this.data[i * nc + ci];
			}
			csv[i + 1] = row; // +1 ... Header row
		}
		
		download(filename, "data:text/csv;charset=utf-8," + encodeURIComponent($.csv.fromArrays(csv)));
	}
}


// >>> Random dataset

/**
 * A randomly generated dataset
 * @extends {Dataset}
 * @constructor
 * @export
 * @param {number} n Number of rows (points) of the dataset
 * @param {number} nc Number of columns (dimensions) of the dataset
 * @param {function(Dataset)} onload Event handler, called after the dataset was created
 */
function RandomDataset(n, nc, onload)
{
	Dataset.call(this);
	
	this['numColumns'] = this.numColumns = nc;
	this['length'] = this.length = n;
	for (var i = 0; i < nc; ++i)
	{
		this.columns.push({minimum: 0, maximum: 1, label: generateColumnName(i, nc)});
		this.dataVectors.push(new DataVector(this, i));
	}
	
	var nnc = n * nc;
	this['fdata'] = this.fdata = new Float32Array(nnc);
	for (var i = 0; i < nnc; ++i)
		this.fdata[i] = Math.random();
	this['data'] = this.data = this.fdata;
	
	if (onload)
		onload(this);
}

// >>> CSV dataset

/**
 * A map of valid options for CSV datasets with option descriptions and validation functions
 * @const
 * @enum {{
 * description: string,
 * default: *,
 * valid: Array
 * }}
*/
var CSV_DATASET_OPTIONS = {
	/** When true, tries to infer other options based on the structure of the dataset (slow). */
	'autoDetect': {
		description: "When true, tries to infer other options based on the structure of the dataset (slow).",
		default: false,
		valid: [true, false]
	},
	
	/** When true, interprets the first row of the dataset as column labels. */
	'hasHeader': {
		description: "When true, interprets the first row of the dataset as column labels.",
		default: false,
		valid: [true, false]
	},
	
	/** Index of a column of the dataset that contains data point names. */
	'nameColumn': {
		description: "Index of a column of the dataset that contains data point names.",
		default: null,
		valid: null
	},
	
	/** An array of column labels, or a function that takes the column index as input and returns the column label. */
	'columnLabels': {
		description: "An array of column labels, or a function that takes the column index as input and returns the column label.",
		default: null,
		valid: null
	},
	
	/** An array of image URLs, or a function that takes a row of data and the row index as input and returns a URL to an image of the data point. */
	'imageFilenames': {
		description: "An array of image URLs, or a function that takes a row of data and the row index as input and returns a URL to an image of the data point.",
		default: null,
		valid: null
	}
};

/**
 * A dataset constructed from a CSV table
 * @extends {Dataset}
 * @constructor
 * @export
 * @param {string|Blob} file File or URL of file, containing the CSV-formatted dataset
 * @param {Object} options
 * @param {function(Dataset)} onload Event handler, called after the dataset was created
 */
function CsvDataset(file, options, onload)
{
	Dataset.call(this);
	
	// Validate options
	for (var option in options)
	{
		if (!options.hasOwnProperty(option))
			continue;
		
		// Validate option
		if (!CSV_DATASET_OPTIONS.hasOwnProperty(option))
		{
			console.warn("CsvDataset warning: Unsupported option: " + option);
			continue;
		}
		var optionDefinition = CSV_DATASET_OPTIONS[option];
		
		// Validate value
		var value = options[option];
		if ((optionDefinition.valid && optionDefinition.valid.indexOf(value) === -1) ||
			(optionDefinition.validRange && (value < optionDefinition.validRange[0] || value > optionDefinition.validRange[1])))
		{
			console.warn("CsvDataset warning: Invalid value for option " + option + ": " + value);
			delete options[option];
			continue;
		}
	}
	
	// Load csv file
	var dataset = this;
	var parseCsv = function(csv) {
		var data = $.csv.toArrays(csv);
		
		
		if (options['autoDetect'])
		{
			if (isUndefined(options['hasHeader']))
			{
				// Assume no-header by default
				options['hasHeader'] = false;
				
				var firstRowOnlyStrings = data[0].every(value => isNaN(parseData(value)));
				var secondRowHasNumbers = data[1].some(value => !isNaN(parseData(value)));
				
				// If the first row consists of only string values, but the second row has at least one numeric value, we can assume the first row is a header
				if (firstRowOnlyStrings && secondRowHasNumbers)
					options['hasHeader'] = true;
				console.log("Assuming hasHeader = " + options['hasHeader']);
			}
			if (isUndefined(options['nameColumn']))
			{
				// Assume no name column by default
				options['nameColumn'] = null;
				
				// If any row consists of only unique strings, we can assume it contains data point names
				for (var c = 0; c < data[0].length; ++c)
				{
					var valueMap = {};
					if (data.every(row => (row.length > c && isNaN(parseData(row[c])) && !(row[c] in valueMap)) ? valueMap[row[c]] = true : false))
					{
						options['nameColumn'] = c;
						break;
					}
				}
				console.log("Assuming nameColumn = " + options['nameColumn']);
			}
		}
		
		
		var n = data.length, nc = data[0].length - (options['nameColumn'] ? 1 : 0), firstRow = (options['hasHeader'] ? 1 : 0);
		dataset['numColumns'] = dataset.numColumns = nc;
		
		// Generate column labels
		var columnLabels;
		if (isFunction(options['columnLabels']))
		{
			columnLabels = new Array(n);
			for (var c = 0, ci = 0; c < data[0].length; ++c, ++ci)
			{
				if (c == options['nameColumn'])
				{
					--ci;
					continue;
				}
				
				columnLabels[ci] = options['columnLabels'](c);
			}
		}
		else if (isArray(options['columnLabels']))
		{
			if (options['columnLabels'].length !== nc)
			{
				console.warn("CsvDataset warning: Number of provided column labels (" + options['columnLabels'].length + ") differs from number of data columns in the dataset (" + nc + ")");
				columnLabels = null;
			}
			else
				columnLabels = options['columnLabels'];
		}
		else
			columnLabels = null;
		
		dataset['data'] = dataset.data = new Array(nc * n);
		dataset['fdata'] = dataset.fdata = new Float32Array(nc * n);
		var i, di;
		for (var c = 0, ci = 0; c < data[0].length; ++c, ++ci)
		{
			if (c == options['nameColumn'])
			{
				--ci;
				continue;
			}
			
			// Loop through all values of column c -> value, fvalue, min, max
			var min = Number.MAX_VALUE, max = Number.MIN_VALUE, isNumeric = true;
			for (i = firstRow, di = 0; i < data.length; ++i, ++di)
			{
				// Skip blank lines
				if (data[i].length === 1 && data[i][0] === "")
				{
					--di;
					continue;
				}
				
				var value = data[i][c];
				var fvalue = parseData(value);
				if (isNaN(fvalue))
				{
					isNumeric = false;
					break;
				}
				
				dataset.data[di * nc + ci] = value;
				dataset.fdata[di * nc + ci] = fvalue;
				min = Math.min(min, fvalue);
				max = Math.max(max, fvalue);
			}
			
			var valueList = null;
			if (!isNumeric)
			{
				// Loop through all values of column c again, generating a value map -> value, fvalue, min, max
				valueList = [];
				var valueMap = {}, valueIdx = 0;
				for (i = firstRow, di = 0; i < data.length; ++i, ++di)
				{
					// Skip blank lines
					if (data[i].length === 1 && data[i][0] === "")
					{
						--di;
						continue;
					}
					
					var value = data[i][c];
					var cls = valueMap[value];
					var fvalue;
					if (typeof cls === 'undefined')
					{
						valueList.push(value);
						fvalue = valueMap[value] = valueIdx++;
					}
					else
						fvalue = cls;
					
					fvalue += 0.5;
						
					dataset.data[di * nc + ci] = value;
					dataset.fdata[di * nc + ci] = fvalue;
				}
				min = 0;
				max = valueList.length;
			}
			
			// Save column meta data
			dataset.columns.push({minimum: min, maximum: max, label: columnLabels ? columnLabels[ci] : (options['hasHeader'] ? data[0][c] : generateColumnName(ci, nc)), values: valueList});
			dataset.dataVectors.push(new DataVector(dataset, ci));
		}
		
		if (di !== n) // If some line were blank
		{
			di = n - di; // Set di to the number of skipped lines
			n -= di; // Shrink n
			di *= nc; // Set di to the number of skipped values
			
			// Shrink dataset.data and dataset.fdata
			dataset.data.splice(-di);
			if (Float32Array.prototype.splice)
				/** @type {{splice: Function}} */ (dataset.fdata).splice(-di);
			else if (Float32Array.prototype.slice)
				dataset['fdata'] = dataset.fdata = dataset.fdata.slice(0, -di);
			else
			{
				var trimedFdata = new Float32Array(nc * n);
				var len;
				for (i = 0, len = trimedFdata.length; i < len; ++i)
					trimedFdata[i] = dataset.fdata[i];
				dataset['fdata'] = dataset.fdata = trimedFdata;
			}
		}
		
		// Set number of data points
		dataset['length'] = dataset.length = n;
		
		// Extract data point names
		if (options['nameColumn'])
		{
			var names = dataset['names'] = dataset.names = new Array(n);
			var nameColumn = options['nameColumn'];
			for (i = firstRow, di = 0; i < data.length; ++i, ++di)
			{
				// Skip blank lines
				if (data[i].length === 1 && data[i][0] === "")
				{
					--di;
					continue;
				}
				
				names[di] = data[i][nameColumn];
			}
		}
		else
			dataset['names'] = dataset.names = null;
		
		// Generate image filenames
		if (isFunction(options['imageFilenames']))
		{
			dataset['imageFilenames'] = dataset.imageFilenames = new Array(n);
			for (i = firstRow, di = 0; i < data.length; ++i, ++di)
			{
				// Skip blank lines
				if (data[i].length === 1 && data[i][0] === "")
				{
					--di;
					continue;
				}
				
				dataset.imageFilenames[di] = options['imageFilenames'](data[i], i);
			}
		}
		else if (isArray(options['imageFilenames']))
		{
			if (options['imageFilenames'].length !== n)
			{
				console.warn("CsvDataset warning: Number of provided image filenames (" + options['imageFilenames'].length + ") differs from number of data points (" + n + ")");
				dataset['imageFilenames'] = dataset.imageFilenames = null;
			}
			else
				dataset['imageFilenames'] = dataset.imageFilenames = options['imageFilenames'];
		}
		else
			dataset['imageFilenames'] = dataset.imageFilenames = null;
		
		// Notify success
		if (onload)
			onload(dataset);
	};
	
	
	if (isString(file))
		//$.get(file, parseCsv, "text");
	{
		var request = new XMLHttpRequest();
		request.onreadystatechange = function() {if (this.readyState == 4 && this.status == 200) parseCsv(this.responseText)};
		request.open("GET", /** @type {string} */(file), true);
		request.overrideMimeType("text/csv; charset=utf8");
		request.send();
	}
	else
	{
		var reader = new FileReader();
		reader.onload = event => parseCsv(reader.result);
		reader.readAsText(/** @type {!Blob} */(file));
	}
}

// >>> Helper functions

var generateColumnName = function(i, nc) {
	var XYZW = ['x', 'y', 'z', 'w'];
	if (nc <= XYZW.length)
		return XYZW[i]; // x, y, z, w
	else if (nc <= 26)
		return String.fromCharCode(65 + i); // A, B, C, ...
	else
		return 'c' + (i + 1); // c1, c2, c3, ...
};

function parseData(input) { return parseFloat(input); }