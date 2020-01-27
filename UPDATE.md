# `lmbo-appear`
Renderless wrapper Vue component for exposing style classes to elements based on their position in relation to the viewport.

## Installation
```bash
npm install lmbo-appear
```
or
```bash
yarn add lmbo-appear
```

This package depends on the [IntersectionObserver](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver) API which needs a polyfill for old browsers, including all of IE.  Consider using the [W3C IntersectionObserver polyfill](https://github.com/w3c/IntersectionObserver/tree/master/polyfill).

## Using the wrapper component
Import and install the LmboAppear wrapper component:
```js
import Vue from ‘vue’;
import LmboAppear from ‘lmbo-appear’;

export default {
	name: ‘ExampleComponent’,
	components: { LmboAppear },
	mounted() {
		console.log(‘Example component loaded’);
	},
};
```

### Basic wrapper example
The wrapper component adds the class `lmbo-appear` to the wrapped element when the dom is loaded. Supplementary classes are then added or removed depending on the element’s relation to the viewport.

* When the element enters the viewport the class `lbmo-appear--inside-viewport` is added.
* When the element is above the viewport the class `lbmo-appear--before-viewport` is added.
* When the element is below the viewport the class `lbmo-appear--after-viewport` is added.
```html
<!-- As written in Vue -->
<LmboAppear>
	<div class=“test-element”>
		Show only when entering the viewport
	</div>
</LmboAppear>

<!-- As it may appear in the dom -->
<div class=“test-element lmbo-appear lmbo-appear--after-viewport”>
	Show only when entering the viewport
</div>
```

### Full wrapper example
The full example below showcases all the functionalities of the wrapper component.
```html
<!-- As written in Vue -->
<div ref=“newRoot”>
	<LmboAppear
		:active=“isActive”
		:direction=“‘inline’”
		:options=“{
			default: ’outside’,
			appearOnce: false,
			updateTriggerEvents: [
				'resize',
				'scroll',
			],
			limitUpdatesTo: ‘inside’,
			root: $refs.newRoot,
			rootMargin: ’10% 10%’,
			thresholds: [0, .25, .5, .75, 1],
		}”
		@enter=“enterHandling”
		@leave=“leaveHandling”
		@update=“updateHandling”
	>
		<div class=“test-element” v-slot=“{ loaded, state, intersectionRatio }">
			<p
				v-if="loaded"
				:style="{
					transform: 'translate3d(' + (intersectionRatio * 10) + '%, 0, 0),
				}"
			>
				Show only when entering the viewport - current state: {{ state }}
			</p>
			<p v-else>
				Not yet loaded - current state: {{ state }}
			</p>
		</div>
	</LmboAppear>
</div>

<!-- As it may appear in the dom -->
<div>
	<div class=“test-element”>
		<p style=“transform: ‘translate3d(12.5%, 0, 0);”>
			Show only when entering the viewport - current state: inside
		</p>
	</div>
</div>
```

### Props overview
There is only a few props to use, as a lot of the setup is done using an options-object passed into the options-prop. In short, the remaining props (active, direction) are the only ones you should change dynamically. The options-prop is best left unchanged after mount.
| Prop        | Description                                                                                                                                                                                                                                                                                                                | Default value | Data type |
|-------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------|-----------|
| active      | Whether or not the wrapper is active and currently detecting.                                                                                                                                                                                                                                                              | true          | Boolean   |
| direction   | Whether to detect viewport intersection vertically (‘block’) or horizontally (‘inline’). This means when in block-mode the `--before-viewport` class modifier is set when the element is above the viewport, and the `--after-viewport` modifier is when below. When in inline-mode ‘before’ is left and ‘after’ is right. | ‘block’       | String    |
| options     | Options set when the component is first mounted. See the overview below.                                                                                                                                                                                                                                                   | {}            | Object    |

### Options overview
All the properties in the options-prop are values, that should be set on mount and then left alone.
| Property            | Description                                                                                                                                                                                                                                                                                                                                       | Default value       | Data type       |
|---------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------|-----------------|
| initState           | The initiary state before any detection is done. A value of 'inside' will have the element starting with the `--inside-viewport` class modifier, and 'outside' will have it start without it. 'before' will have it start with the `--before-viewport` class modifier, and 'after' will have it start with the `--after-viewport` class modifier. | 'inside'            | String          |
| appearOnce          | If set to true, the `--inside-viewport` class modifier will be set only once to never be removed again. Internally tracking of intersections will stop when this happens.                                                                                                                                                                         | true                | Boolean         |
| triggerEvents       | An array of which events the internal update-function should also run on, other than on the intersection updates. This can be used for smoother gradients of values.                                                                                                                                                                              | []                  | Array           |
| limitUpdatesTo      | Limits the update event to emit only on specific states. A value of ‘inside’ will make the events only trigger when the element is in view, ‘outside’ is when not in view, ‘before’ is when the element is positioned before the viewport and ‘after’ is when positioned after.                                                                   | null                | String          |
| root                | The root of the intersection observer. [Read more.](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver/root)                                                                                                                                                                                                                   | null / viewport     | Object          |
| rootMargin          | The root margin of the intersection observer. [Read more.](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver/rootMargin)                                                                                                                                                                                                      | ‘0px 0px 0px 0px’   | String          |
| thresholds          | The thresholds of the intersection observer. [Read more.](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver/thresholds)                                                                                                                                                                                                       | [0]                 | Array           |

### Events overview
| Event  | Description                                                                                                                                                                  |
|--------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| enter  | Event triggering when the wrapper content enters into the viewport. The element needs only be partially within the viewport.                                                 |
| leave  | Event triggering when the wrapper content leaves the viewport. The element needs to leave the viewport fully.                                                                |
| update | Event triggering whenever the viewport changes while the wrapper content is within view. This event will also be triggered by events set by the `triggerEvents` option.      |

Each of the event types pass an event object when called upon, and structurally the event object will be the same no matter the event. The object will contain the following properties:
| Property            | Description                                                                                                                               |
|---------------------|-------------------------------------------------------------------------------------------------------------------------------------------|
| target              | A reference to the element currently observed.                                                                                            |
| intersectionRatio   | A value going from 0 (fully out of view) to 1 (fully in view).                                                                            |
| isInside            | Boolean value telling if the target is either fully or partially inside the viewport.                                                     |
| isOutsideBefore     | Boolean value telling whether partially or fully outside of view in the before-direction (left or upwards depending on set direction).    |
| isOutsideAfter      | Boolean value telling whether partially or fully outside of view in the after-direction (right or downwards depending on set direction).  |
| boundingClientRect  | Returns the bounds rectangle of the target element as a DOMRectReadOnly.                                                                  |
| intersectionRect    | Returns a DOMRectReadOnly representing the target’s visible area.                                                                         |
| rootBounds          | Returns a DOMRectReadOnly for the intersection observer’s root.                                                                           |
| time                | A DOMHighResTimeStamp indicating the time at which the intersection was recorded, relative to the IntersectionObserver’s time origin.     |

### Notes on usage

## Sources of inspiration and help
[GitHub - BKWLD/vue-inside-viewport-mixin: Vue 2 mixin to determine when a DOM element is visible in the client window](https://github.com/BKWLD/vue-inside-viewport-mixin)
[Building renderless components](https://css-tricks.com/building-renderless-vue-components/)
[Renderless Components in Vue.js](https://adamwathan.me/renderless-components-in-vuejs/)
[Skitse for renderless wrapper](https://webcomponents.dev/edit/bnNrwGVY0kLGdTlKwEaz)