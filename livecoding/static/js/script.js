/* Author:
	Gabriel Florit
*/

var aigua = (function () {

	var token = null;

	return {

		askBeforeNew: function() {
			var result = aigua.isDirty() ? confirm(aigua.areYouSureText) : true;

			if (result) {
				aigua.resetScreen();
				aigua.resetUrl();
				aigua.resetMenu();
			}
		},

		getOAuthToken: function() {
			return token;
		},

		getUrlGistId: function(url) {

			var a = document.createElement('a');
			a.href = url;

			var gistId = a.pathname.split('/')[1];

			return (gistId.length > 0 && gistId != '!') ? gistId : null;
		},

		isDirty: function() {
			return $('.dirty').css('visibility') == 'visible';
		},

		isHexString: function(value) {

			return /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(value);
		},

		loadGist: function(gistId) {

			aigua.isLoading = true;

			aigua.resetScreen();
			aigua.resetMenu();
			aigua.setToClean();

			$.ajax({
				url: 'https://api.github.com/gists/' + gistId + '?callback=?',
				dataType: 'json',
				success: function (data) {

					var js = data.data.files['water.js'];
					var css = data.data.files['water.css'];

					aigua.switchMode('css', true);

					if (css) {
						aigua.codeMirror.setValue(css.content);
					}

					aigua.switchMode('javascript');

					if (js) {
						aigua.codeMirror.setValue(js.content);
						aigua.codeMirror.setValue(js.content); // don't know why i have to do this twice
					}

					aigua.setUrl(gistId);

					aigua.isLoading = false;
				}
			});

		},

		// modify a number by a certain distance
		// e.g. modifyNumber(5.89, 10) = 5.89 + 10 * 0.1
		// e.g. modifyNumber(58.9, 20) = 58.9 + 20 * 1
		modifyNumber: function(number, distance) {

			var parts;
			var exponent;
			var factor;
			var result;
			var decimalPlaces;

			// say we have a number: 5.89
			// we first calculate its exponent: 0
			parts = number.toExponential().split('e');
			exponent = Number(parts[1]);

			// next we subtract 1 from the exponent: -1
			exponent = exponent - 1;

			// then we calculate our desired factor: 10^-1 = 0.1
			factor = Math.pow(10, exponent);

			// next we modify the number by the distance
			result = number + distance * factor;

			// finally we make sure not to add rounding errors
			// how many decimal places does the factor (0.1) have?
			decimalPlaces = (factor.toString().split('.')[1] || "").length;

			// round to that many decimal places (2)
			return d3.round(result, decimalPlaces);
		},

		// run the code and update the display
		renderCode: function() {

			if (aigua.screenLayouts[aigua.currentScreenLayoutIndex] == 'sketchpad mode') {
				$('svg').attr('class', '');
			} else {
				$('svg').attr('class', 'full');
			}

			// get the current code
			var code = aigua.codeMirror.getValue();

			try {

				switch (aigua.modes[aigua.currentModeIndex].name) {

					case 'javascript':

						// clear out the display contents
						$('svg').empty();

						// run the code
						eval(code);

					break;

					case 'css':

						// if we're on the css tab, don't eval the code - no need
						$('#aiguaStyle').get(0).textContent = code;
					break;

				}

			}
			catch (error) {}
			finally {}
		},

		// reset bar position and width:
		// center bar over the token
		// set bar width to default starting width
		resetBar: function(markerCenter) {
			aigua.bar.width(aigua.startingBarWidth);
			aigua.bar.css('left', markerCenter - aigua.startingBarWidth/2 - aigua.borderWidth);
			aigua.filler.removeClass('filler-edge-left');
			aigua.filler.removeClass('filler-edge-right');
		},

		resetMenu: function() {

			var menu = $('#menu');
			$('ul', menu).hide(); // hide all the dropdowns
			$('h2', menu).removeClass('hover'); // remove hover class from all the h2's
		},

		resetScreen: function() {

			aigua.switchMode('javascript', true);
			aigua.codeMirror.setValue('');
			aigua.switchMode('css', true);
			aigua.codeMirror.setValue('');
			aigua.switchMode('javascript');

			$('svg').remove();
			$('#display').append('<svg></svg>');
		},

		resetUrl: function() {
			history.pushState(null, null, '!');
			$('#gist').attr('href', '');
			$('#gist').html('');
		},

		respondToKey: function(cm) {

			var cursor;
			var token;
			var startCoords;
			var endCoords;
			var center;
			var hex;

			// is the slider and mini colors hidden?
			if (!aigua.slider.is(':visible') && !$(aigua.miniColorsSelector).is(':visible')) {

				// grab the current token
				cursor = cm.getCursor();
				token = cm.getTokenAt(cursor);

				// are we on js mode?
				if (aigua.modes[aigua.currentModeIndex].name == 'javascript') {

					// are we on a number?
					if (token.className == 'number') {

						if (aigua.pulseNumbers) {

							// stop pulsing numbers
							window.clearInterval(aigua.pulseNumbersInterval);
							window.clearInterval(aigua.pulseMessageInterval);
							$('#message').hide();
							aigua.pulseNumbers = false;
						}

						// show the slider
						aigua.slider.show();

						// save the original number
						if (aigua.originalNumber == null) {
							aigua.originalNumber = Number(token.string);
						}

						// select token
						aigua.currentSelectionStart = {line: cursor.line, ch: token.start};
						aigua.currentSelectionEnd   = {line: cursor.line, ch: token.end};
						cm.setSelection(aigua.currentSelectionStart, aigua.currentSelectionEnd);

						// find coords at token start
						startCoords = cm.cursorCoords(true);
						endCoords = cm.cursorCoords(false);

						// center marker on token
						center = startCoords.x + (endCoords.x - startCoords.x)/2;
						aigua.marker.css('left', center);

						// center handle on token
						aigua.handle.css('left', center - aigua.handle.width()/2);

						// center bar above token
						aigua.bar.css('left', center - aigua.bar.width()/2 - aigua.borderWidth);
						aigua.bar.css('top', startCoords.y - aigua.lineHeight);

						// center triangle on token
						aigua.triangle.css('left', center - aigua.triangleWidth);
						aigua.triangle.css('top', aigua.bar.offset().top + aigua.bar.height() + aigua.borderWidth * 2);

						aigua.ball.offset({top: aigua.filler.offset().top});
					
					}
				}

				if (token.string.length > 1) {

					switch (aigua.modes[aigua.currentModeIndex].name) {

						case 'javascript':
							hex = token.string.substring(1, token.string.length - 1);
							aigua.currentSelectionStart = {line: cursor.line, ch: token.start + 1};
							aigua.currentSelectionEnd   = {line: cursor.line, ch: token.end - 1};
						break;

						case 'css':
							hex = token.string;;
							aigua.currentSelectionStart = {line: cursor.line, ch: token.start};
							aigua.currentSelectionEnd   = {line: cursor.line, ch: token.end};
						break;
					}

					// is this a hex?
					if (!aigua.isHexString(hex)) {
						return;
					}

					if (aigua.pulseColors) {

						// stop pulsing colors
						window.clearInterval(aigua.pulseColorsInterval);
						window.clearInterval(aigua.pulseMessageInterval);
						$('#message').hide();
						aigua.pulseColors = false;
					}

					// select token
					cm.setSelection(aigua.currentSelectionStart, aigua.currentSelectionEnd);

					// show the color picker
					aigua.miniColorsTrigger.click();

					// initialize color picker with current color
					$('#hidden-miniColors').miniColors('value', hex.substring(1));

					// find coords at token start
					startCoords = cm.cursorCoords(true);
					endCoords = cm.cursorCoords(false);
					center = startCoords.x + (endCoords.x - startCoords.x)/2;

					// position color picker centered below token
					$(aigua.miniColorsSelector).css('left', center - $(aigua.miniColorsSelector).width()/2);
					$(aigua.miniColorsSelector).css('top', endCoords.y + aigua.lineHeight);
				}
			}
		},

		saveAnonymously: function() {

			var js;
			var css;
			var postData;

			if (aigua.modes[aigua.currentModeIndex].name == 'javascript') {
				js = aigua.codeMirror.getValue();
				css = _.find(aigua.modes, function(value) {
					return value.name == 'css';
				}).code;
			}
			else {
				css = aigua.codeMirror.getValue();
				js = _.find(aigua.modes, function(value) {
					return value.name == 'javascript';
				}).code;
			}

			postData = {
				'css': css,
				'js': js
			};

			$.post('/save-anonymously', postData, function(data) {

				var a;
				a = document.createElement('a');
				a.href = data;
				aigua.setUrl(a.pathname.split('/')[1]);
				aigua.setToClean();
			});
		},

		setOAuthToken: function(oauthToken) {
			token = oauthToken;
		},

		setToClean: function() {
			$('.dirty').css('visibility', 'hidden');
		},

		setToDirty: function() {
			$('.dirty').css('visibility', 'visible');
		},

		setUrl: function(gistId) {
			history.pushState(null, null, gistId);

			var gistBaseUrl = 'https://gist.github.com/';
			gistUrl = gistBaseUrl + gistId;

			$('#gist').attr('href', gistUrl);
			$('#gist').html(gistUrl);
		},

		switchMode: function(mode, noTab) {

			// pause aigua: disable code evals from happening on codemirror changes
			aigua.pause = true;

			// if noTab is true, don't highlight/dehighlight the mode tabs
			if (!noTab) {

				$('#modes h2').not(":contains('" + mode + "')").addClass('passive');
				$('#modes h2').not(":contains('" + mode + "')").removeClass('active');
				$("#modes h2:contains('" + mode + "')").addClass('active');
				$("#modes h2:contains('" + mode + "')").removeClass('passive');
			}

			// save current code to this mode's 'code' property
			aigua.modes[aigua.currentModeIndex].code = aigua.codeMirror.getValue();

			// set current mode index to new mode
			aigua.currentModeIndex = _.indexOf(_.pluck(aigua.modes, 'name'), mode);

			// populate the code mirror tab with the new mode's code
			aigua.codeMirror.setValue(aigua.modes[aigua.currentModeIndex].code || '');

			// change codemirror's language syntax to the new mode
			aigua.codeMirror.setOption("mode", aigua.modes[aigua.currentModeIndex].name);
			CodeMirror.autoLoadMode(aigua.codeMirror, aigua.modes[aigua.currentModeIndex].name);

			aigua.pause = false;
		},

		updateScreenLayout: function() {

			if (aigua.screenLayouts[aigua.currentScreenLayoutIndex] == 'sketchpad mode') {
				$('#main').find('*').removeClass('full horizontal');
			} else {
				$('#main').find('*').addClass('full');

				if (aigua.screenLayouts[aigua.currentScreenLayoutIndex] == 'fullscreen mode (horizontal)') {
					$('#main').find('*').addClass('horizontal');
				}
				else {
					$('#main').find('*').removeClass('horizontal');
				}
			}

			// render the javascript code
			// but we can't simply call aigua.renderCode(), because
			// if we're on css mode, it doesn't actually render code
			// so we either (1) force it by passing an extra param to aigua.renderCode()
			// or (2) we do it right here
			// or (3) we create a global variable, like aigua.pause,
			// and turn it on, run renderCode(), then turn it off

			// we'll choose (2) - do it right here

			// if we're on javascript mode, call rendercode
			if (aigua.modes[aigua.currentModeIndex].name == 'javascript') {
				aigua.renderCode();
			}
			// not javascript mode
			else {
				// switch modes to javascript, without tabbing
				aigua.switchMode('javascript', true);
				// render code
				aigua.renderCode();
				// switch back to css
				aigua.switchMode('css', true);
			}
		},

		areYouSureText: 'Are you sure? You will lose any unsaved changes.',
		ball: null,
		bar: null,
		borderWidth: 2,
		miniColorsSelector: '.miniColors-selector',
		miniColorsTrigger: null,
		currentModeIndex: 1,
		currentScreenLayoutIndex: 0,
		currentSelection: null,
		filler: null,
		handle: null,
		isLoading: null,
		key: null,
		lineHeight: 19,
		marker: null,
		modes: [
			{
				name: 'javascript',
				code: null
			}, {
				name: 'css',
				code: null
			}
		],
		originalNumber: null,
		pause: false,
		pulseColors: true,
		pulseColorsInterval: null,
		pulseMessageInterval: null,
		pulseNumbers: true,
		pulseNumbersInterval: null,
		screenLayouts: ['sketchpad mode', 'fullscreen mode (vertical)', 'fullscreen mode (horizontal)'],
		slider: null,
		startingBarWidth: 300,
		triangle: null,
		triangleHeight: 5,
		triangleWidth: 12

	}
}());

