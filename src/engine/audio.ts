import { Input, Key } from "./input";
import { assert, echo } from "./utils";

const NativeAudio = window.Audio;
const AUDIO_MAX_CHANNELS: number = 32;

export interface SoundOptions {
	channel?: number;
	submixId?: SubmixID
	loop?: boolean
	rate?: number
	detune?: number,
	volume?: number
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
		const source = this.context.createBufferSource();
		const { channel = -1, submixId = SubmixID.Sfx, loop = false, rate = 1.0, detune = 0.0, volume = 1.0 } = options;
		source.buffer = sound.buffer;
		source.loop = loop;
		source.playbackRate.value = rate;
		source.detune.value = detune

		const targetInput = this.submixes[submixId].input();

		if (channel >= 0) {
			assertChannel(channel, "playSound");
			const ch = this.channels[channel];
			if (ch.currentSource) {
				ch.stop();
			}
			source.connect(ch.inputNode);
			source.start();
			ch.currentSource = source;
			ch.setVolume(volume);
			source.onended = () => {
				if (ch.currentSource === source) {
					ch.currentSource = null;
				}
			};
		} else {
			// fire and forget sounds go directly into the mix
			if (volume < 1.0) {
				const gainNode = this.context.createGain();
				gainNode.gain.value = volume;
				source.connect(gainNode);
				gainNode.connect(targetInput)
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

	static stopChannel(channel: number) {
		assertChannel(channel, "stopChannel");
		this.channels[channel].stop();
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

	static fadeMusic(targetVolume: number, duration: number = 1.0): void {
		this.musicPlayer.fadeTo(targetVolume, duration)
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
	gainNode: GainNode;
	currentSource: AudioBufferSourceNode | null = null;
	readonly inputNode: AudioNode;

	constructor(context: AudioContext, submixInput: AudioNode) {
		this.gainNode = context.createGain();
		this.gainNode.connect(submixInput);
		this.inputNode = this.gainNode;
	}

	setVolume(volume: number) {
		this.gainNode.gain.value = volume;
	}

	stop() {
		if (this.currentSource) {
			try {
				this.currentSource.stop();
			} catch { }
			this.currentSource.disconnect();
			this.currentSource = null;
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

	isPlaying(): boolean {
		return !!this.current && !this.current.element.paused;
	}

}



// testing
export function testSound() {
	// testSoundSimple();
	// testMusicSound();
	testMusicStream();
}

function testSoundSimple() {
	if (Input.keyHit(Key.Space)) {
		Audio.setVolume(1)
		const ms = performance.now();
		Audio.loadSound("/sounds/cast_hero.wav").then((sound) => {
			echo(performance.now() - ms)
			Audio.playSound(sound, { rate: 1.2, volume: 1.0, channel: 30 })

			setTimeout(() => {
				Audio.setChannelVolume(30, 0.1)
			}, 150);
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
		Audio.playMusic("/music/battle.ogg", true).then(() => {
			echo(performance.now() - ms)
		})
		// Audio.musicPlayer.fadeTo(1.0, 2.0);
	} else if (Input.keyHit(Key.Digit1)) {
		Audio.pauseMusic()
		echo(Audio.isMusicPlaying())
		// Audio.fadeMusic(0.0, 1.0);
	} else if (Input.keyHit(Key.Digit2)) {
		Audio.resumeMusic()
		echo(Audio.isMusicPlaying())
	}
}