import { Input, Key } from "./input";
import { echo } from "./utils";
const NativeAudio = window.Audio;

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
	private static soundCache: Map<string, Sound> = new Map();
	private static musicPlayer: MusicPlayer
	private static preloadedTrack: MusicTrack | null;
	private static preloadedUrl: string | null = "";

	static init(): void {
		this.context = new AudioContext();
		const master = new Submix(this.context, null);
		const music = new Submix(this.context, master);
		const sfx = new Submix(this.context, master);
		this.submixes = [master, music, sfx];
		this.musicPlayer = new MusicPlayer(this.context, music);
	}

	// Sounds
	static async loadSound(url: string): Promise<Sound> {
		if (this.soundCache.has(url)) {
			return this.soundCache.get(url)!;
		}
		const response = await fetch(url);
		const arrayBuffer = await response.arrayBuffer();
		const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
		const sound = new Sound(audioBuffer);
		this.soundCache.set(url, sound);
		return sound
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

	// Music
	static async playMusic(url: string): Promise<void> {
		if (this.preloadedTrack && url === this.preloadedUrl) {
			this.musicPlayer.playMusic(this.preloadedTrack);
			this.preloadedTrack = null;
			this.preloadedUrl = "";
			return Promise.resolve();
		}
		return this.musicPlayer.playMusicFromUrl(url);
	}

	static async loadMusic(url: string): Promise<void> {
		this.preloadedTrack = await this.musicPlayer.loadMusic(url);
		if (this.preloadedTrack) {
			this.preloadedUrl = url;
		}
	}

	static pauseMusic(): void {
		this.musicPlayer.pause();
	}

	static resumeMusic(): void {
		this.musicPlayer.resume();
	}

	static fadeMusic(targetVolume: number, duration: number = 1.0): void {
		this.musicPlayer.fadeTo(targetVolume, duration)
	}

	static seekMusic(time: number): void {
		this.musicPlayer.seek(time);
	}

	// Global
	static setVolume(volume: number, id: SubmixID = SubmixID.Master): void {
		this.submixes[id].setVolume(volume);
	}

	static pauseAll(): void {
		if (this.context.state === "running") {
			this.context.suspend();
		}
	}

	static resumeAll(): void {
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
	}

}


interface MusicTrack {
	element: HTMLAudioElement,
	gain: GainNode
}

class MusicPlayer {
	private context: AudioContext;
	private submix: Submix;
	private current: MusicTrack | null = null

	constructor(audioContext: AudioContext, submix: Submix) {
		this.context = audioContext;
		this.submix = submix;
	}

	async loadMusic(url: string): Promise<MusicTrack> {
		const element = new NativeAudio(url);
		element.loop = true;
		element.crossOrigin = "anonymous";
		element.preload = "auto";

		// Ensure audio can play without delays
		element.pause();
		element.currentTime = 0;

		// Set up Web Audio API: create source and gain node
		const source = this.context.createMediaElementSource(element);
		const gain = this.context.createGain();
		gain.gain.value = 1;
		source.connect(gain).connect(this.submix.input());

		return { element, gain };
	}

	playMusic(track: MusicTrack): void {
		const { element, gain } = track;
		if (this.current) {
			this.stop();
		}
		this.current = { element, gain };
		element.play();
		this.context.resume();
	}

	playMusicFromUrl(url: string): Promise<void> {
		return this.loadMusic(url).then((track) => {
			this.playMusic(track);
		})
	}

	pause(): void {
		if (this.current) {
			this.current.element.pause();
		}
	}

	resume(): void {
		if (this.current) {
			this.current.element.play();
		}
	}

	stop(): void {
		if (this.current) {
			this.current.element.pause();
			this.current.gain.disconnect();
			this.current = null;
		}
	}

	seek(time: number): void {
		if (this.current) {
			this.current.element.currentTime = time;
		}
	}

	fadeTo(value: number, duration: number = 1): void {
		if (!this.current) return;
		const g = this.current.gain.gain;
		g.cancelScheduledValues(this.context.currentTime);
		g.linearRampToValueAtTime(value, this.context.currentTime + duration);
		if (value > 0.0) {
			this.resume();
		} else {
			setTimeout(() => {
				this.pause()
			}, duration * 1000.0);
		}
	}

}



// testing
export function testSound() {
	testSoundSimple();
	// testMusicSound();
	// testMusicStream();
}

function testSoundSimple() {
	if (Input.keyHit(Key.Space)) {
		Audio.setVolume(1)
		const ms = performance.now();
		Audio.loadSound("/sounds/cast_hero.wav").then((sound) => {
			echo(performance.now() - ms)
			Audio.playSound(sound, { rate: 1.2 })
		})
	}
}

function testMusicSound() {
	const ms = Date.now();
	Audio.loadSound("/music/battle.ogg").then((sound) => {
		echo(Date.now() - ms)
		Audio.playSound(sound)
	})
}

function testMusicStream() {
	if (Input.keyHit(Key.Space)) {
		const ms = performance.now();
		Audio.playMusic("/music/battle.ogg").then(() => {
			echo(performance.now() - ms)
		})
		// Audio.musicPlayer.fadeTo(1.0, 2.0);
	} else if (Input.keyHit(Key.Digit1)) {
		Audio.pauseMusic()
		// Audio.fadeMusic(0.0, 1.0);
	} else if (Input.keyHit(Key.Digit2)) {
		Audio.resumeMusic()
	}
}