$(function() {

	// ----------- initialization section ---------------------- 

	// do we support this browser?
	if (!(BrowserDetect.browser == 'Chrome' || BrowserDetect.browser == 'Firefox'
		|| BrowserDetect.browser == 'Safari')) {

		// we don't - show the 'sorry, upgrade your browser' dialog
		$('#browsermessage').fadeIn(1000);

	// we do support this browser! 
	} else {

		var extraKeys = {};
		var gistId;
		aigua.key = {};

		// setup the key correctly (mac/linux/windows)
		// aigua.key.Name: CodeMirror will listen for this key - it's the key that triggers slider/color picker
		// aigua.key.DisplayName: we display this string to the user - it's to inform them of what key to use
		if (BrowserDetect.OS == 'Mac') {
			aigua.key.Name = 'Alt-Alt'; 
			aigua.key.DisplayName = 'Alt'; 
			aigua.key.Code = 18;

			{extraKeys['Alt-S'] = aigua.saveAnonymously};
		}
		
		if (BrowserDetect.OS == 'Linux') {
			aigua.key.Name = 'Ctrl';
			aigua.key.DisplayName = 'Ctrl';
			aigua.key.Code = 17;

			{extraKeys['Ctrl-S'] = aigua.saveAnonymously};
		}
		
		if (BrowserDetect.OS == 'Windows') {
			aigua.key.Name = 'Ctrl-Ctrl';
			aigua.key.DisplayName = 'Ctrl';
			aigua.key.Code = 17;

			{extraKeys['Ctrl-S'] = aigua.saveAnonymously};
		}

		// display the key DisplayName to the user - 'Alt', or 'Ctrl', etc
		$('#message .key').text(aigua.key.DisplayName);
		
		// this object will be used by codemirror to respond to THE key
		{extraKeys[aigua.key.Name] = aigua.respondToKey};

		// initialize mini colors
		$('#hidden-miniColors').miniColors({

			// when we change a color, replace the old hex string
			// in codemirror with this new color
			change: function(hex, rgb) {
				aigua.codeMirror.replaceSelection(hex.toUpperCase());
			}

		});

		// set various dom elements
		aigua.ball = $('#ball');
		aigua.bar = $('#bar');
		aigua.filler = $('#filler');
		aigua.handle = $('#handle');
		aigua.marker = $('#marker');
		aigua.slider = $('#slider');
		aigua.triangle = $('#triangle');
		aigua.miniColorsTrigger = $('.miniColors-trigger');

		// set the handle's default width
		aigua.handle.width(aigua.startingBarWidth);

		// set the bar's border width and default width
		aigua.bar.css('border-width', aigua.borderWidth);
		aigua.bar.width(aigua.startingBarWidth);

		// set the triangle
		aigua.triangle.css('border-width', aigua.triangleHeight + 'px ' + aigua.triangleWidth + 'px 0px ' + aigua.triangleWidth + 'px');

		// create codemirror instance
		aigua.codeMirror = CodeMirror($('#code').get(0), {

			// listen for a change in the codemirror's contents
			onChange: function(cm, e) {

				// if aigua.pause is true, don't do anything when the code changes
				if (!aigua.pause) {

					// if we've modified the code, set the 'dirty' flag (the green dot)
					// but don't do that when we're loading the code
					if (!aigua.isLoading) {
						aigua.setToDirty();
					}

					// call render code every time we change the code's contents
					// this will re-render the code contents and display the results
					// on the display panel
					aigua.renderCode();
				}
			},

			// this object holds a reference to THE key we defined above
			extraKeys: extraKeys,

			// show line numbers
			lineNumbers: true,

			// match closing brackets
			matchBrackets: true,

			// set default mode to javascript
			mode:  'javascript',

			// tell codemirror where to find javascript mode assets
			modeURL: '/mode/%N.js',

			// allow code modifications
			readOnly: false,

			// set the theme (a decent twilight-lookalike)
			theme: 'lesser-dark'
		});

		// try to grab the gist id from the url
		// e.g. the '3072416' bit in http://livecoding.gabrielflor.it/3072416
		gistId = aigua.getUrlGistId(location.href);

		// is there an id in the url?
		if (gistId) {

			// yes - load its contents
			aigua.loadGist(gistId);

			// and then do a slow fade in
			$('#main').fadeIn(1000);
		} else {

			// no gist - load the first example
			aigua.loadGist($("#menu .item h2:contains('examples') + ul li:first").attr('rel'));

			// and then do a slow fade in
			$('#main').fadeIn(1000);
		}

		// show the 'click a number' message
		$('#message').show();

		// pulse the message
		aigua.pulseMessageInterval = setInterval(function() {
			$('#message').animate({opacity: 0.5}).animate({opacity: 1});
		}, 1000);

		// pulse colors (e.g. '#CF2626' or '#FFF')
	 	aigua.pulseColors = true;
		aigua.pulseColorsInterval = setInterval(function() {
			switch (aigua.modes[aigua.currentModeIndex].name) {

				// if we're on the javascript tab, colors will be
				// in a <span class='cm-string'></span>
				case 'javascript':
					$('.cm-string').filter(function(index) {

						// check the string (using a regular expression)
						// to make sure it's a valid color hex
						// but first, remove the first and last characters,
						// which will be either single or double quotes
						var token = $(this).text();
						return token.length > 1 && aigua.isHexString(token.substring(1, token.length - 1));

					}).animate({opacity: 0.5}).animate({opacity: 1});
				break;

				// if we're on the css tab, colors will be
				// in a <span class='cm-atom'></span> element
				case 'css':
					$('.cm-atom').filter(function(index) {

						// check the string (using a regular expression)
						// to make sure it's a valid color hex
						// no need to remove the first and last characters
						var token = $(this).text();
						return token.length > 1 && aigua.isHexString(token);

					}).animate({opacity: 0.5}).animate({opacity: 1});
				break;
			}

		}, 1000);
		
		// pulse numbers
	 	aigua.pulseNumbers = true;
		aigua.pulseNumbersInterval = setInterval(function() {
			switch (aigua.modes[aigua.currentModeIndex].name) {

				// this is pretty convenient - codemirror will wrap numbers
				// in a <span class='cm-number'></span> element
				case 'javascript':
					$('.cm-number').animate({opacity: 0.5}).animate({opacity: 1});
				break;
			}

		}, 1000);

		// initialize slider
		aigua.handle.draggable({

			// only allow dragging along the x-axis
			axis: 'x',
			
			drag: function(ui, event) {

				var position = event.position.left + aigua.handle.width()/2;
				var markerCenter = aigua.marker.offset().left;
				var offset = position - markerCenter;
				var newNumber;

				// calculate the new number based on the original number
				// plus the dragging offset
				newNumber = aigua.modifyNumber(aigua.originalNumber, offset);

				// replace the selection with the new number
				aigua.codeMirror.replaceSelection(String(newNumber));

				// is the dragging cursor to the right of the marker?
				if (offset > 0) {

					// if the left bar got stuck, reset the bar width and position
					if (markerCenter - aigua.bar.offset().left - aigua.borderWidth > aigua.startingBarWidth/2) {
						aigua.resetBar(markerCenter);
					}

					// set the filler width and position
					aigua.filler.width(offset);
					aigua.filler.css('left', aigua.startingBarWidth/2);

					// are we dragging past the initial bar width?
					if (offset > aigua.startingBarWidth/2 - 6) {

						// set bar right edge to dragging position
						aigua.bar.width(position - aigua.bar.offset().left + 5);
					}

					// reset the width, since fast drags won't trigger a drag call every pixel.
					else {
						aigua.resetBar(markerCenter);

						// show the ball
						aigua.ball.show();
					}

				// is the dragging cursor to the left of the marker?
				} else if (offset < 0) {

					// set the filler width
					aigua.filler.width(-offset);

					// adjust the filler position
					aigua.filler.css('left', aigua.startingBarWidth/2 - -offset + aigua.borderWidth/2);

					// are we dragging past the initial bar width?
					if (-offset > aigua.startingBarWidth/2 - 6) {

						// adjust the filler position
						aigua.filler.css('left', aigua.borderWidth/2 + 7);

						// set bar left edge to dragging position
						aigua.bar.width(-offset + aigua.startingBarWidth/2 + 7);
						aigua.bar.css('left', position - aigua.borderWidth - 7);
					}

					// reset the width, since fast drags won't trigger a drag call every pixel.
					else {
						aigua.resetBar(markerCenter);

						// show the ball
						aigua.ball.show();
					}

				// are we at the middle?
				} else {
					aigua.filler.width(0);
				}
			}
		});

		// populate mode switcher
		_.each(aigua.modes, function(mode, index) {

			var div = $("<div class='item'></div>");
			var h2 = $("<h2></h2>");
			div.append(h2);

			h2.addClass(index == aigua.currentModeIndex ? 'active' : 'passive');
			h2.text(mode.name);

			$('#modes').append(div);
		});

		// populate screen layout switcher
		_.each(aigua.screenLayouts, function(layout, index, list) {

			var li = $('<li />');
			li.text(layout);
			li.addClass(index == aigua.currentScreenLayoutIndex ? 'disabled' : '');

			$('#menu .item h2:contains("view")').next().append(li);
		});


		// ----------- event handlers section ----------------------

		// if we mouseup, and the slider is showing, AND nothing is selected,
		// select the previously selected token
		$(window).mouseup(function(e) {

			if (aigua.slider.is(':visible') && aigua.codeMirror.getSelection() == '') {
				aigua.codeMirror.setSelection(aigua.currentSelectionStart, aigua.currentSelectionEnd);
			}
		});

		// did we keyup the handle key?
		$(window).keyup(function(e) {

			if (e.which == aigua.key.Code) {

				// if slider is visible
				if (aigua.slider.is(':visible')) {
	
					// hide the slider
					aigua.slider.hide();

					// reset filler width
					aigua.filler.width(0);

					// reset bar width
					aigua.bar.width(aigua.startingBarWidth);

					// clear out the original number
					aigua.originalNumber = null;
				}

				// if mini colors is visible
				if ($(aigua.miniColorsSelector).is(':visible')) {

					// trigger an event which will hide mini colors
					$(document).trigger('mousedown');
				}
			}
		});

		// force svg contents to occupy the entire svg container
		// by rerendering code on window resize
		$(window).on('resize', function() {
			aigua.renderCode();
		});

		// handle modes switcher
		$('#modes .item h2').on('click', function(e) {
			aigua.switchMode($(this).text());
		});

		// handle menu mouseover/mouseout events
		$('#menu .item h2').on('mouseover', function(e) {
			var item = $(this).parents('.item');

			$('ul', item).show(); // show this dropdown
			$(this).addClass('hover'); // add hover class to this h2
		});

		// handle menu mouseover/mouseout events
		$('#menu .item').on('mouseout', function(e) {

			if ($(e.relatedTarget).parents('.item').get(0) != $(this).get(0)) {
				aigua.resetMenu();
			}
		});

		// handle menu mouseover/mouseout events
		$('#menu .item li').on('mouseover', function(e) {
			var li = $(this);

			if (li.attr('class') && li.attr('class').indexOf('disabled') != -1) {

			} else {
				li.addClass('hover');
			}
		});

		// handle menu mouseover/mouseout events
		$('#menu .item li').on('mouseout', function(e) {
			$(this).removeClass('hover');
		});

		// handle clicking on title
		$('#header').on('click', function(e) {

			e.preventDefault();

			// ask user 'are you sure' before wiping the codemirror contents
			aigua.askBeforeNew();
		});

		// handle menu item choices
		$('#menu .item ul li').on('click', function(e) {
			e.preventDefault();

			var choice = $(this);
			var itemName = $('h2', choice.parents('.item')).text();
			var result;
			
			switch(itemName) {
				case 'file':
					switch (choice.text()) {
						case 'new':
							aigua.askBeforeNew();
						break;

						case 'savewhat is this?':
							result = confirm('Login to GitHub to save your work under your username.');
							if (result) {
								open('/github-login', 'popup', 'width=1015,height=500');
							}
						break;

						case 'save anonymously':
							aigua.saveAnonymously();
							aigua.resetMenu();
						break;
					}
				break;

				case 'examples':
					result = aigua.isDirty() ? confirm(aigua.areYouSureText) : true;
					if (result) {
						aigua.loadGist($(this).attr('rel'));
					}
				break;

				case 'view':

					$(this).siblings().removeClass('disabled');
					$(this).addClass('disabled');

					aigua.currentScreenLayoutIndex = _.indexOf(aigua.screenLayouts, $(this).text());
					aigua.updateScreenLayout();
					aigua.resetMenu();
				break;

				case 'help':

					switch (choice.text()) {

						case 'source code':
							window.open('https://github.com/gabrielflorit/livecoding/', '_blank');
							aigua.resetMenu();
						break;

						case 'contact':
							window.open('http://twitter.com/gabrielflorit', '_blank');
							aigua.resetMenu();
						break;

					}

				break;
			}
		});
	}

});

