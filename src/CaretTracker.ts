import EphemeralRollingMap from "./lib/EphemeralRollingMap";

type CharSize = {
	width: number;
	height: number;
}

type Position = {
	left: number;
	top: number;
} & CharSize;

export type CaretSpec = {
	target: HTMLInputElement | HTMLTextAreaElement;
} & Position;

const voidFn = Object.freeze(() => undefined);

class CaretTracker {
	#positionCache = new EphemeralRollingMap<Position>(1000);
	#clipBox: HTMLDivElement | undefined;
	#caret: HTMLDivElement | undefined;
	#parent!: HTMLElement;
	#faux: HTMLDivElement | undefined;

	#lastContext: any[] = [];

	#killController: AbortController | undefined;

	applyToInputTypes = [
		"textarea",
		"text",
		"password",
		"search",
		"tel",
		"url",
	];

	className = "caretTrackerCustomCaret";
	endCharacterReplacement: string = " ";
	clip = true;

	customCaretCallback: (spec: CaretSpec) => Node | undefined = voidFn;
	onChange: (spec: CaretSpec | null) => void = voidFn;

	constructor(parent: HTMLElement | undefined) {
		if (parent) this.mount(parent);
	}

	#isAllowedType(element: Element | null): element is HTMLInputElement | HTMLTextAreaElement {
		if (!element || element === document.body) return false;
		if (element instanceof HTMLTextAreaElement && this.applyToInputTypes.includes("textarea")) return true;
		if (!(element instanceof HTMLInputElement)) return false;
		return this.applyToInputTypes.includes(element.getAttribute("type") || "text");
	}

	#isSameContext(context: any[]) {
		if (context.length !== this.#lastContext.length) return false;
		for (let i=0; i<this.#lastContext.length;i++) {
			if (context[i] !== this.#lastContext[i]) return false;
		}
		return true;
	}

	#getRelativePosition(activeElement: HTMLInputElement | HTMLTextAreaElement, text: string, caret: number): Position {
		const aeStyle = getComputedStyle(activeElement);
		const pad: [number, number] = [parseFloat(aeStyle.paddingLeft), parseFloat(aeStyle.paddingTop)];
		const width = activeElement.clientWidth - pad[0] - parseFloat(aeStyle.paddingRight);
		const height = activeElement.clientHeight - pad[1] - parseFloat(aeStyle.paddingBottom);
		const font = aeStyle.font;
		const multiLine = activeElement.tagName.toUpperCase() === "TEXTAREA";
		const context = [font, width, height, multiLine, text];
		const cached = this.#positionCache.get(context, caret);
		if (cached) {
			return {
				left: cached.left,
				top: cached.top,
				width: cached.width,
				height: cached.height,
			};
		}

		if (!this.#faux) this.#faux = document.createElement("div");

		if (!this.#isSameContext(context)) {
			// Add a zero-width space and an end-character replacement so the cursor knows where the next new character
			// will go at the end of the text.
			this.#faux.textContent = text + `\u200B${this.endCharacterReplacement || " "}`;

			this.#faux.style.cssText = "position: absolute; top: 0; left: 0";
			this.#faux.style.whiteSpace = multiLine ? "pre-wrap" : "pre";
			for (const s of ["font", "whiteSpace"] as const) {
				this.#faux.style.setProperty(s, aeStyle[s]);
			}
			this.#faux.style.overflow = aeStyle.overflow.replace(/clip|scroll|auto/g, "hidden");
			this.#faux.style.setProperty("width", width + "px");
			this.#faux.style.setProperty("height", height + "px");
			this.#faux.style.setProperty("overflow-wrap", "break-word");

			this.#lastContext = context;
		}
		document.body.appendChild(this.#faux);

		const range = new Range();
		const rangeChars: [number, number] = caret < text.length ? [caret, caret + 1] : [text.length + 1, text.length + 2];
		range.setStart(this.#faux.childNodes[0]!, rangeChars[0]);
		range.setEnd(this.#faux.childNodes[0]!, rangeChars[1]);
		const fauxRect = this.#faux.getBoundingClientRect();
		let rangeRect: { left: number, top: number, width: number, height: number } = range.getBoundingClientRect();
		rangeRect = {
			left: rangeRect.left - fauxRect.left,
			top: rangeRect.top - fauxRect.top,
			// These have to be explicitly copied.
			// Don't try to spread them in. A DomRect doesn't have enumerable properties.
			width: rangeRect.width,
			height: rangeRect.height,
		};

		this.#faux.remove();

		rangeRect = {
			...rangeRect,
			left: rangeRect.left + pad[0],
			top: rangeRect.top + pad[1],
		}

		this.#positionCache.set(context, caret, rangeRect);
		return rangeRect;
	};

	#measure(activeElement: HTMLElement | HTMLTextAreaElement | null): CaretSpec | null  {
		if (!(this.#isAllowedType(activeElement) && this.#parent.contains(activeElement))) {
			return null;
		}

		const text = activeElement.value;
		const caret = (activeElement.selectionDirection === "backward" ? activeElement.selectionStart : activeElement.selectionEnd) ?? 0;
		const relPos = this.#getRelativePosition(activeElement, text, caret);
		return {
			target: activeElement,
			left: relPos.left - activeElement.scrollLeft,
			top: relPos.top - activeElement.scrollTop,
			width: relPos.width,
			height: relPos.height,
		};
	};

	#handle() {
		const activeElement = document.activeElement;
		const pos = this.#measure(activeElement as HTMLElement | null);

		if (!(activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement) || !pos) {
			this.#clipBox?.remove();
			this.onChange?.(null);
			return;
		}

		if (!this.#caret) {
			this.#caret = document.createElement("div");
			this.#caret.style.cssText = "position: absolute;"
		}

		this.#caret.style.left = pos.left + "px";
		this.#caret.style.top = pos.top + "px";
		this.#caret.style.width = pos.width + "px";
		this.#caret.style.height = pos.height + "px";
		this.#caret.className = this.className;

		const newCaret: Node | undefined = this.customCaretCallback(pos);
		if (newCaret) this.#caret.replaceChildren(newCaret);

		this.#clipBox = this.#clipBox ?? document.createElement("div");
		this.#clipBox.style.cssText = `position: absolute; pointer-events: none; left: ${activeElement.offsetLeft}px; top: ${activeElement.offsetTop}px; width: ${activeElement.clientWidth}px; height: ${activeElement.clientHeight}px;`;
		this.#clipBox.style.overflow = this.clip ? "hidden" : "visible";

		// Conditionally do this because it restarts animation.
		if (activeElement.previousElementSibling !== this.#clipBox) {
			this.#clipBox.replaceChildren(this.#caret);
			activeElement.parentNode?.insertBefore(this.#clipBox, activeElement);
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
		this.#parent.addEventListener("scroll", this.#handle.bind(this), {capture: true, signal: this.#killController.signal});
	}

	unmount() {
		if (!this.#killController || this.#killController.signal.aborted) {
			return;
		}

		this.#faux?.remove();
		this.#clipBox?.remove();
		this.#caret?.remove();

		this.#faux = undefined;
		this.#caret = undefined;
		this.#clipBox = undefined;

		this.#positionCache.clear();
		this.#killController.abort("Unmount");
	}
}

export default CaretTracker;