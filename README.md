##  A BlitzBasic inspired game engine for the web with no dependencies.
Using WebGL2 and Typescript.
Work in progress!

### Features
- **2D Renderer**: `src/engine/renderer.ts`
Provides functions to draw shapes, textures and switch shaders to apply custom effects (black and white, etc.). Batches draw calls for efficiency. No OpenGL knowledge needed, just call functions like `drawCircle(0, 0, 20)` or `drawTex(texture)`.

- **Audio**: `src/engine/audio.ts`
Modeled after the Monkey-X/Blitz-Basic API to allow playing sounds and stream music. Supports 32 fixed channels for sounds and 1 music-stream.
For simple playback you can simply call: `Audio.playSound("/sounds/my_sound.wav")` &
`Audio.playMusic("/music/my_music.ogg")`. See the `test.ts` for more detailed usage.

- **Other features**:
	* Scenes
	* Tilemap loading
	* Simple input system to get mouse and keyboard state
	* Render Metrics: cpuFrameTime, gpuFrameTime, drawCalls, triangleCount

### Examples
- `src/game/scenes/test.ts`: Test Scene that shows basic rendering, audio playback & fading and the polling input system.
- `src/game/scenes/tilemap.ts`: Uses a custom light shader that uses normal mapping to simulate light that interacts with the enironment (see gif below). Doesn't look right yet, as the normal-map itself isn't correct.
  
![normal mapping](https://github.com/user-attachments/assets/80b57e51-206e-4491-ac0c-667558ffdff5)

### How to run locally
1) Install dependencies: `yarn`
2) Run example: `yarn dev` (this will run a local dev server with vite)
3) Open `http://localhost:3003/`
