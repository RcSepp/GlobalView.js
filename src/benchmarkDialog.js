function BenchmarkDialog()
{
	var benchmarkDialog = $("#benchmarkDialog").dialog({
		autoOpen: false,
		modal: true,
		closeOnEscape: false,
		resizable: false,
		buttons: [{
			text: "Cancel",
			click: function() {
				cancel = true;
				benchmarkDialog.dialog( "close" );
			}
		}],
		open: startBenchmark,
		beforeClose: function() { cancel = true; }
	});
	
	var pbOverall = $("#pbOverall"), pbPass = $("#pbPass"), progressLabel = $(".progress-label"), tblResults = $("#tblResults"), tblResults_body;
	pbOverall.progressbar({
		value: false,
		change: function() {
			progressLabel.text("Progress: " + Math.floor(pbOverall.progressbar("value") * 100) / 100 + "%" );
		},
		complete: function() {
			progressLabel.text( "Complete!" );
			benchmarkDialog.dialog( "option", "buttons", [{
				text: "Close",
				click: function() {
					cancel = true;
					benchmarkDialog.dialog( "close" );
				}
			}]);
			$(".ui-dialog button").last().trigger( "focus" );
		}
	});
	pbPass.progressbar({ value: false });
	
	var cancel = false;
	function reportProgress(percentageOverall, percentagePass)
	{
		pbOverall.progressbar( "value", 100 * percentageOverall);
		pbPass.progressbar( "value", 100 * percentagePass);
		return !cancel;
	}
	function reportHeader(header)
	{
		tblResults.append("<thead><tr><th>" + header.join("</th><th>") + "</th></tr></thead>");
		tblResults_body = tblResults.append("<tbody></tbody>");
	}
	function reportResult(row)
	{
		tblResults_body.append("<tr><td>" + row.join("</td><td>") + "</td></tr>");
	}
	
	
	
	
	
	
	
	/*var benchmarkOptions = {
		enableTransparency: [true, false],
		pointShape: ['Rectangle'],
		N: [1e5, 1e6, 1e7]
	};*/
	const benchmarkOptions = {
		//pointSize: [1, 5, 10, 25, 50, 100],//[1, 10],//[1, 10, 100],
		//pointShape: ['Rectangle'],
		//N: [1000000]//linspace(100000, 200000, 1000000)
		//N: [1e1, 1e2, 1e3/*, 1e4, 1e5, 1e6*/]
		N: Array.create(1000, i => 10000 * i)
	};
	const SECONDS_PER_BENCHMARK = 1;//10;
	const SAVE_SCREENSHOTS = false;
	
	benchmarkDialog.dialog("open");
	
	
	var zip, csv, numBenchmarks, benchmarkCounter, benchmarkOptionIndices, currentOptions, n, time, frames, passStartTime;
	
	function startBenchmark()
	{
		globalView.pushOptions();
		//globalView.pushDataset();
		globalView.enableOffscreenRendering(1024, 1024);
		
		// Set default options
		var allElements = document.getElementsByTagName('*');
		for (var i in allElements)
			if (allElements[i].className == 'option')
			{
				if (allElements[i].onchange)
					allElements[i].onchange(allElements[i]);
				else if (allElements[i].oninput)
					allElements[i].oninput(allElements[i]);
			}
		
		numBenchmarks = 1;
		benchmarkCounter = 0;
		for (option in benchmarkOptions)
			numBenchmarks *= benchmarkOptions[option].length;
		
		if (SAVE_SCREENSHOTS)
			zip = new JSZip();
		
		var csvHeader = ['fps', 'options'];
		for (option in benchmarkOptions)
			csvHeader.push('' + option);
		csv = [csvHeader];
		
		n = -1;
		benchmarkOptionIndices = {}
		for (option in benchmarkOptions)
			benchmarkOptionIndices[option] = 0;
		
		reportHeader(csvHeader);
		
		if (reportProgress(0, 0))
			setTimeout(startBenchmarkPass, 0);
		else
			cancelBenchmark();
	}
	
	function startBenchmarkPass()
	{
		currentOptions = {};
		for (option in benchmarkOptions)
			currentOptions[option] = benchmarkOptions[option][benchmarkOptionIndices[option]];
		
		
		// <<<<<<<<<< START RUN BENCHMARK >>>>>>>>>>
		if (currentOptions.N !== n)
			globalView.load(new RandomDataset(n = currentOptions.N, 2), 0, 1, 1, 1);

		// Set options
		globalView.setOptions(currentOptions);
		
		time = 0.0;
		frames = 0;
		passStartTime = performance.now();
		
		if (reportProgress(0, 0))
			setTimeout(renderBenchmark, 0);
		else
			cancelBenchmark();
	}
	
	function renderBenchmark()
	{
		var tStart = performance.now();
		globalView.renderOffscreenBuffer();
		var tEnd = performance.now();
		
		time += (tEnd - tStart) / 1000.0;
		++frames;
		var passTime = (tEnd - passStartTime) / 1000.0;
		
		if (reportProgress(benchmarkCounter / numBenchmarks, passTime / SECONDS_PER_BENCHMARK))
			setTimeout(passTime < SECONDS_PER_BENCHMARK ? renderBenchmark : finishBenchmarkPass, 0);
		else
			cancelBenchmark();
	}
	
	function finishBenchmarkPass()
	{
time = (performance.now() - passStartTime) / 1000.0;
		var fps = frames / time;
		var name = JSON.stringify(currentOptions).replaceAll('"', "'");
		var csvRow = [fps, name];
		for (option in currentOptions)
			csvRow.push(currentOptions[option]);
		csv.push(csvRow);

		if (SAVE_SCREENSHOTS)
		{
			var image = globalView.saveOffscreenBuffer();
			image = image.substr(image.indexOf("base64,") + "base64,".length); // Convert base64-dataURL to base64
			name = name.replace('{', '').replace('}', '').replaceAll("'", '').replaceAll(',', ', ');
			zip.file(name + ".png", image, {base64: true});
		}

		//console.log(++benchmarkCounter / numBenchmarks);
		// <<<<<<<<<< END RUN BENCHMARK >>>>>>>>>>
		
		var getKeyByIndex = function(map, idx) {
			for (key in map)
				if (idx-- === 0)
					return key;
			return null;
		};
		
		var o = 0, option = getKeyByIndex(benchmarkOptionIndices, o);
		while (option !== null && ++benchmarkOptionIndices[option] === benchmarkOptions[option].length)
		{
			benchmarkOptionIndices[option] = 0;
			option = getKeyByIndex(benchmarkOptionIndices, ++o);
		}
		
		reportResult(csvRow);
		
		if (reportProgress(++benchmarkCounter / numBenchmarks, 1) && option !== null)
			setTimeout(startBenchmarkPass, 0);
		else if (option !== null)
			cancelBenchmark();
		else
			finishBenchmark();
	}
	
	function cancelBenchmark()
	{
//		globalView.disableOffscreenRendering();
		globalView.popOptions();
		//globalView.popDataset();
		cbDataset_onChange(); // Reload dataset
globalView.disableOffscreenRendering();
		onResize();
	}
	function finishBenchmark()
	{
		cancelBenchmark();
		
		if (SAVE_SCREENSHOTS)
		{
			zip.file("benchmark.csv", $.csv.fromArrays(csv));
			
			zip.generateAsync({type:"base64"}).then(function(base64) {
				download("benchmark.zip", "data:application/zip;base64," + base64);
			});
		}
		else
			download("benchmark.csv", "data:text/csv;charset=utf-8," + encodeURIComponent($.csv.fromArrays(csv)));
	}
	
	/*function runBenchmark()
	{
		globalView.pushOptions();
		//globalView.pushDataset();
		globalView.enableOffscreenRendering(1024, 1024);
		
		// Set default options
		var allElements = document.getElementsByTagName('*');
		for (var i in allElements)
			if (allElements[i].className == 'option')
			{
				if (allElements[i].onchange)
					allElements[i].onchange(allElements[i]);
				else if (allElements[i].oninput)
					allElements[i].oninput(allElements[i]);
			}
		
		//var benchmarkOptions = {
		//	enableTransparency: [true, false],
		//	pointShape: ['Rectangle'],
		//	N: [1e5, 1e6, 1e7]
		//};
		var benchmarkOptions = {
			pointSize: [1, 5, 10, 25, 50, 100],
			pointShape: ['Rectangle'],
			N: linspace(10000, 1000000, 10)
		};
		var SECONDS_PER_BENCHMARK = 1;//60;
		
		var numBenchmarks = 1;
		for (option in benchmarkOptions)
			numBenchmarks *= benchmarkOptions[option].length;
		
		var zip = new JSZip();
		
		var csvHeader = ['fps', 'options'];
		for (option in benchmarkOptions)
			csvHeader.push('' + option);
		var csv = [csvHeader];
		
		if (!reportProgress(0)) return;
		
		var n = -1, benchmarkCounter = 0;
		var benchmarkOptionIndices = {}
		for (option in benchmarkOptions)
			benchmarkOptionIndices[option] = 0;
		
		var getKeyByIndex = function(map, idx) {
			for (key in map)
				if (idx-- === 0)
					return key;
			return null;
		};
		
		var option;
		do
		{
			var currentOptions = {};
			for (option in benchmarkOptions)
				currentOptions[option] = benchmarkOptions[option][benchmarkOptionIndices[option]];
			
			
			// <<<<<<<<<< START RUN BENCHMARK >>>>>>>>>>
			if (currentOptions.N !== n)
				globalView.load(new RandomDataset(n = currentOptions.N, 3), 0, 1, 2, 2);

			// Set options
			globalView.setOptions(currentOptions);

			// Run benchmark
			var numFrames = 0;
			var tStart = performance.now(), t;
			do
			{
				globalView.renderOffscreenBuffer();
				++numFrames;
				t = (performance.now() - tStart) / 1000.0;
			} while (t < SECONDS_PER_BENCHMARK);
			var fps = numFrames / t;

			var name = JSON.stringify(currentOptions).replaceAll('"', "'");
			var csvRow = [fps, name];
			for (option in currentOptions)
				csvRow.push(currentOptions[option]);
			csv.push(csvRow);

			var image = globalView.saveOffscreenBuffer();
			image = image.substr(image.indexOf("base64,") + "base64,".length); // Convert base64-dataURL to base64
			name = name.replace('{', '').replace('}', '').replaceAll("'", '').replaceAll(',', ', ');
			zip.file(name + ".png", image, {base64: true});

			console.log(++benchmarkCounter / numBenchmarks);
			if (!reportProgress(++benchmarkCounter / numBenchmarks)) return;
			// <<<<<<<<<< END RUN BENCHMARK >>>>>>>>>>
			
			
			var o = 0, option = getKeyByIndex(benchmarkOptionIndices, o);
			while (option !== null && ++benchmarkOptionIndices[option] === benchmarkOptions[option].length)
			{
				benchmarkOptionIndices[option] = 0;
				option = getKeyByIndex(benchmarkOptionIndices, ++o);
			}
		} while (option != null);
		
		//download("globalView.png", globalView.saveOffscreenBuffer());
		
		globalView.disableOffscreenRendering();
		globalView.popOptions();
		//globalView.popDataset();
		cbDataset_onChange(); // Reload dataset
		onResize();
		
		//download("benchmark.csv", "data:application/csv;charset=utf-8," + encodeURIComponent($.csv.fromArrays(csv)));
		
		zip.file("benchmark.csv", $.csv.fromArrays(csv));
		
		zip.generateAsync({type:"base64"}).then(function(base64) {
			download("benchmark.zip", "data:application/zip;base64," + base64);
		});
	}*/
}