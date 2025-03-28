import EphemeralRollingMap from "./lib/EphemeralRollingMap";
import RollingMap from "./lib/RollingMap";

type RelativePosition = {
	left: number;
	top: number;
}

type Position = {
	offsetTop: number;
	offsetLeft: number;
	clientTop: number;
	clientLeft: number;
}

type CharSize = {
	width: number;
	height: number;
}

export type CaretSpec = {
	target: HTMLInputElement | HTMLTextAreaElement;
} & Position & CharSize;

const voidFn = Object.freeze(() => undefined);

class CaretTracker {
	#positionCache = new EphemeralRollingMap<RelativePosition>(300);
	#sizeCache = new RollingMap<CharSize>(300);
	#caret!: HTMLDivElement;
	#parent!: HTMLElement;
	#faux: document.createElement("div");

	#killController: AbortController | undefined;

	className = "caretTrackerCustomCaret";
	endCharacterReplacement: string = " ";
	customCaretCallback: (spec: CaretSpec) => Element | DocumentFragment | undefined;
	onChange: (spec: CaretSpec | null) => void;

	constructor(parent: HTMLElement | undefined, customCaretCallback = voidFn, onChange = voidFn, endCharacterReplacement: string = " ") {
		this.endCharacterReplacement = endCharacterReplacement;
		this.customCaretCallback = customCaretCallback;
		this.onChange = onChange;
		if (parent) this.mount(parent);
	}

	#getRelativePosition(activeElement: HTMLInputElement | HTMLTextAreaElement, text: string, caret: number): RelativePosition {
		const style = getComputedStyle(activeElement);
		const width = activeElement.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
		const height = activeElement.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
		const font = style.font;
		const contextKey = [font, width, height, text];

		const cached = this.#positionCache.get(contextKey, caret);
		if (cached) {
			return {
				left: cached.left,
				top: cached.top,
			};
		}

		const multiLine = activeElement.tagName.toUpperCase() === "TEXTAREA";
		const textBefore = activeElement.value.slice(0, caret);
		const textAfter = activeElement.value.slice(caret).match(/^[^\s]*\s?/)?.[0];
		const aeStyle = getComputedStyle(activeElement, null);

		document.getElementById("faux")?.remove();

		const faux = document.createElement("div");
		faux.setAttribute("id","faux");

		faux.textContent = "";

		// \u2060 is a "No-break" character that prevents line breaks from happening. We use this to stitch together the
		// last word and simulate line wrapping. Thanks to Gunther Schadow on https://stackoverflow.com/questions/63769583
		// for the tip.
		faux.appendChild(document.createTextNode(textBefore + "\u2060"));
		const point = document.createElement("span");
		faux.appendChild(point);
		if (multiLine) {
			faux.appendChild(document.createTextNode("\u2060" + textAfter));
		}
		faux.style.cssText = "position: absolute; top: 0; left: 0";
		faux.style.whiteSpace = multiLine ? "pre-wrap" : "pre";
		for (const s of ["font", "whiteSpace"] as const) {
			faux.style.setProperty(s, aeStyle[s]);
		}
		faux.style.overflow = aeStyle.overflow.replace(/clip|scroll|auto/g, "hidden");
		faux.style.setProperty("width", activeElement.clientWidth -  + "px");
		faux.style.setProperty("height", activeElement.clientHeight + "px");
		faux.style.setProperty("overflow-wrap", "break-word");

		document.body.appendChild(faux);
		const pointRect = point.getBoundingClientRect();

		// faux.remove();

		const pos = {
			left: pointRect.left + parseFloat(aeStyle.paddingLeft),
			top: pointRect.top + parseFloat(aeStyle.paddingTop),
		};

		this.#positionCache.set(contextKey, caret, pos);
		return pos;
	};

	#getCharacterSize(char: string, font: string): CharSize {
		char = (char || this.endCharacterReplacement)[0] ?? "";
		const key = char + font;
		const cached = this.#sizeCache.get(key);
		if (cached) return cached;

		const chrDiv = document.createElement("div");
		chrDiv.style.cssText = `all: initial; position: absolute; white-space: pre; font: ${font}`;
		chrDiv.textContent = char;
		document.body.appendChild(chrDiv);
		const {width, height} = chrDiv.getBoundingClientRect();
		chrDiv.remove();

		this.#sizeCache.set(key, {width, height});
		return {width, height};
	};

	#measure(activeElement: HTMLElement | HTMLTextAreaElement | null): CaretSpec | null  {
		if (
			activeElement === null ||
			activeElement === document.body ||
			!(
				activeElement instanceof HTMLInputElement ||
				activeElement instanceof HTMLTextAreaElement
			)
		|| !this.#parent.contains(activeElement)) {
			return null;
		}

		const text = activeElement.value;
		const caret = activeElement.selectionEnd ?? 0;
		const lastChar = text.slice(caret, caret + 1);
		const font = getComputedStyle(activeElement).font;

		const relPos = this.#getRelativePosition(activeElement, text, caret);
		const {width, height} = this.#getCharacterSize(lastChar, font);
		const elementRect = activeElement.getBoundingClientRect();

		return {
			target: activeElement,
			offsetLeft: relPos.left - activeElement.scrollLeft + activeElement.offsetLeft,
			offsetTop: relPos.top - activeElement.scrollTop + activeElement.offsetTop,
			clientLeft: relPos.left - activeElement.scrollLeft + elementRect.left,
			clientTop: relPos.top - activeElement.scrollTop + elementRect.top,
			width,
			height,
		};
	};

	#handle() {
		const activeElement = document.activeElement;
		const pos = this.#measure(activeElement as HTMLElement | null);

		if (!activeElement || !pos) {
			this.#caret.remove();
			this.onChange?.(null);
			return;
		}

		if (!this.#caret) {
			this.#caret = document.createElement("div");
			this.#caret.style.cssText = "position: absolute;"
		}

		this.#caret.style.left = pos.offsetLeft + "px";
		this.#caret.style.top = pos.offsetTop + "px";
		this.#caret.style.width = pos.width + "px";
		this.#caret.style.height = pos.height + "px";
		this.#caret.className = this.className;

		const newCaret: DocumentFragment | Element | undefined = this.customCaretCallback(pos);
		if (newCaret) this.#caret.replaceChildren(newCaret);
		// Conditionally do this because it restarts animation.
		if (activeElement.previousElementSibling !== this.#caret) {
			activeElement.parentNode?.insertBefore(this.#caret, activeElement);
		}
		this.onChange?.(pos);
	}

	mount(parent: HTMLElement | undefined = undefined) {
		if (this.#killController && !this.#killController.signal.aborted) {
			this.unmount();
		}
		this.#parent = parent ?? this.#parent ?? document.body;
		this.#killController = new AbortController();
		for (const event of ["input", "click", "keydown", "keyup", "focusin", "focusout"]) {
			this.#parent.addEventListener(event, this.#handle.bind(this), {signal: this.#killController.signal});
		}
	}

	unmount() {
		if (!this.#killController || this.#killController.signal.aborted) {
			return;
		}
		this.#caret.remove();
		this.#caret = undefined;
		// Don't clear the character cache. It's cheap and useful. It can get GC'd with the class.
		// Clear the position cache, though. If we're unmounting, we're probably changing active elements.
		this.#positionCache.clear();
		this.#killController.abort("Unmount");
	}
}

export default CaretTracker;