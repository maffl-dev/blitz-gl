import { Input, Key, Mouse } from "./input";
import { assert, echo, profile } from "./utils";

const NativeAudio = window.Audio;
const AUDIO_MAX_CHANNELS: number = 32;

export interface SoundOptions {
	channel?: number;
	submixId?: SubmixID
	loop?: boolean
	rate?: number
	pan?: number,
	detune?: number,
	volume?: number
}

export enum SubmixID {
	Master,
	Music,
	Sfx
}

export type FadeType = "linear" | "target" | "exponential";
export type ChannelState = "stopped" | "paused" | "playing";


export class Audio {
	private static context: AudioContext;
	private static submixes: [Submix, Submix, Submix];
	private static soundCache: Map<string, Sound> = new Map();
	private static channels: Channel[] = new Array(AUDIO_MAX_CHANNELS);
	private static musicPlayer: MusicPlayer
	private static preloadedTrack: MusicTrack | null;
	private static preloadedUrl: string | null = "";

	static init(): void {
		this.context = new AudioContext();
		const master = new Submix(this.context, null);
		const music = new Submix(this.context, master);
		const sfx = new Submix(this.context, master);
		for (let i = 0; i < AUDIO_MAX_CHANNELS; i++) {
			this.channels[i] = new Channel(this.context, sfx.input());
		}
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

	static playSound(sound: Sound | string, options: SoundOptions = {}) {
		if (typeof sound === 'string') {
			this.loadSound(sound).then((loadedSound) => {
				this.playSoundInternal(loadedSound, options);
			});
		} else {
			this.playSoundInternal(sound, options);
		}
	}

	private static playSoundInternal(sound: Sound, options: SoundOptions): void {
		const {
			channel = -1,
			loop = false,
			submixId = SubmixID.Sfx,
			volume = 1.0,
			rate = 1.0,
			detune = 0.0
		} = options;

		const targetInput = this.submixes[submixId].input();

		if (channel >= 0) {
			assertChannel(channel, "playSound");
			this.channels[channel].play(this.context, sound, options);
		} else {
			const source = this.context.createBufferSource();
			source.buffer = sound.buffer;
			source.loop = loop;
			source.playbackRate.value = rate;
			source.detune.value = detune;

			if (volume < 1.0) {
				const gainNode = this.context.createGain();
				gainNode.gain.setValueAtTime(volume, this.context.currentTime)
				source.connect(gainNode);
				gainNode.connect(targetInput);
				source.start();
				source.onended = () => {
					source.disconnect();
					gainNode.disconnect();
				};
			} else {
				source.connect(targetInput);
				source.start();
			}
		}
	}

	static setChannelVolume(channel: number, volume: number) {
		assertChannel(channel, "setChannelVolume");
		this.channels[channel].setVolume(volume);
	}

	static setChannelPan(channel: number, pan: number) {
		assertChannel(channel, "setChannelPan");
		this.channels[channel].setPan(pan);
	}

	static setChannelRate(channel: number, rate: number) {
		assertChannel(channel, "setChannelRate");
		this.channels[channel].setRate(rate);
	}

	static setChannelDetune(channel: number, detune: number) {
		assertChannel(channel, "setChannelDetune");
		this.channels[channel].setDetune(detune);
	}

	static stopChannel(channel: number) {
		assertChannel(channel, "stopChannel");
		this.channels[channel].stop();
	}

	static pauseChannel(channel: number) {
		assertChannel(channel, "pauseChannel");
		this.channels[channel].pause();
	}

	static resumeChannel(channel: number) {
		assertChannel(channel, "resumeChannel");
		this.channels[channel].resume();
	}

	static fadeChannelTo(channel: number, value: number, duration: number, type: FadeType = "target") {
		assertChannel(channel, "fadeChannelTo");
		this.channels[channel].fadeTo(value, duration, type);
	}

	static channelState(channel: number): ChannelState {
		assertChannel(channel, "channelState");
		return this.channels[channel].getState();
	}

	// Music
	static async playMusic(url: string, loop: boolean = true): Promise<void> {
		if (this.preloadedTrack && url === this.preloadedUrl) {
			this.musicPlayer.playMusic(this.preloadedTrack);
			this.preloadedTrack = null;
			this.preloadedUrl = "";
			return Promise.resolve();
		}
		return this.musicPlayer.playMusicFromUrl(url, loop);
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

	static fadeMusic(targetVolume: number, duration: number = 1.0, type: FadeType = "target"): void {
		this.musicPlayer.fadeTo(targetVolume, duration, type)
	}

	static seekMusic(time: number): void {
		this.musicPlayer.seek(time);
	}

	static isMusicPlaying(): boolean {
		return this.musicPlayer.isPlaying();
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

function assertChannel(channel: number, method: string) {
	assert(channel >= 0 && channel < AUDIO_MAX_CHANNELS, "Audio." + method + ": Invalid channel " + channel);
}

export class Sound {
	buffer: AudioBuffer;

	constructor(buffer: AudioBuffer) {
		this.buffer = buffer;
	}

}

class Channel {
	private context: AudioContext;
	private gainNode: GainNode;
	private panNode: StereoPannerNode;
	private currentSource: AudioBufferSourceNode | null = null;
	private startTime: number = 0;
	private offset: number = 0;
	private isPaused: boolean = false;
	private inputNode: AudioNode;
	private fadeTimeoutId?: ReturnType<typeof setTimeout>;

	private buffer: AudioBuffer | null = null;
	private options: SoundOptions = {};

	constructor(context: AudioContext, submixInput: AudioNode) {
		this.context = context;
		this.gainNode = context.createGain();
		this.panNode = context.createStereoPanner();
		this.panNode.connect(this.gainNode);
		this.gainNode.connect(submixInput);
		this.inputNode = this.panNode;
	}

	getInput(): AudioNode {
		return this.inputNode;
	}

	play(context: AudioContext, sound: Sound, options: SoundOptions): void {
		this.stop();

		const {
			loop = false,
			rate = 1.0,
			detune = 0.0,
			pan = 0.0,
			volume = 1.0
		} = options;

		const source = context.createBufferSource();
		const buffer = sound.buffer;
		let finalBuffer = buffer;
		if (buffer.numberOfChannels === 1) {
			const stereoBuffer = context.createBuffer(2, buffer.length, buffer.sampleRate);
			const monoData = buffer.getChannelData(0);
			stereoBuffer.copyToChannel(monoData, 0);
			stereoBuffer.copyToChannel(monoData, 1);
			finalBuffer = stereoBuffer;
		}
		source.buffer = finalBuffer;
		source.loop = loop;
		source.playbackRate.value = rate;
		source.detune.value = detune;

		this.buffer = finalBuffer;
		this.options = options;
		this.offset = 0;
		this.startTime = context.currentTime;
		this.isPaused = false;

		source.connect(this.inputNode);
		source.start();

		this.setPan(pan);
		this.setVolume(volume);

		this.currentSource = source;
		source.onended = () => {
			if (this.currentSource === source) {
				this.currentSource = null;
			}
		};
	}

	stop(): void {
		if (this.currentSource) {
			try { this.currentSource.stop(); } catch { }
			this.currentSource.disconnect();
			this.currentSource = null;
		}
		this.offset = 0;
		this.isPaused = false;
	}

	pause(): void {
		if (!this.currentSource || this.isPaused) return;
		const context = this.context;
		const elapsed = (context.currentTime - this.startTime) * (this.currentSource.playbackRate.value ?? 1);
		const duration = this.buffer?.duration ?? 0;
		this.offset = elapsed % duration;
		this.currentSource.stop();
		this.currentSource.disconnect();
		this.currentSource = null;
		this.isPaused = true;
	}

	resume(): void {
		if (!this.buffer || !this.isPaused) return;
		const context = this.context;

		const {
			loop = false,
			rate = 1.0,
			detune = 0.0,
			volume = 1.0,
			pan = 0.0
		} = this.options;

		const offset = Math.min(this.offset, this.buffer.duration);
		const source = context.createBufferSource();
		source.buffer = this.buffer;
		source.loop = loop;
		source.playbackRate.value = rate;
		source.detune.value = detune;
		source.connect(this.inputNode);
		source.start(0, offset);

		this.startTime = context.currentTime - offset;
		this.currentSource = source;
		this.isPaused = false;

		// Apply volume and pan explicitly
		this.setVolume(volume);
		this.setPan(pan);

		source.onended = () => {
			if (this.currentSource === source) this.currentSource = null;
		};
	}

	setVolume(volume: number): void {
		this.gainNode.gain.setValueAtTime(volume, this.gainNode.context.currentTime);
		this.options.volume = volume;
	}

	setRate(rate: number): void {
		if (this.currentSource) {
			this.currentSource.playbackRate.value = rate;
		}
		this.options.rate = rate;
	}

	setPan(pan: number): void {
		this.panNode.pan.value = pan;
		this.options.pan = pan;
	}

	setDetune(detune: number): void {
		if (this.currentSource) {
			this.currentSource.detune.value = detune;
		}
		this.options.detune = detune;
	}

	fadeTo(value: number, duration: number = 1, type: FadeType = "target"): void {
		const g = this.gainNode.gain;
		const now = this.context.currentTime;
		g.cancelScheduledValues(now);

		if (this.fadeTimeoutId) {
			clearTimeout(this.fadeTimeoutId);
			this.fadeTimeoutId = undefined;
		}

		switch (type) {
			case "linear":
				g.linearRampToValueAtTime(value, now + duration);
				break;
			case "exponential":
				g.exponentialRampToValueAtTime(Math.max(value, 0.0001), now + duration);
				break;
			case "target":
			default:
				const timeConstant = duration / 5;
				g.setTargetAtTime(value, now, timeConstant);
				break;
		}

		this.options.volume = value;

		if (value === 0 && !this.isPaused) {
			this.fadeTimeoutId = setTimeout(() => {
				this.pause();
				this.fadeTimeoutId = undefined;
			}, duration * 1000);
		} else if (value > 0 && this.isPaused) {
			this.resume();
		}
	}

	getState(): ChannelState {
		if (this.isPaused) {
			return "paused";
		} else if (this.currentSource) {
			return "playing";
		}
		return "stopped";
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

	playMusic(track: MusicTrack, loop: boolean = true): void {
		const { element, gain } = track;
		if (this.current) {
			this.stop();
		}
		this.current = { element, gain };
		element.loop = loop;
		element.play();
		this.context.resume();
	}

	playMusicFromUrl(url: string, loop: boolean = true): Promise<void> {
		return this.loadMusic(url).then((track) => {
			this.playMusic(track, loop);
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

	fadeTo(value: number, duration: number = 1, type: FadeType = "target"): void {
		if (!this.current) return;
		const g = this.current.gain.gain;
		const now = this.context.currentTime;
		g.cancelScheduledValues(now);
		if (type === "target") {
			const timeConstant = duration / 5;
			g.setTargetAtTime(value, now, timeConstant);
		} else if (type === "linear") {
			g.linearRampToValueAtTime(value, now + duration);
		} else if (type === "exponential") {
			const finalValue = Math.max(value, 0.001);
			g.exponentialRampToValueAtTime(finalValue, now + duration);
		}
		if (value > 0.0) {
			this.resume();
		} else {
			setTimeout(() => this.pause(), duration * 1000);
		}
	}

	isPlaying(): boolean {
		return !!this.current && !this.current.element.paused;
	}

}



// testing
export function testSound() {
	// testSoundSimple();
	// testSoundPanning();
	testSoundFading();
	// testMusicSound();
	// testMusicStream();
}

function testSoundSimple() {
	if (Input.keyHit(Key.Space)) {
		Audio.setVolume(1)
		const ms = performance.now();
		Audio.loadSound("/sounds/cast_hero.wav").then((sound) => {
			echo(performance.now() - ms)
			Audio.playSound(sound, { rate: 1.2, volume: 1.0, channel: 30 })

			setTimeout(() => {
				// Audio.setChannelVolume(30, 0.1)
			}, 150);
		})
	}
}

function testSoundPanning() {
	const channel = 1;

	if (Input.keyHit(Key.Space)) {
		Audio.loadSound("/sounds/cast_hero.wav").then((sound) => {
			profile(() => {
				Audio.playSound(sound, { loop: true, channel: channel });
			})
		})
	}

	if (Input.mouseHit(Mouse.Left)) {
		echo("pan left")
		Audio.setChannelPan(channel, -1);
	} else if (Input.mouseHit(Mouse.Right)) {
		echo("pan right")
		Audio.setChannelPan(channel, 1);
	}
}

function testSoundFading() {
	const channel = 1;

	if (Input.keyHit(Key.Space)) {
		echo(Audio.channelState(channel))
		Audio.loadSound("/sounds/cast_hero.wav").then((sound) => {
			profile(() => {
				Audio.playSound(sound, { loop: true, channel: channel });
			})
		})
	}

	if (Input.mouseHit(Mouse.Left)) {
		echo("fade out", Audio.channelState(channel))
		Audio.fadeChannelTo(channel, 0.0, 2.0);
	} else if (Input.mouseHit(Mouse.Right)) {
		echo("fade in", Audio.channelState(channel))
		Audio.fadeChannelTo(channel, 1.0, 2.0);
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
		Audio.playMusic("/music/battle.ogg", true).then(() => {
			echo(performance.now() - ms)
		})
		// Audio.musicPlayer.fadeTo(1.0, 2.0);
	} else if (Input.keyHit(Key.Digit1)) {
		// Audio.pauseMusic()
		echo(Audio.isMusicPlaying())
		Audio.fadeMusic(0.0, 1.0);
	} else if (Input.keyHit(Key.Digit2)) {
		// Audio.resumeMusic()
		Audio.fadeMusic(1.0, 1.0)
		echo(Audio.isMusicPlaying())
	}
}