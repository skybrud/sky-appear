// Only include intersection observer in browser env
if (typeof window !== 'undefined') {
	require('intersection-observer');
}

// Keep manual list of observed items in order to execute callbacks
// from Vue directive (via binding.value)
var _observed = [];

// Get helper
function _getObserved(element) {
	return _observed
		.find(function (item) { return item.element === element; });
}

// Add helper
function _addObserved(element, callback) {
	_observed.push({
		element: element,
		callback: callback,
	});
}

// Remove helper
function _removeObserved(element) {
	var observedItem = _getObserved(element);

	if (observedItem) {
		var index = _observed.indexOf(observedItem);
		_observed.splice(index, 1);
	}
}

// Appear method
function _appear(element) {
	element.classList.add('appear');
	var observedItem = _getObserved(element);
	if (observedItem
		&& observedItem.callback
		&& observedItem.callback instanceof Function) {
		observedItem.callback();
	}
}

function install(Vue, userOptions) {
	if (install.installed === true) {
		return;
	}

	var options = Object.assign(
		{
			delay: false, // whether to delay appear or not
			delayFunction: function (entry) { return entry.intersectionRect.top / entry.rootBounds.height * 50; }, // how much to delay (default based on y pos)
		},
		userOptions
	);

	// Instantiate observer
	var observer = typeof window === 'undefined'
		? null
		: new IntersectionObserver(function (entries, obs) {
			entries.forEach(function (entry) {
				if (entry.isIntersecting) {
					setTimeout(function () {
						_appear(entry.target);
					}, options.delay ? options.delayFunction(entry) : 0);
					obs.unobserve(entry.target);
				}
			});
		});

	var observe = function (el, callback) {
		_addObserved(el, callback);
		observer.observe(el);
	};

	var unobserve = function (el) {
		observer.unobserve(el);
		_removeObserved(el);
	};

	Vue.directive('sky-appear', {
		inserted: function inserted(el, binding) {
			el.classList.add('sky-appear');
			if (observer) {
				observe(el, binding.value);
			} else {
				el.classList.add('appear');
			}
		},
		unbind: function unbind(el) {
			if (observer) {
				unobserve(el);
			}
		},
	});
}

export default install;
