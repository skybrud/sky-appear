<script>
// The default values for the options property
const defaultOptions = {
	appearOnce: true,
	initState: 'inside',
	classless: false,
	triggerEvents: [],
	root: null,
	rootMargin: '0px 0px 0px 0px',
	thresholds: [0],
	delay: 0,
};

export default {
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
			default: () => defaultOptions,
		},
	},
	data() {
		const state = this.options.initState || defaultOptions.initState;
		return {
			state,
			statePrevious: state,
			activeOverwrite: true,
			activeTriggerEvents: [],
			// Deliverables
			intersectionRatio: (state === 'inside') * 1,
			intersectionJourney: (state === 'before') * 1,
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
		computedActive() {
			// Activeness set by both prop and internal data
			return this.active && this.activeOverwrite;
		},
		computedAppearOnce() {
			// So that it can be watched
			return this.computedOptions.appearOnce;
		},
		computedTriggerEvents() {
			if (!this.active) {
				return [];
			}

			// Transform all trigger events to objects
			let _window = {};
			if (typeof window !== 'undefined') {
				_window = window;
			}
			return this.computedOptions.triggerEvents.map(item => {
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
		computedClassList() {
			return this.active && !this.computedOptions.classless
				? this.classList
				: [];
		},
		computedOptions() {
			// The set options overwriting the defaults
			return Object.assign(
				Object.assign({}, defaultOptions),
				this.options
			);
		},
		rootMarginObject() {
			// Transforming the root margin string into an array of more usable values
			let rootMarginArray = this.computedOptions.rootMargin
				.split(' ')
				.filter(segment => segment);

			rootMarginArray = rootMarginArray.map(item => {
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
		observerOptions() {
			// The options specific to the observer
			const { root, rootMargin, thresholds } = this.computedOptions;
			return { root, rootMargin, thresholds };
		},
		observerResetters() {
			// Options that shall reset the observer (destroy it and/or create a new one)
			const { root, rootMargin, thresholds } = this.computedOptions;
			return {
				active: this.computedActive,
				root,
				rootMargin,
				thresholds,
			};
		},
	},

	///////////////////////////////////// watchers
	watch: {
		computedActive(active) {
			if (active) {
				// Activate the observer
				this.resetObserver();
			} else if (this.observer) {
				// Deactivate the observer
				this.observer.disconnect();
				this.observer = null;
			}
		},
		computedAppearOnce(appearOnce) {
			// Reset activeOverwrite if appearOnce is toggles off
			if (!appearOnce && !this.activeOverwrite) {
				this.activeOverwrite = true;
			}
		},
		computedTriggerEvents(newList) {
			// Update active trigger events
			if (this.state === 'inside') {
				this.updateActiveTriggerEvents(newList);
			} else {
				this.updateActiveTriggerEvents();
			}
		},
		state(state, oldState) {
			// Update previous state
			this.statePrevious = oldState;
			// Update trigger events
			if (state === 'inside') {
				this.updateActiveTriggerEvents(this.computedTriggerEvents);
			} else {
				this.updateActiveTriggerEvents();
			}
		},
		observerResetters() {
			// Reset the observer on important changes
			this.resetObserver();
		},
		previousEl(el) {
			// Make sure to set classes again
			if (el) {
				this.classRemove(
					el,
					'sky-appear--outside-viewport',
					'sky-appear--outside-viewport--before',
					'sky-appear--outside-viewport--after',
					'sky-appear--inside-viewport'
				);
				this.classAdd(el, ...this.classList);
			}
		},
		computedClassList(newList, oldList) {
			// Update classes when classList changes
			if (JSON.stringify(newList) !== JSON.stringify(oldList)) {
				this.classRemove(this.previousEl, ...oldList);
				this.classAdd(this.previousEl, ...newList);
			}
		},
	},

	///////////////////////////////////// life cycle hooks
	mounted() {
		// Note previous element
		this.previousEl = this.$el;

		// Setup observer
		this.resetObserver();

		// Startup events
		if (this.state === 'inside') {
			this.updateActiveTriggerEvents(this.computedTriggerEvents);
		}
	},
	updated() {
		// Update observer
		if (this.previousEl !== this.$el) {
			this.resetObserver();
			this.previousEl = this.$el;
		}
	},
	destroyed() {
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
		observerCallback(obs, forceAccept = { value: false }) {
			const { delay } = this.computedOptions;
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
					const newObs = this.compileObserverData();
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
					const {
						time,
						rootBounds,
						boundingClientRect,
						intersectionRect,
						isIntersecting,
						target,
					} = obs[0];
					const statePrevious = this.state;
					const intersectionRatioPrevious = this.intersectionRatio;
					this.intersectionRatio = 0;
					this.intersectionJourney = 0;
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
									// Intersection ratio
									this.intersectionRatio =
										intersectionRect.height /
										boundingClientRect.height;
									// Intersection journey
									this.intersectionJourney = Math.min(
										Math.max(
											0,
											(rootBounds.bottom - boundingClientRect.top) /
												(rootBounds.height + boundingClientRect.height)
										),
										1
									);
								}
								break;
							// Horizontal ratio
							case 'inline':
								{
									// Intersection ratio
									this.intersectionRatio =
										intersectionRect.width /
										boundingClientRect.width;
									// Intersection journey
									this.intersectionJourney = Math.min(
										Math.max(
											0,
											(rootBounds.right - boundingClientRect.left) /
												(rootBounds.width + boundingClientRect.width)
										),
										1
									);
								}
								break;
							// Both axi ratio
							case 'both':
								{
									// Intersection ratio
									this.intersectionRatio =
										(intersectionRect.height /
											boundingClientRect.height) *
										(intersectionRect.width /
											boundingClientRect.width);
									// Intersection journey - Only works one direction!
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
										this.intersectionJourney = 1;
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
										this.intersectionJourney = 1;
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
					const classList = ['sky-appear'];
					if (this.state === 'outside') {
						classList.push('sky-appear--outside-viewport');
					} else if (
						this.state === 'before' ||
						this.state === 'after'
					) {
						classList.push('sky-appear--outside-viewport');
						classList.push(
							`sky-appear--outside-viewport--${this.state}`
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
						const observerType =
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
					const observer = {
						time,
						rootBounds,
						boundingClientRect,
						intersectionRect,
						isIntersecting,
						isBeforeViewport: this.isBeforeViewport,
						isAfterViewport: this.isAfterViewport,
						intersectionRatio: this.intersectionRatio,
						intersectionJourney: this.intersectionJourney,
						target,
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
					this.frameRequest = window.requestAnimationFrame(() => {
						this.observerCallback(obs, { value: true });
					});
				}

				// Set timeout
				if (delay > 0) {
					this.timeout = window.setTimeout(() => {
						this.observerCallback(obs);
					}, Math.max(0, Math.floor(delay - (performance.now() - this.lastTime))));
				}
			}
		},
		resetObserver() {
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
		updateActiveTriggerEvents(events = []) {
			const newEvents = [...events];
			const oldEvents = [...this.activeTriggerEvents];

			// Reset content
			this.activeTriggerEvents.length = 0;
			this.activeTriggerEvents.push(...newEvents);

			// Remove events
			const eventsToRemove = oldEvents.filter(event => {
				return (
					newEvents.findIndex(element => {
						return (
							element.name === event.name &&
							element.target === event.target &&
							element.options === event.options
						);
					}) === -1
				);
			});
			eventsToRemove.forEach(event => {
				event.target.removeEventListener(
					event.name,
					this.eventCallback
				);
			});

			// Add events
			const eventsToAdd = newEvents.filter(event => {
				return (
					oldEvents.findIndex(element => {
						return (
							element.name === event.name &&
							element.target === event.target &&
							element.options === event.options
						);
					}) === -1
				);
			});
			eventsToAdd.forEach(event => {
				event.target.addEventListener(
					event.name,
					this.eventCallback,
					event.options
				);
			});
		},
		eventCallback() {
			this.observerCallback();
		},
		// Helpers
		classAdd(el, ...classNames) {
			if (el && el.classList) {
				classNames.forEach(className => {
					el.classList.add(className);
				});
			}
		},
		classRemove(el, ...classNames) {
			if (el && el.classList) {
				classNames.forEach(className => {
					el.classList.remove(className);
				});
			}
		},
		compileObserverData() {
			if (this.$el && this.$el.nodeType !== 8) {
				// ".nodeType !== 8" is for avoiding comments
				// Get bounds of observed element,  root and intersection area
				// Observed element bounds
				const boundingClientRect = this.$el.getBoundingClientRect();

				// Root element bounds
				const root =
					this.computedOptions.root || document.documentElement;
				const rootBounds = JSON.parse(
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
				const margin = {
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
				const intersectionRect = {
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
				const isIntersecting = this.isIntersectingStored;
				return [
					{
						time: performance.now(),
						rootBounds,
						boundingClientRect,
						intersectionRect,
						isIntersecting,
						// intersectionRatio: 0, // Ignored as we are going to overwrite/recalculate it anyway
						target: this.$el,
					},
				];
			}

			// Not successful
			return null;
		},
	},
	render() {
		if (typeof this.$scopedSlots.default === 'function') {
			return this.$scopedSlots.default({
				isIntersecting: this.state === 'inside',
				intersectionRatio: this.intersectionRatio,
				intersectionJourney: this.intersectionJourney,
				isBeforeViewport: this.isBeforeViewport,
				isAfterViewport: this.isAfterViewport,
			});
		}
		return null;
	},
};
</script>
