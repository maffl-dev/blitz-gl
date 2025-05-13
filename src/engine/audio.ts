import { echo } from "./utils";

export interface SoundOptions {
	submixId?: SubmixID
	loop?: boolean
	rate?: number
	detune?: number
}

export enum SubmixID {
	Master,
	Music,
	Sfx
}

export class Audio {
	private static context: AudioContext;
	private static submixes: [Submix, Submix, Submix];

	static init(): void {
		this.context = new AudioContext();
		const master = new Submix(this.context, null);
		const music = new Submix(this.context, master);
		const sfx = new Submix(this.context, master);
		this.submixes = [master, music, sfx];
	}

	static async loadSound(url: string): Promise<Sound> {
		const response = await fetch(url);
		const arrayBuffer = await response.arrayBuffer();
		const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
		return new Sound(audioBuffer);
	}

	static playSound(sound: Sound, options: SoundOptions = {}) {
		const source = this.context.createBufferSource();
		const { submixId = SubmixID.Sfx, loop = false, rate = 1.0, detune = 0.0 } = options;
		source.loop = loop;
		source.playbackRate.value = rate;
		source.detune.value = detune
		source.buffer = sound.buffer;
		source.connect(this.submixes[submixId].input());
		source.start();
	}

	static setVolume(volume: number, id: SubmixID = SubmixID.Master): void {
		this.submixes[id].setVolume(volume);
	}

	static pause(): void {
		if (this.context.state === "running") {
			this.context.suspend();
		}
	}

	static resume(): void {
		if (this.context.state === "suspended") {
			this.context.resume();
		}
	}

}

class Submix {
	context: AudioContext;
	gain: GainNode;
	parent: Submix | null;

	constructor(context: AudioContext, parent: Submix | null = null) {
		this.context = context;
		this.gain = context.createGain();
		this.parent = parent;
		if (parent) {
			this.gain.connect(parent.gain);
		} else {
			this.gain.connect(context.destination);
		}
	}

	setVolume(volume: number): void {
		this.gain.gain.setValueAtTime(volume, this.context.currentTime);
	}

	input(): AudioNode {
		return this.gain;
	}
}


export class Sound {
	buffer: AudioBuffer;

	constructor(buffer: AudioBuffer) {
		this.buffer = buffer;
		echo(buffer)
	}
}





// testing
export function testSound() {
	Audio.setVolume(1)
	Audio.loadSound("/sounds/cast_hero.wav").then((sound) => {
		Audio.playSound(sound, { rate: 1.2 })
	})


}