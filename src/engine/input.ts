export class Input {
	private static keys = new Set<Key>();
	private static keysPressed = new Set<Key>();
	private static keysReleased = new Set<Key>();
	private static mouseDowns: boolean[] = [false, false, false];
	private static mouseHits: boolean[] = [false, false, false];
	private static mouseUps: boolean[] = [false, false, false];
	private static mx: number = 0;
	private static my: number = 0;
	private static mouseWheelDeltaX: number = 0;
	private static mouseWheelDeltaY: number = 0;

	static init(canvas: HTMLCanvasElement): void {
		window.addEventListener("keydown", e => {
			const key = e.code as Key;
			if (!this.keys.has(key)) {
				this.keysPressed.add(key);
			}
			this.keys.add(key);
		});
		window.addEventListener("keyup", e => {
			const key = e.code as Key;
			this.keys.delete(key);
			this.keysReleased.add(key);
		});

		canvas.addEventListener("contextmenu", e => e.preventDefault());
		canvas.addEventListener("mousedown", e => {
			const b = e.button;
			if (b <= 2 && !this.mouseDowns[b]) this.mouseHits[b] = true;
			if (b <= 2) this.mouseDowns[b] = true;
		});
		canvas.addEventListener("mouseup", e => {
			const b = e.button;
			if (b <= 2) {
				this.mouseDowns[b] = false;
				this.mouseUps[b] = true;
			}
		});
		canvas.addEventListener("mousemove", e => {
			const rect = canvas.getBoundingClientRect();
			this.mx = e.clientX - rect.left;
			this.my = e.clientY - rect.top;
		});
		canvas.addEventListener("wheel", e => {
			let scale = 1;
			switch (e.deltaMode) {
				case WheelEvent.DOM_DELTA_LINE:
					scale = 16;
					break;
				case WheelEvent.DOM_DELTA_PAGE:
					scale = canvas.clientHeight || 800;
					break;
			}
			this.mouseWheelDeltaX = e.deltaX * scale;
			this.mouseWheelDeltaY = e.deltaY * scale;
		});
	}

	static update(): void {
		this.mouseHits.fill(false);
		this.mouseUps.fill(false);
		this.keysPressed.clear();
		this.keysReleased.clear();
		this.mouseWheelDeltaX = 0;
		this.mouseWheelDeltaY = 0;
	}

	static keyDown(key: Key): boolean {
		return this.keys.has(key);
	}

	static keyHit(key: Key): boolean {
		return this.keysPressed.has(key);
	}

	static keyUp(key: Key): boolean {
		return this.keysReleased.has(key);
	}

	static mouseDown(button: Mouse = Mouse.Left): boolean {
		return this.mouseDowns[button];
	}

	static mouseHit(button: Mouse = Mouse.Left): boolean {
		return this.mouseHits[button];
	}

	static mouseUp(button: Mouse = Mouse.Left): boolean {
		return this.mouseUps[button];
	}

	static mouseX(): number {
		return this.mx;
	}

	static mouseY(): number {
		return this.my;
	}

	static mouseWheelX(): number {
		return this.mouseWheelDeltaX;
	}

	static mouseWheelY(): number {
		return this.mouseWheelDeltaY;
	}

}

export enum Mouse {
	Left = 0,
	Middle = 1,
	Right = 2,
}

export enum Key {
	// Letters
	A = "KeyA",
	B = "KeyB",
	C = "KeyC",
	D = "KeyD",
	E = "KeyE",
	F = "KeyF",
	G = "KeyG",
	H = "KeyH",
	I = "KeyI",
	J = "KeyJ",
	K = "KeyK",
	L = "KeyL",
	M = "KeyM",
	N = "KeyN",
	O = "KeyO",
	P = "KeyP",
	Q = "KeyQ",
	R = "KeyR",
	S = "KeyS",
	T = "KeyT",
	U = "KeyU",
	V = "KeyV",
	W = "KeyW",
	X = "KeyX",
	Y = "KeyY",
	Z = "KeyZ",

	// Numbers (Top row)
	Digit0 = "Digit0",
	Digit1 = "Digit1",
	Digit2 = "Digit2",
	Digit3 = "Digit3",
	Digit4 = "Digit4",
	Digit5 = "Digit5",
	Digit6 = "Digit6",
	Digit7 = "Digit7",
	Digit8 = "Digit8",
	Digit9 = "Digit9",

	// Arrows
	Up = "ArrowUp",
	Down = "ArrowDown",
	Left = "ArrowLeft",
	Right = "ArrowRight",

	// Modifiers
	ShiftLeft = "ShiftLeft",
	ShiftRight = "ShiftRight",
	ControlLeft = "ControlLeft",
	ControlRight = "ControlRight",
	AltLeft = "AltLeft",
	AltRight = "AltRight",

	// Special
	Space = "Space",
	Enter = "Enter",
	Escape = "Escape",
	Tab = "Tab",
	Backspace = "Backspace",

	// Function keys
	F1 = "F1",
	F2 = "F2",
	F3 = "F3",
	F4 = "F4",
	F5 = "F5",
	F6 = "F6",
	F7 = "F7",
	F8 = "F8",
	F9 = "F9",
	F10 = "F10",
	F11 = "F11",
	F12 = "F12"
}
