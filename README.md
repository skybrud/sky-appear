# `sky-appear`

Renderless wrapper Vue component for exposing style classes to elements based on their position in relation to the viewport.

## Installation

``` bash
npm install sky-appear
```

or

``` bash
yarn add sky-appear
```

This package depends on the [IntersectionObserver](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver) API which needs a polyfill for old browsers, including all of IE. Consider using the [W3C IntersectionObserver polyfill](https://github.com/w3c/IntersectionObserver/tree/master/polyfill).

## Using the wrapper component

Import and install the SkyAppear wrapper component:

``` js
import Vue from ‘vue’;
import { SkyAppear } from ‘sky-appear’;

export default {
	name: ‘ExampleComponent’,
	components: { SkyAppear },
	mounted() {
		console.log(‘Example component loaded’);
	},
};
```

Alternatively SkyAppear can be installed globally:

```
import Vue from 'vue';
import SkyAppear from 'sky-appear';

Vue.use(SkyAppear);
```

### Basic wrapper example

The wrapper component adds the class `sky-appear` to the wrapped element when the dom is loaded and the wrapper component is active. Supplementary classes are then added or removed depending on the element’s relation to the viewport.

* When the element enters the viewport the class `lbmo-appear--inside-viewport` is added.
* When the element is outside the viewport the class `lmbo-appear--outside-viewport` is added.
* When the element is positioned before the viewport the class `lbmo-appear--outside-viewport--before` is added\* in addition to the `lmbo-appear--outside-viewport` class.
* When the element is positioned after the viewport the class `lbmo-appear--outside-viewport--after` is added\* in addition to the `lmbo-appear--outside-viewport` class.

\*The before and after classes will only be set when direction is either "inline" or "block". When the direction is "both" a before or after situation cannot be determined.

``` html
<!-- As written in Vue -->
<SkyAppear>
	<div class=“test-element”>
		Show only when entering the viewport
	</div>
</SkyAppear>

<!-- As it may appear in the dom -->
<div class=“test-element sky-appear sky-appear--outside-viewport sky-appear--outside-viewport--after”>
	Show only when entering the viewport
</div>
```

Note that only one top-level element should be active within the wrapper at any given time.

### Full wrapper example

The full example below showcases all the functionalities of the wrapper component.

``` html
<!-- As written in Vue -->
<div ref=“newRoot”>
	<SkyAppear
		:active=“isActive”
		:direction=“‘inline’”
		:options=“{
			initState: ’outside’,
			classless: true,
			appearOnce: false,
			triggerEvents: [
				'resize',
				{ name: 'scroll', target: $refs.newRoot },
			],
			root: $refs.newRoot,
			rootMargin: ’10% 10%’,
			thresholds: [0, .25, .5, .75, 1],
			delay: 'animationFrame',
		}"
		@enter=“enterHandling”
		@leave=“leaveHandling”
		@update=“updateHandling”
	>
		<div class=“test-element” v-slot=“{ isIntersecting, intersectionRatio }">
			<p
				v-if="isIntersecting"
				:style="{
					transform: 'translate3d(' + (intersectionRatio * 10) + '%, 0, 0),
				}"
			>
				Show only when entering the viewport - is intersecting: {{ isIntersecting }}
			</p>
			<p v-else>
				Not yet there - is intersecting: {{ state }}
			</p>
		</div>
	</LmboAppear>
</div>

<!-- As it may appear in the dom -->
<div>
	<div class=“test-element”>
		<p style=“transform: ‘translate3d(12.5%, 0, 0);”>
			Show only when entering the viewport - is intersecting: true
		</p>
	</div>
</div>
```

### Props overview

There is only a few props to use, as a lot of the setup is done using an options-object passed into the options-prop. In short, the remaining props (active, direction) are the only ones you should change dynamically. The options-prop is best left unchanged after mount.

| Prop | Description | Default value | Data type |
| ---- | ----------- | ------------- | --------- |
| active | Whether or not the wrapper is active and currently detecting. A value of false will also remove the wrapper classes. | true | Boolean |
| direction | Whether to detect viewport intersection vertically (‘block’), horizontally (‘inline’) or in both directions ('both'). This means when in block-mode the `--outside-viewport--before` class modifier is set when the element is above the viewport, and the `--outside-viewport--after` modifier is when below. When in inline-mode ‘before’ is left and ‘after’ is right. Before and after will not be set when 'both' is selected. | ‘block’ | String |
| options | Options set when the component is first mounted. See the overview below. | {} | Object |

### Options overview

All the properties in the options-prop are values, that should be set on mount and then left alone.

| Property | Description | Default value | Data type |
| -------- | ----------- | ------------- | --------- |
| initState | The initiary state before any detection is done. A value of 'inside' will have the element starting with the `--inside-viewport` class modifier, and 'outside' will have it start without it. 'before' will have it start with the `--outside-viewport--before` class modifier, and 'after' will have it start with the `--outside-viewport--after` class modifier. | 'inside' | String |
| appearOnce | If set to true, the `--inside-viewport` class modifier will be set only once to never be removed again. Internally tracking of intersections will stop when this happens. | true | Boolean |
| triggerEvents | An array of which events the internal update-function should also run on, other than on the intersection updates. This can be used for smoother gradients of values.\* | [] | Array |
| root | The root of the intersection observer. [Read more.](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver/root) | null / viewport | Object |
| rootMargin | The root margin of the intersection observer. [Read more.](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver/rootMargin) | ‘0px 0px 0px 0px’ | String |
| thresholds | The thresholds of the intersection observer. [Read more.](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver/thresholds) | [0] | Array |
| delay | Set a delay between polling of intersections and trigger events. This can either be a number (miliseconds) or the string 'animationFrame' to utilize \`window.requestAnimationFrame()\`. | 0 | Number or String |

\*The trigger events can either just be the event name as a string or an object. If an object, it shall have a \`name\` property (this being the event name), but may also have a \`target\` property (the caller of the event, defaults to window) an \`options\` property which will be passed to the event.

### Events overview

| Event | Description |
| ----- | ----------- |
| enter | Event triggering when the wrapper content enters into the viewport. The element needs only be partially within the viewport. |
| leave | Event triggering when the wrapper content leaves the viewport. The element needs to leave the viewport fully. |
| update | Event triggering whenever the viewport changes while the wrapper content is within view. This event will also be triggered by events set by the `triggerEvents` option. |

Each of the event types pass an event object when called upon, and structurally the event object will be the same no matter the event. The object will contain the following properties:

| Property | Description |
| -------- | ----------- |
| target | A reference to the element currently observed. |
| intersectionRatio | A value going from 0 (fully out of view) to 1 (fully in view). |
| isIntersecting | Boolean value telling if the target is either fully or partially inside the viewport. |
| isBeforeViewport | Boolean value telling whether the target is outside the view in the before-direction (left or upwards depending on set direction). |
| isAfterViewport | Boolean value telling whether the target is outside the view in the after-direction (right or downwards depending on set direction). |
| boundingClientRect | Returns the bounds rectangle of the target element as a DOMRectReadOnly. |
| intersectionRect | Returns a DOMRectReadOnly representing the target’s visible area. |
| rootBounds | Returns a DOMRectReadOnly for the intersection observer’s root. |
| time | A DOMHighResTimeStamp indicating the time at which the intersection was recorded, relative to the IntersectionObserver’s time origin. |

## Exposed slot props

Other than listening to the events and looking at the classes, the wrapper also exposes a set of properties to be utilized.
The exposed props are a selection of the data present in the events: The `intersectionRatio`, `isIntersecting`, `isBeforeViewport` and `isAfterViewport`.

## General notes

This wrapper have four main parts, which needs to speak together for it to work.

1. The intersection observer. This needs to be updated, if the options change, and it needs to update the observed element if it changes.
2. The classes. These need to actively change based on the current situation, but not more than necessary, as too many DOM-changes can become slow.
3. The trigger events. These should only be active when they are needed. Also they shall not generate the data for observations (element bounds, calculated intersection ratio, etc.) when it is not needed (for example, if there is a delay set, it shouldn't calculate anything before the delay is reached).
4. The slotted element. Which can change or be non-existant.

These four parts all have an effect on each other, and if one changes then often the others need to change as well. If bugs are encountered, it is of high likelyhood happening in the intersection bewteen two or more of these parts.

## Notes on possible improvement

* Add another intersectionRatio-esque value. This value should represent the element's journey into, through and out of the viewport, being a steady value from 0 (while the viewport is before the element) going through .5 (when the element is centered in the viewport) to 1 (when the viewport has passed the element). This should should take into consideration, whether the element is bigger than the viewport or smaller.
* Add global options to be used as defaults.