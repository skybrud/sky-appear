# sky-appear
Vue directive plugin for exposing style classes to elements entering the viewport

## Installation
```bash
npm install sky-appear
```
or
```bash
yarn add sky-appear
```

## Usage
Begin by importing and installing the SkyAppear Vue plugin:
```js
import Vue from 'vue';
import SkyAppear from 'sky-appear';

Vue.use(SkyAppear);
```
or with global options (displaying default values).
```js
Vue.use(SkyAppear, {
	delay: false,
	delayFunction: entry => entry.intersectionRect.top / entry.rootBounds.height * 50,
});
```
**delay**: add class `appear` immediately after the elements enters the viewport.
**delayFunction**: the algorithem deciding the delay length in milliseconds (ms) `entry` is provided by intersection observer. [https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserverEntry]

### Basic example:
Adds the class `sky-appear` when the dom is loaded. When the element enters the viewport the class `appear` is added.
``` html
<div v-sky-appear>
	Show only when entering the viewport
</div>
```

### Callback function exampel:
Same as basic exampel, but `SkyAppear` will also run the callback function when the element enters the viewport.
``` html
<div v-sky-appear="myCallback">
	Show only when entering the viewport
</div>
```

