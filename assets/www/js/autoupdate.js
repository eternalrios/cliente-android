'use strict';

(function (cordova) {
	var head = document.getElementsByTagName('head')[0];
	var now = Date.now();

	// All errors seem to originate from Android Browser 4.1-4.4
	if (!window.performance || !window.performance.now) {
		var startTimestamp = Date.now();
		window.performance = window.performance || {};
		window.performance.now = function now() {
			return Date.now() - startTimestamp;
		};
	}

	var loader;
	var assetLoader;
	var isLoaded = false;
	var splashscreen;

	function resetServer() {
		//TODO: show a proper page (html or image)
		var errorMsg = 'Server cannot be reached.';
		// window.Connection is provided by cordova-plugin-network-information.
		if (window.navigator.connection.type === window.Connection.NONE || !window.navigator.onLine) {
			errorMsg += ' Check your internet connection.';
		}
		setTimeout(function () {
			// window.navigator.notification is provided by cordova-plugin-dialogs.
			window.navigator.notification.alert(errorMsg, function () {
				loader.reset();
			}, window.APPLICATION_NAME_DISPLAY, 'Ok');
		}, 0);
	}

	// Load Files
	function loadFile(src, id) {
		if (!src) {
			return;
		}
		id = 'source_' + id;
		var el;
		var hasSource = document.getElementById(id);
		if (hasSource) {
			// prevent to load multiple time the same source
			return;
		}
		// Load javascript
		if (src.substr(-3) === '.js') {
			el = document.createElement('script');
			el.type = 'text/javascript';
			el.src = src + '?' + now;
			el.async = false;
			// Load CSS
		} else if (src.substr(-4) === '.css') {
			el = document.createElement('link');
			el.rel = 'stylesheet';
			el.href = src + '?' + now;
			el.type = 'text/css';
		} else {
			console.error('Format not handled', src);
		}
		el.setAttribute('id', id);
		head.appendChild(el);
	}


	function check() {
		console.log('Looking for update');
		// Check if there is an update compared to the manifest in cache
		return loader.check().then(function () {
			if (loader.corruptNewManifest) {
				return loader.reset();
			}
			return loader.download();
		}).then(function () {
			var hasUpdate = loader.update(false);
			console.log('Update available:', hasUpdate);
			if (isLoaded) {
				// If update detected while in game
				if (hasUpdate) {
					window.cordova.fireDocumentEvent('sourceUpdated');
				}
			}
			isLoaded = true;
		});
	}


	function setupLoader(currentServer) {
		window.appInfo.server = currentServer;
		loader = window.loader = new AppLoader('source', {
			localRoot: 'js/',
			serverRoot: currentServer,
			mode: 'mirror',
			cacheBuster: true
		});
		assetLoader = new AppLoader('ui', {
			localRoot: '',
			serverRoot: currentServer,
			mode: 'mirror',
			cacheBuster: true,
			manifest: 'assetMap.json'
		});

		var loadingProgress = new window.AppLoadingProgress();

		var currentProgress = 0;
		function onProgress(status) {
			if (status.percentage > currentProgress) {
				loadingProgress.setProgress(status.percentage);
				currentProgress = status.percentage;
			}
		}

		check()
			.then(function () {
				splashscreen.hide();
				return assetLoader.check().then(function (needUpdate) {
					if (assetLoader.corruptNewManifest) {
						return assetLoader.reset();
					}
					if (!needUpdate) {
						return;
					}
					loadingProgress.show('Downloading User Interface');
					return assetLoader.download(onProgress);
				}).then(function () {
					assetLoader.update(false);
					loadingProgress.destroy();
				}).catch(loadingProgress.destroy);
			}).then(function () {
				// Load the files from the server's manifest

				for (var fileId in loader.manifest.files) {
					var file = loader.manifest.files[fileId];
					var uri = loader.cache.toInternalURL(file.filename);
					console.log('Loading file:', file.filename, uri);
					if (uri.indexOf('cdvfile://') !== 0) {
						throw(new Error('File not local' + uri));
					}
					loadFile(uri, fileId);
				}
			})
			.catch(resetServer);

		document.addEventListener('resume', function () {
			check()
				.then(splashscreen.hide)
				.catch(resetServer);
		});
	}

	function start() {
		// For debug
		// window.onerror = function (message, url, lineno, colno, error) {
		// 	console.error(message + ' ' + url + ' ' + lineno + ' ' + colno + ' ' + error);
		// };
		// var consoleLog = window.console || {};
		// consoleLog.info = function () {
		// 	var str = Array.prototype.slice.call(arguments).join(' ');
		// 	alert('info: ' + str);
		// };
		// consoleLog.error = function () {
		// 	var str = Array.prototype.slice.call(arguments).join(' ');
		// 	alert('error: ' + str);
		// };
		// consoleLog.warn = function () {
		// 	var str = Array.prototype.slice.call(arguments).join(' ');
		// 	alert('warn: ' + str);
		// };
		// consoleLog.log = function () {
		// 	var str = Array.prototype.slice.call(arguments).join(' ');
		// 	alert('log: ' + str);
		// };
		splashscreen = window.navigator.splashscreen;
		splashscreen.show();
		cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
		window.StatusBar.hide();

		window.navigator.appInfo.getAppInfo(function (appInfo) {
			window.appInfo = appInfo;
			window.AppSettings.get(function (settings) {
				setupLoader(settings.server);
			}, function (e) {
				console.error(e);
				window.alert('Could not load local settings');
			}, ['server']);
		});
		document.addEventListener('pause', splashscreen.show);
	}

	document.addEventListener('deviceready', start, false);
	// For debug
	// window.addEventListener('cordovacallbackerror', function (msg) {
	// 	console.error('cordovacallbackerror: ' + msg.message);
	// }, false);
})(window.cordova);
