# @superfleb/caret

*"All this? To make a blinky cursor?"*

Yep. Since there's no way to get the screen coordinates of the caret or selection in an INPUT or TEXTAREA field, and the
only customization you can do to the input caret is coloring the bar with "caret-color" CSS. Pretty weak. If you want to
know where the caret is in x/y space, you have to reproduce the text input as a different element so you can use ranges
(or other means) to find the relative screen location.

So, that's what this does. Give it a parent element, and any text inputs under that will have a `.caretTrackerCustomCaret`
element hovered over the operative character. You can style it to make whatever type of cursor you want, or use that
information for whatever suits your purpose.

## Current State of Things

We're calling this "not quite ready for prime time". It's mostly there, but it's got a couple of bugs to wring out still,
and I haven't put in tests yet, so it's still version zero. More coming soon to wrap that up.

### Known/anticipated issues

- Doesn't respond to document reflow. The cursor doesn't move until something happens to update it.

### Known limitations (not bugs)

- Z-order must be enforced manually. Usually, this isn't a problem because input boxes don't tend to have layout so any
  absolute-positioned element will overlay them, but if you're doing something fancier, you'll have to compensate.

## To get it

This isn't currently on the NPM registry, only on GitHub Registry. To get it, generate a GitHub Personal Access Token
(PAT) and use the GitHub registry.

NPM:
```shell
(instructions coming soon)
```

Yarn 2+:
```shell
# You only need to do these two initially
yarn config set npmScopes.superfleb.npmRegistryServer https://npm.pkg.github.com
yarn config set npmScopes.superfleb.npmAlwaysAuth true

# You will be prompted to log in. Use YOUR username and PAT.
yarn npm login --scope superfleb
yarn add @superfleb/caret
```

## Use

Instantiate and use a CaretTracker to monitor all input and textarea fields under the parent DOM element and apply a
custom caret. You can provide a parent to the constructor, which will start the tracker immediately:

The library is available in ES6, CommonJS, and plain JS (script tag) formats.
```javascript
import CaretTracker from "@superfleb/caret-tracker";
const tracker = new CaretTracker();
```
```javascript
const CaretTracker = require("@superfleb/caret-tracker");
const tracker = new CaretTracker();
```
```html
<script src="CaretTracker.js"></script>
<script>
    const tracker = new CaretTracker();
</script>
```
(For the SCRIPT tag version, get CaretTracker.js from /dist/js/CaretTracker.min.js.)

or omit the parent element to start and mount it element later, perhaps after further configuration:
```javascript
const tracker = new CaretTracker(parentElement);
/* ... */
tracker.mount(parentElement);
```

Configuration options are set on the object instance, such as...
```javascript
// (default true) Clip/hide the custom caret when the caret is outside the bounds of a scrolling textarea.
tracker.clip = true;
// (default " ") What character's width will define the caret width when the caret is at the end of a line or input and no character is available?
tracker.endCharacterReplacement = " ";
// (default "caretTrackerCustomCaret") Class name for the caret element
tracker.className = "caretTrackerCustomCaret"
// Callback function to run on each change to define custom contents for the custom caret DOM element.
tracker.customCaretCallback = function (spec /* CaretSpec */) { return caret /* Element | DocumentFragment | undefined */; }
// Event function that runs on each change. Return value is ignored.
tracker.onChange = function (spec /* CaretSpec */) { /* ...your code here... */ }
// Input types to apply the effect to. Any beyond this list do not/may not work with the effect.
tracker.applyToInputTypes = [
	"textarea",
	"text",
	"password",
	"search",
	"tel",
	"url",
];
```