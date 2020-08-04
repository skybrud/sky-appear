// The default values for the options property
var defaultOptions = {
	appearOnce: true,
	initState: 'inside',
	classless: false,
	triggerEvents: [],
	root: null,
	rootMargin: '0px 0px 0px 0px',
	thresholds: [0],
	delay: 0,
};

var script = {
	name: 'SkyAppear',
	///////////////////////////////////// variables
	props: {
		active: {
			type: Boolean,
			default: true,
		},
		direction: {
			type: String,
			default: 'block',
		},
		options: {
			type: Object,
			default: function () { return defaultOptions; },
		},
	},
	data: function data() {
		var state = this.options.initState || defaultOptions.initState;
		return {
			state: state,
			statePrevious: state,
			activeOverwrite: true,
			activeTriggerEvents: [],
			// Deliverables
			intersectionRatio: (state === 'inside') * 1,
			isBeforeViewport: state === 'before',
			isAfterViewport: state === 'after',
			// Observer and classes
			observer: null,
			previousEl: null,
			classList: this.options.classless ? [] : ['sky-appear'],
			// Delaying system
			timeout: null,
			frameRequest: null,
			lastTime: 0,
			isIntersectingStored: state === 'inside',
		};
	},
	computed: {
		computedActive: function computedActive() {
			// Activeness set by both prop and internal data
			return this.active && this.activeOverwrite;
		},
		computedAppearOnce: function computedAppearOnce() {
			// So that it can be watched
			return this.computedOptions.appearOnce;
		},
		computedTriggerEvents: function computedTriggerEvents() {
			if (!this.active) {
				return [];
			}

			// Transform all trigger events to objects
			var _window = {};
			if (typeof window !== 'undefined') {
				_window = window;
			}
			return this.computedOptions.triggerEvents.map(function (item) {
				if (typeof item === 'object') {
					return {
						name: item.name || 'UNDEFINED_EVENT',
						target: item.target || _window,
						options: item.options || null,
					};
				}
				return {
					name: item || 'UNDEFINED_EVENT',
					target: _window,
					options: null,
				};
			});
		},
		computedClassList: function computedClassList() {
			return this.active && !this.computedOptions.classless
				? this.classList
				: [];
		},
		computedOptions: function computedOptions() {
			// The set options overwriting the defaults
			return Object.assign(
				Object.assign({}, defaultOptions),
				this.options
			);
		},
		rootMarginObject: function rootMarginObject() {
			// Transforming the root margin string into an array of more usable values
			var rootMarginArray = this.computedOptions.rootMargin
				.split(' ')
				.filter(function (segment) { return segment; });

			rootMarginArray = rootMarginArray.map(function (item) {
				if (
					item.match(/(^-?[0-9]*\.?[0-9]+)px/g) &&
					item.match(/(^-?[0-9]*\.?[0-9]+)px/g).length === 1
				) {
					return {
						value: item.match(/(^-?[0-9]*\.?[0-9]+)/g)[0],
					};
				}
				if (
					item.match(/(^-?[0-9]*\.?[0-9]+)%/g) &&
					item.match(/(^-?[0-9]*\.?[0-9]+)%/g).length === 1
				) {
					return {
						value: item.match(/(^-?[0-9]*\.?[0-9]+)/g)[0],
						isPercentage: true,
					};
				}
				return {
					value: 0,
				};
			});

			switch (rootMarginArray.length) {
				case 1:
					return {
						top: rootMarginArray[0],
						right: rootMarginArray[0],
						bottom: rootMarginArray[0],
						left: rootMarginArray[0],
					};
				case 2:
					return {
						top: rootMarginArray[0],
						right: rootMarginArray[1],
						bottom: rootMarginArray[0],
						left: rootMarginArray[1],
					};
				case 3:
					return {
						top: rootMarginArray[0],
						right: rootMarginArray[1],
						bottom: rootMarginArray[2],
						left: rootMarginArray[1],
					};
				case 4:
					return {
						top: rootMarginArray[0],
						right: rootMarginArray[1],
						bottom: rootMarginArray[2],
						left: rootMarginArray[3],
					};
				default:
					return {
						top: { value: 0 },
						right: { value: 0 },
						bottom: { value: 0 },
						left: { value: 0 },
					};
			}
		},
		observerOptions: function observerOptions() {
			// The options specific to the observer
			var ref = this.computedOptions;
			var root = ref.root;
			var rootMargin = ref.rootMargin;
			var thresholds = ref.thresholds;
			return { root: root, rootMargin: rootMargin, thresholds: thresholds };
		},
		observerResetters: function observerResetters() {
			// Options that shall reset the observer (destroy it and/or create a new one)
			var ref = this.computedOptions;
			var root = ref.root;
			var rootMargin = ref.rootMargin;
			var thresholds = ref.thresholds;
			return {
				active: this.computedActive,
				root: root,
				rootMargin: rootMargin,
				thresholds: thresholds,
			};
		},
	},

	///////////////////////////////////// watchers
	watch: {
		computedActive: function computedActive(active) {
			if (active) {
				// Activate the observer
				this.resetObserver();
			} else if (this.observer) {
				// Deactivate the observer
				this.observer.disconnect();
				this.observer = null;
			}
		},
		computedAppearOnce: function computedAppearOnce(appearOnce) {
			// Reset activeOverwrite if appearOnce is toggles off
			if (!appearOnce && !this.activeOverwrite) {
				this.activeOverwrite = true;
			}
		},
		computedTriggerEvents: function computedTriggerEvents(newList) {
			// Update active trigger events
			if (this.state === 'inside') {
				this.updateActiveTriggerEvents(newList);
			} else {
				this.updateActiveTriggerEvents();
			}
		},
		state: function state(state$1, oldState) {
			// Update previous state
			this.statePrevious = oldState;
			// Update trigger events
			if (state$1 === 'inside') {
				this.updateActiveTriggerEvents(this.computedTriggerEvents);
			} else {
				this.updateActiveTriggerEvents();
			}
		},
		observerResetters: function observerResetters() {
			// Reset the observer on important changes
			this.resetObserver();
		},
		previousEl: function previousEl(el) {
			var ref;

			// Make sure to set classes again
			if (el) {
				this.classRemove(
					el,
					'sky-appear--outside-viewport',
					'sky-appear--outside-viewport--before',
					'sky-appear--outside-viewport--after',
					'sky-appear--inside-viewport'
				);
				(ref = this).classAdd.apply(ref, [ el ].concat( this.classList ));
			}
		},
		computedClassList: function computedClassList(newList, oldList) {
			var ref, ref$1;

			// Update classes when classList changes
			if (JSON.stringify(newList) !== JSON.stringify(oldList)) {
				(ref = this).classRemove.apply(ref, [ this.previousEl ].concat( oldList ));
				(ref$1 = this).classAdd.apply(ref$1, [ this.previousEl ].concat( newList ));
			}
		},
	},

	///////////////////////////////////// life cycle hooks
	mounted: function mounted() {
		// Note previous element
		this.previousEl = this.$el;

		// Setup observer
		this.resetObserver();

		// Startup events
		if (this.state === 'inside') {
			this.updateActiveTriggerEvents(this.computedTriggerEvents);
		}
	},
	updated: function updated() {
		// Update observer
		if (this.previousEl !== this.$el) {
			this.resetObserver();
			this.previousEl = this.$el;
		}
	},
	destroyed: function destroyed() {
		// Remove events and observer
		this.updateActiveTriggerEvents();
		if (this.$el) {
			this.classRemove(
				this.$el,
				'sky-appear',
				'sky-appear--outside-viewport',
				'sky-appear--outside-viewport--before',
				'sky-appear--outside-viewport--after',
				'sky-appear--inside-viewport'
			);
		}
		if (this.observer) {
			this.observer.disconnect();
		}
	},

	///////////////////////////////////// methods
	methods: {
		observerCallback: function observerCallback(obs, forceAccept) {
			var this$1 = this;
			if ( forceAccept === void 0 ) forceAccept = { value: false };

			var ref = this.computedOptions;
			var delay = ref.delay;
			window.clearTimeout(this.timeout);
			window.cancelAnimationFrame(this.frameRequest);
			this.timeout = null;
			this.frameRequest = null;

			// Cancel if not active anymore
			if (!this.computedActive) {
				return;
			}

			if (obs && obs[0] && typeof obs[0].isIntersecting !== 'undefined') {
				// We need to store the intersection state of actual observations in case of a delay
				this.isIntersectingStored = obs[0].isIntersecting;
			}

			if (
				!delay ||
				forceAccept.value ||
				performance.now() - this.lastTime >= delay
			) {
				// Try to generate an observation, if it doesn't currently exist
				if (!obs) {
					var newObs = this.compileObserverData();
					if (
						newObs &&
						(delay ||
							this.computedAppearOnce ||
							!newObs[0].intersectionRect.width ==
								!newObs[0].isIntersecting)
					) {
						obs = newObs;
					}
				}

				// Start the observer callback
				if (obs && obs.length) {
					// Get base values
					var ref$1 = obs[0];
					var time = ref$1.time;
					var rootBounds = ref$1.rootBounds;
					var boundingClientRect = ref$1.boundingClientRect;
					var intersectionRect = ref$1.intersectionRect;
					var isIntersecting = ref$1.isIntersecting;
					var target = ref$1.target;
					var statePrevious = this.state;
					var intersectionRatioPrevious = this.intersectionRatio;
					this.intersectionRatio = 0;
					this.isBeforeViewport = false;
					this.isAfterViewport = false;

					if (!rootBounds) {
						// Safety check for when elements are removed
						return;
					}

					// Set intersection state and ratio
					if (isIntersecting) {
						this.state = 'inside';
						switch (this.direction) {
							// Vertical ratio
							case 'block':
								{
									this.intersectionRatio =
										intersectionRect.height /
										boundingClientRect.height;
								}
								break;
							// Horizontal ratio
							case 'inline':
								{
									this.intersectionRatio =
										intersectionRect.width /
										boundingClientRect.width;
								}
								break;
							// Both axi ratio
							case 'both':
								{
									this.intersectionRatio =
										(intersectionRect.height /
											boundingClientRect.height) *
										(intersectionRect.width /
											boundingClientRect.width);
								}
								break;
						}
					} else {
						switch (this.direction) {
							// Vertical detection
							case 'block':
								{
									if (
										boundingClientRect.bottom <
										rootBounds.top
									) {
										this.state = 'before';
										this.isBeforeViewport = true;
									} else if (
										boundingClientRect.top >
										rootBounds.bottom
									) {
										this.state = 'after';
										this.isAfterViewport = true;
									} else {
										this.state = 'outside';
									}
								}
								break;
							// Horizontal detection
							case 'inline':
								{
									if (
										boundingClientRect.right <
										rootBounds.left
									) {
										this.state = 'before';
										this.isBeforeViewport = true;
									} else if (
										boundingClientRect.left >
										rootBounds.right
									) {
										this.state = 'after';
										this.isAfterViewport = true;
									} else {
										this.state = 'outside';
									}
								}
								break;
							// Both axi detection
							case 'both':
								{
									this.state = 'outside';
								}
								break;
						}
					}

					// Set the correct classes
					var classList = ['sky-appear'];
					if (this.state === 'outside') {
						classList.push('sky-appear--outside-viewport');
					} else if (
						this.state === 'before' ||
						this.state === 'after'
					) {
						classList.push('sky-appear--outside-viewport');
						classList.push(
							("sky-appear--outside-viewport--" + (this.state))
						);
					} else {
						classList.push('sky-appear--inside-viewport');
					}
					this.classList = classList;

					// Stop detecting if need be
					if (
						this.computedOptions.appearOnce &&
						this.state === 'inside'
					) {
						this.activeOverwrite = false;
					} else {
						// Nothing has changed, so no need for an update (only for real entries)
						var observerType =
							obs && obs[0] && obs[0].constructor && obs[0].constructor.name;
						if (
							observerType === 'IntersectionObserverEntry' &&
							this.state === statePrevious &&
							this.intersectionRatio === intersectionRatioPrevious
						) {
							return;
						}
					}

					// Compile data for emission
					var observer = {
						time: time,
						rootBounds: rootBounds,
						boundingClientRect: boundingClientRect,
						intersectionRect: intersectionRect,
						isIntersecting: isIntersecting,
						isBeforeViewport: this.isBeforeViewport,
						isAfterViewport: this.isAfterViewport,
						intersectionRatio: this.intersectionRatio,
						target: target,
					};

					// Emit events
					if (this.state !== statePrevious) {
						// Enter
						if (this.state === 'inside') {
							this.$emit(
								'enter',
								Object.assign({ type: 'enter' }, observer)
							);
						}

						// Update
						this.$emit(
							'update',
							Object.assign({ type: 'update' }, observer)
						);

						// Leave
						if (this.state !== 'inside') {
							this.$emit(
								'leave',
								Object.assign({ type: 'leave' }, observer)
							);
						}
					} else {
						// Update
						this.$emit(
							'update',
							Object.assign({ type: 'update' }, observer)
						);
					}

					// Update timestamp
					this.lastTime = time;
				}
			} else {
				// Request animation frame
				if (delay === 'animationFrame') {
					this.frameRequest = window.requestAnimationFrame(function () {
						this$1.observerCallback(obs, { value: true });
					});
				}

				// Set timeout
				if (delay > 0) {
					this.timeout = window.setTimeout(function () {
						this$1.observerCallback(obs);
					}, Math.max(0, Math.floor(delay - (performance.now() - this.lastTime))));
				}
			}
		},
		resetObserver: function resetObserver() {
			// Close down old observer
			if (this.observer) {
				this.observer.disconnect();
			}
			// Setup new observer
			if (this.computedActive && this.$el && this.$el.nodeType !== 8) {
				// ".nodeType !== 8" is for avoiding comments
				this.observer =
					this.observer ||
					new IntersectionObserver(
						this.observerCallback,
						this.observerOptions
					);
				this.observer.observe(this.$el);
			} else {
				this.observer = null;
			}
		},
		updateActiveTriggerEvents: function updateActiveTriggerEvents(events) {
			var this$1 = this;
			var ref;

			if ( events === void 0 ) events = [];
			var newEvents = [].concat( events );
			var oldEvents = [].concat( this.activeTriggerEvents );

			// Reset content
			this.activeTriggerEvents.length = 0;
			(ref = this.activeTriggerEvents).push.apply(ref, newEvents);

			// Remove events
			var eventsToRemove = oldEvents.filter(function (event) {
				return (
					newEvents.findIndex(function (element) {
						return (
							element.name === event.name &&
							element.target === event.target &&
							element.options === event.options
						);
					}) === -1
				);
			});
			eventsToRemove.forEach(function (event) {
				event.target.removeEventListener(
					event.name,
					this$1.eventCallback
				);
			});

			// Add events
			var eventsToAdd = newEvents.filter(function (event) {
				return (
					oldEvents.findIndex(function (element) {
						return (
							element.name === event.name &&
							element.target === event.target &&
							element.options === event.options
						);
					}) === -1
				);
			});
			eventsToAdd.forEach(function (event) {
				event.target.addEventListener(
					event.name,
					this$1.eventCallback,
					event.options
				);
			});
		},
		eventCallback: function eventCallback() {
			this.observerCallback();
		},
		// Helpers
		classAdd: function classAdd(el) {
			var classNames = [], len = arguments.length - 1;
			while ( len-- > 0 ) classNames[ len ] = arguments[ len + 1 ];

			if (el && el.classList) {
				classNames.forEach(function (className) {
					el.classList.add(className);
				});
			}
		},
		classRemove: function classRemove(el) {
			var classNames = [], len = arguments.length - 1;
			while ( len-- > 0 ) classNames[ len ] = arguments[ len + 1 ];

			if (el && el.classList) {
				classNames.forEach(function (className) {
					el.classList.remove(className);
				});
			}
		},
		compileObserverData: function compileObserverData() {
			if (this.$el && this.$el.nodeType !== 8) {
				// ".nodeType !== 8" is for avoiding comments
				// Get bounds of observed element,  root and intersection area
				// Observed element bounds
				var boundingClientRect = this.$el.getBoundingClientRect();

				// Root element bounds
				var root =
					this.computedOptions.root || document.documentElement;
				var rootBounds = JSON.parse(
					JSON.stringify(root.getBoundingClientRect())
				);
				if (root === document.documentElement) {
					rootBounds.width = Math.min(
						rootBounds.width,
						window.innerWidth
					);
					rootBounds.height = Math.min(
						rootBounds.height,
						window.innerHeight
					);
				}

				if (!this.computedOptions.root) {
					Object.assign(rootBounds, {
						left: 0,
						x: 0,
						top: 0,
						y: 0,
						right: rootBounds.width,
						bottom: rootBounds.height,
					});
				}

				// Add root margins
				var margin = {
					top: this.rootMarginObject.top.isPercentage
						? (this.rootMarginObject.top.value *
								rootBounds.height) /
						  100
						: this.rootMarginObject.top.value * 1,
					right: this.rootMarginObject.right.isPercentage
						? (this.rootMarginObject.right.value *
								rootBounds.width) /
						  100
						: this.rootMarginObject.right.value * 1,
					bottom: this.rootMarginObject.bottom.isPercentage
						? (this.rootMarginObject.bottom.value *
								rootBounds.height) /
						  100
						: this.rootMarginObject.bottom.value * 1,
					left: this.rootMarginObject.left.isPercentage
						? (this.rootMarginObject.left.value *
								rootBounds.width) /
						  100
						: this.rootMarginObject.left.value * 1,
				};

				rootBounds.left -= margin.left;
				rootBounds.x -= margin.left;
				rootBounds.top -= margin.top;
				rootBounds.y -= margin.top;
				rootBounds.right += margin.right;
				rootBounds.width += margin.left + margin.right;
				rootBounds.bottom += margin.bottom;
				rootBounds.height += margin.top + margin.bottom;

				// Intersection bounds
				var intersectionRect = {
					left: Math.max(boundingClientRect.left, rootBounds.left),
					top: Math.max(boundingClientRect.top, rootBounds.top),
				};

				intersectionRect.right = Math.max(
					intersectionRect.left,
					Math.min(boundingClientRect.right, rootBounds.right)
				);
				intersectionRect.bottom = Math.max(
					intersectionRect.top,
					Math.min(boundingClientRect.bottom, rootBounds.bottom)
				);
				intersectionRect.x = intersectionRect.left;
				intersectionRect.y = intersectionRect.top;
				intersectionRect.width = Math.max(
					0,
					intersectionRect.right - intersectionRect.left
				);
				intersectionRect.height = Math.max(
					0,
					intersectionRect.bottom - intersectionRect.top
				);

				if (
					intersectionRect.width === 0 ||
					intersectionRect.height === 0
				) {
					intersectionRect.top = 0;
					intersectionRect.right = 0;
					intersectionRect.bottom = 0;
					intersectionRect.left = 0;
					intersectionRect.x = 0;
					intersectionRect.y = 0;
					intersectionRect.width = 0;
					intersectionRect.height = 0;
				}

				// Compile observer object and forward as observerCallback
				var isIntersecting = this.isIntersectingStored;
				return [
					{
						time: performance.now(),
						rootBounds: rootBounds,
						boundingClientRect: boundingClientRect,
						intersectionRect: intersectionRect,
						isIntersecting: isIntersecting,
						// intersectionRatio: 0, // Ignored as we are going to overwrite/recalculate it anyway
						target: this.$el,
					} ];
			}

			// Not successful
			return null;
		},
	},
	render: function render() {
		if (typeof this.$scopedSlots.default === 'function') {
			return this.$scopedSlots.default({
				isIntersecting: this.state === 'inside',
				intersectionRatio: this.intersectionRatio,
				isBeforeViewport: this.isBeforeViewport,
				isAfterViewport: this.isAfterViewport,
			});
		}
		return null;
	},
};

