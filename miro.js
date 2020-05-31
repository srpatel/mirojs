let Miro = (function() {
	let white = [255, 255, 255, 255];
	let black = [0, 0, 0, 255];
	let red = [255, 0, 0, 255];

	let linePoints = [];

	function hexToBytes(hex) {
		let withoutHash = hex.substr(1);
		let bytes = [];
		bytes.push(parseInt(withoutHash.substr(0, 2), 16));
		bytes.push(parseInt(withoutHash.substr(2, 2), 16));
		bytes.push(parseInt(withoutHash.substr(4, 2), 16));
		bytes.push(255);
		return bytes;
	}
	function colourMatch(data, i, c, fuzzy) {
		let dr = data[i] - c[0];
		let dg = data[i + 1] - c[1];
		let db = data[i + 2] - c[2];
		if (fuzzy) {
			let dd = Math.sqrt(dr*dr + dg*dg + db*db);
			if (dr == dg && dr == db) {
				return dd < 300;
			} else {
				return dd < 50;
			}
		} else {
			// Exact match only
			return (dr == 0 && dg == 0 && db == 0);
		}
	}
	function clear(context, w, h) {
		linePoints = [];
		context.beginPath();
		context.fillStyle = '#fff';
		context.fillRect(0, 0, w, h);
	}
	function putColour(data, index, c) {
		data[index] = c[0];
		data[index + 1] = c[1];
		data[index + 2] = c[2];
		data[index + 3] = c[3];
	}
	function simpleFill(data, x, y, width, colour) {
		let i = (y * width + x) * 4;
		let queue = [i];
		let initialColour = [data[i], data[i + 1], data[i + 2], data[i + 3]];
		while (queue.length) {
			// If this colour is initial colour:
			// - paint it
			// - add neighbours
			let index = queue.shift();

			// Ignore if out of bounds
			if (index < 0)
				continue;
			if (index >= data.length)
				continue;

			// Ignore if not initial colour
			if (! colourMatch(data, index, initialColour, false))
				continue;

			putColour(data, index, colour);

			// Add the four neighbours, making sure we don't wrap around
			let  col = (index / 4) % width;
			if (col < width - 1)
				queue.push(index + 4);
			if (col > 0)
				queue.push(index - 4);
			queue.push(index - width * 4);
			queue.push(index + width * 4);
		}
	}
	function offset(element) {
    if (!element.getClientRects().length)
    {
      return { top: 0, left: 0 };
    }

    let rect = element.getBoundingClientRect();
    let win = element.ownerDocument.defaultView;
    return (
    {
      top: rect.top + win.pageYOffset,
      left: rect.left + win.pageXOffset
    });
	}
	function copyNeighbourhood(data, neighbourhood, x, y, w, h, neighbourhoodRadius) {
		for (var nx = 0; nx < 2 * neighbourhoodRadius; nx++) {
			for (var ny = 0; ny < 2 * neighbourhoodRadius; ny++) {
				// Distance from centre
				let dx = nx - neighbourhoodRadius;
				let dy = ny - neighbourhoodRadius;
				let radiusSquared = neighbourhoodRadius * neighbourhoodRadius;
				// Source i
				let sx = dx + x;
				let sy = dy + y;
				let si = (sy * w + sx) * 4;
				var ni = (ny * 2 * neighbourhoodRadius + nx) * 4;
				// If out of bounds, or outside the circle, draw white
				if (sx < 0 || sx >= w || sy < 0 || sy >= h ||
					 	(dx * dx + dy * dy) > radiusSquared) {
					neighbourhood[ni] = 255;
					neighbourhood[ni + 1] = 255;
					neighbourhood[ni + 2] = 255;
					neighbourhood[ni + 3] = 255;
				} else {
					neighbourhood[ni] = data[si];
					neighbourhood[ni + 1] = data[si + 1];
					neighbourhood[ni + 2] = data[si + 2];
					neighbourhood[ni + 3] = data[si + 3];
				}
			}
		}
	}
	function drawLine(data, colour, from, to, w, h) {
		// Bresenham alg
		let dx = Math.abs(to[0] - from[0]);
		let dy = Math.abs(to[1] - from[1]);
		let sx = (from[0] < to[0]) ? 1 : -1;
   	let sy = (from[1] < to[1]) ? 1 : -1;
		let err = dx - dy;

		while(true) {
			let i = (from[1] * w + from[0]) * 4;
			putColour(data, i, colour);

      if ((from[0] === to[0]) && (from[1] === to[1])) break;
      let e2 = 2 * err;
      if (e2 > -dy) {
				err -= dy;
				from[0] += sx;
			}
      if (e2 < dx) {
				err += dx;
				from[1] += sy;
			}
   }
	}
	function draw(xPos, yPos, canvas, context, colour, thickness) {
		let offsets = offset(canvas);
		let x = xPos - offsets.left - 2;
		let y = yPos - offsets.top - 2;
		linePoints.push([x, y]);
    context.beginPath();
    context.fillStyle = colour;
    context.arc(x, y, thickness, 0, 2 * Math.PI);
    context.fill();
    context.closePath();
  }
	function fill(xPos, yPos, w, h, canvas, context, colour, thickness, neighbourhoodRadius) {
		let offsets = offset(canvas);
		let x = xPos - offsets.left - 2;
		let y = yPos - offsets.top - 2;
		let fillColour = hexToBytes(colour);

		// 1. copy to a new canvas
		let originalImage = context.getImageData(0, 0, w, h);
		let originalImageData = originalImage.data;
		let helperImage = new ImageData(
		  new Uint8ClampedArray(originalImageData),
		  originalImage.width,
		  originalImage.height
		);
		let helperImageData = helperImage.data;

		// clicked colour
		let clickedIndex = Math.floor(y * w + x) * 4;
		let clickedColour = [
			originalImageData[clickedIndex],
			originalImageData[clickedIndex + 1],
			originalImageData[clickedIndex + 2],
			originalImageData[clickedIndex + 3]
		];

		// Everything which is the colour you clicked on is white
		// Everything else is black
		for (let yy = 0; yy < h; yy++) {
			for (let xx = 0; xx < w; xx++) {
				let i = (yy * w + xx) * 4;
				if (colourMatch(originalImageData, i, clickedColour, true)) {
					putColour(helperImageData, i, white);
				} else {
					putColour(helperImageData, i, black);
				}
			}
		}

		// Close gaps if we are wanted to close gaps
		if (neighbourhoodRadius) {
			let neighbourhood = new Uint8ClampedArray(4 * 4 * neighbourhoodRadius * neighbourhoodRadius);

			let halfThickness = Math.floor(thickness / 2);

			// Only bother checking the line points
			for (let l in linePoints) {
				let linePoint = linePoints[l];
				let xx = linePoint[0];
				let yy = linePoint[1];

				let i = (yy * w + xx) * 4;
				if (colourMatch(helperImageData, i, black, false)) {
					// Copy a neighbourhood around this point into the temp array
					copyNeighbourhood(helperImageData, neighbourhood, xx, yy, w, h, neighbourhoodRadius);

					// 1. Flood fill from this point with red
					simpleFill(neighbourhood, neighbourhoodRadius, neighbourhoodRadius, 2 * neighbourhoodRadius, red);

					// Draw a line from this point to that point (in the clone only)
					for (var ii = 0; ii < neighbourhood.length; ii++) {
						if (colourMatch(neighbourhood, ii, black, false)) {
							let nc = xx + (ii / 4) % (2 * neighbourhoodRadius) - neighbourhoodRadius;
							let nr = yy + Math.floor((ii / 4) / (2 * neighbourhoodRadius)) - neighbourhoodRadius;

							// Draw a line from xx/yy to nc/nr
							drawLine(helperImageData, black, [xx, yy], [nc, nr], w, h);
						}
					}
				}
			}
			// for (let yy = 0; yy < h; yy += halfThickness) {
			// 	for (let xx = 0; xx < w; xx += halfThickness) {
			// 		let i = (yy * w + xx) * 4;
			// 		if (colourMatch(helperImageData, i, black, false)) {
			// 			// Copy a neighbourhood around this point into the temp array
			// 			copyNeighbourhood(helperImageData, neighbourhood, xx, yy, w, h, neighbourhoodRadius);
			//
			// 			// 1. Flood fill from this point with red
			// 			simpleFill(neighbourhood, neighbourhoodRadius, neighbourhoodRadius, 2 * neighbourhoodRadius, red);
			//
			// 			// Draw a line from this point to that point (in the clone only)
			// 			for (var ii = 0; ii < neighbourhood.length; ii++) {
			// 				if (colourMatch(neighbourhood, ii, black, false)) {
			// 					let nc = xx + (ii / 4) % (2 * neighbourhoodRadius) - neighbourhoodRadius;
			// 					let nr = yy + Math.floor((ii / 4) / (2 * neighbourhoodRadius)) - neighbourhoodRadius;
			//
			// 					// Draw a line from xx/yy to nc/nr
			// 					drawLine(helperImageData, black, [xx, yy], [nc, nr], w, h);
			// 				}
			// 			}
			// 		}
			// 	}
			// }
		}

		// Fill out from the clicked point with black
		// Every time we paint, paint in both canvases
		var queue = [clickedIndex];
		while (queue.length) {
			// If this colour is white:
			// - paint it
			// - add neighbours
			let index = queue.shift();

			// Ignore if out of bounds
			if (index < 0)
				continue;
			if (index >= helperImageData.length)
				continue;

			// Ignore if not white
			if (! colourMatch(helperImageData, index, white, false))
				continue;

			putColour(helperImageData, index, black);
			putColour(originalImageData, index, fillColour);

			// Add the four neighbours, making sure we don't wrap around
			let  col = (index / 4) % w;
			if (col < w - 1)
				queue.push(index + 4);
			if (col > 0)
				queue.push(index - 4);
			queue.push(index - w * 4);
			queue.push(index + w * 4);
		}

		context.putImageData(originalImage, 0, 0);
	}
	return {
		create: function(element, options) {
			options = options || {};
			let thickness = options.thickness || 5;
			let closeGaps = options.closeGaps || 0;
			let width = options.width || 500;
			let height = options.height || 300;

			// Add sketchpad to this element
			element.innerHTML = `<div class="miro-wrapper">
			  <div class="controls">
			    <input type="color" />
					<img class="icon selected tool" data-tool="pencil" src="pencil.png">
					<img class="icon tool" data-tool="fill" src="bucket.png">
					<img class="icon bin" data-tool="fill" src="bin.png">
			  </div>

			  <canvas width="${width}px" height="${height}px"></canvas>
			</div>`;

			// Find the canvas
			let canvas = element.querySelector('canvas');

			// Setup
			let context = canvas.getContext('2d');
		  let click = false;
			let pointer = {x: 0, y: 0};
			let w = canvas.width;
			let h = canvas.height;
			let colour = "#000000";
			let tool = "pencil";

			clear(context, w, h);

		  window.addEventListener('mousedown', function(){
		    click = true;
		  });

		  window.addEventListener('mouseup', function(){
		    click = false;
		  });

			canvas.addEventListener('mousedown', function(e){
				pointer.x = e.pageX;
				pointer.y = e.pageY;
				if (tool == "pencil") {
					draw(e.pageX, e.pageY, canvas, context, colour, thickness);
				} else if (tool == "fill") {
					fill(e.pageX, e.pageY, w, h, canvas, context, colour, thickness, closeGaps);
				}
		  });

		  canvas.addEventListener('mouseup', function(e){
				if (tool == "pencil") {
		    	draw(e.pageX, e.pageY, canvas, context, colour, thickness);
				}
		  });

		  canvas.addEventListener('mousemove', function(e){
		    if(click === true && tool == "pencil") {
					// Draw dots all the way to the target!
					var dx = e.pageX - pointer.x;
					var dy = e.pageY - pointer.y;
					var dist = Math.sqrt(dx*dx + dy*dy);
					var steps = 1 + dist / 5;
					for (var i = 0; i < steps; i++) {
						pointer.x += dx/steps;
						pointer.y += dy/steps;
						draw(pointer.x, pointer.y, canvas, context, colour, thickness);
					}
					pointer.x = e.pageX;
					pointer.y = e.pageY;
		    }
		  });

			// Tool selection
			let tools = element.querySelectorAll('.tool');
			for (var i = 0; i < tools.length; i++) {
				let t = tools[i];
				t.addEventListener('click', function(e) {
					// Deselect all tools...
					for (var j = 0; j < tools.length; j++) {
						tools[j].classList.remove("selected");
					}
					// Select this tool
					t.classList.add("selected");
					tool = t.getAttribute('data-tool');
				});
			}

			// Colour selection
			let colourPicker = element.querySelector('input');
			colourPicker.addEventListener('change', function(e) {
				colour = colourPicker.value;
			});

			// Bin
			let bin = element.querySelector('.bin');
			bin.addEventListener('click', function(e) {
				clear(context, w, h);
			});
		}
	};
})();
