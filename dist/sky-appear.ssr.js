'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

// Only include intersection observer in browser env
if (typeof window !== 'undefined') {
	require('intersection-observer');
}

// Keep manual list of observed items in order to execute callbacks
// from Vue directive (via binding.value)
const _observed = [];

// Get helper
function _getObserved(element) {
	return _observed
		.find(item => item.element === element);
}

// Add helper
function _addObserved(element, callback) {
	_observed.push({
		element,
		callback,
	});
}

// Remove helper
function _removeObserved(element) {
	const observedItem = _getObserved(element);

	if (observedItem) {
		const index = _observed.indexOf(observedItem);
		_observed.splice(index, 1);
	}
}

// Appear method
function _appear(element) {
	element.classList.add('appear');
	const observedItem = _getObserved(element);
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

	const options = Object.assign({
		delay: true, // whether to delay appear or not
		delayFunction: entry => entry.intersectionRect.top / entry.rootBounds.height * 50, // how much to delay (default based on y pos)
	}, userOptions);
	// Instantiate observer
	const observer = (typeof window !== 'undefined')
		? new IntersectionObserver((entries, obs) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					setTimeout(() => {
						_appear(entry.target);
					}, options.delay ? options.delayFunction(entry) : 0);
					obs.unobserve(entry.target);
				}
			});
		})
		: null;

	const observe = (el, callback) => {
		_addObserved(el, callback);
		observer.observe(el);
	};

	const unobserve = (el) => {
		observer.unobserve(el);
		_removeObserved(el);
	};

	Vue.directive('sky-appear', {
		inserted(el, binding) {
			el.classList.add('sky-appear');
			if (observer) {
				observe(el, binding.value);
			} else {
				el.classList.add('appear');
			}
		},
		unbind(el) {
			if (observer) {
				unobserve(el);
			}
		},
	});
}

exports.default = install;