/* script */
            var __vue_script__ = script;
            
/* template */

  /* style */
  var __vue_inject_styles__ = undefined;
  /* scoped */
  var __vue_scope_id__ = undefined;
  /* module identifier */
  var __vue_module_identifier__ = undefined;
  /* functional template */
  var __vue_is_functional_template__ = undefined;
  /* component normalizer */
  function __vue_normalize__(
    template, style, script$$1,
    scope, functional, moduleIdentifier,
    createInjector, createInjectorSSR
  ) {
    var component = (typeof script$$1 === 'function' ? script$$1.options : script$$1) || {};

    // For security concerns, we use only base name in production mode.
    component.__file = "SkyAppear.vue";

    if (!component.render) {
      component.render = template.render;
      component.staticRenderFns = template.staticRenderFns;
      component._compiled = true;

      if (functional) { component.functional = true; }
    }

    component._scopeId = scope;

    return component
  }
  /* style inject */
  
  /* style inject SSR */
  

  
  var SkyAppear = __vue_normalize__(
    {},
    __vue_inject_styles__,
    __vue_script__,
    __vue_scope_id__,
    __vue_is_functional_template__,
    __vue_module_identifier__,
    undefined,
    undefined
  );

var defaults = {
	registerComponents: true,
};

function install(Vue, options) {
	if (install.installed === true) {
		return;
	}

	var ref = Object.assign({}, defaults, options);
	var registerComponents = ref.registerComponents;

	if (registerComponents) {
		Vue.component(SkyAppear.name, SkyAppear);
	}
}

export default install;
export { SkyAppear };
