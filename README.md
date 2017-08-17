# GlobalView.js
WebGL based scatterplot visualization of large, high dimensional datasets

## Why another JavaScript plotting library?
There are a plethora of plotting libraries available. Many of them are free to use. Most of them provide more options and chart types than GlobalView.js. But GlobalView.js is different, __it is _fast_!__

### How fast?
Try it for yourself and see how fast your browser can draw a million points [here](http://homepage.univie.ac.at/a0929188/GlobalView/example4.html).
A modern desktop computer will report something like this:
* Initialization: 250 milliseconds
* Random dataset generation: 500 milliseconds
* Render time: 10 milliseconds

10 milliseconds means 100 frames per second, meaning that this plot renders in realtime. If you don't believe it, try scrolling with the mouse wheel or panning the view by either holding down the middle mouse button or CTRL + left mouse button.

The following graph shows a benchmark of how fast a plot with between 0 and __10 million points__ renders on a __desktop machine__: (Speed is measured in Frames Per Second)

![GlobalView.js benchmark on desktop](./README_files/number_of_2D_points_(Desktop).png)
<sup><sub>
  CPU: Intel Core i7-2600K CPU @ 3.40GHz, GPU: AMD Radeon RX 480, OS: Ubuntu 17.04, BROWSER: Firefox 55.0.1
</sub></sup>

On a __phone__ GlobalView.js achieves the following frames per second for between 0 and __1 million points__:
![GlobalView.js benchmark on mobile](./README_files/number_of_2D_points_(Phone).png)
<sup><sub>
  PHONE: HTC Desire 626s
</sub></sup>

### Why is it so fast?
GlobalView.js uses WebGL to render points with the GPU. It keeps the full dataset in video RAM as one continuous block of memory to avoid costly copies between host RAM and video RAM and it is optimized to keep communication between JavaScript and OpenGL to a minimum.
