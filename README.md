# Last Train - Zombie World

A small browser-based animated prototype of a girl living aboard a moving train while a zombie apocalypse unfolds outside.

## Run it locally

### Fastest option
Double-click `index.html` and open it in Chrome, Edge, Firefox, or Safari.

### Recommended option: local web server
If Python is installed, open a terminal in this folder and run:

```bash
python -m http.server 8000
```

Then open:

http://localhost:8000

## Features included
- Animated scrolling world
- Moving train and wheels
- Day / evening / night cycle
- Daily character routine
- Energy, food, and safety meters
- Random zombie appearances
- Random apocalypse events
- Rain event
- Pause and simulation speed controls
- Manual event trigger

## Project structure

```
zombie_train_world/
├── index.html
├── README.md
└── assets/
    ├── css/
    │   └── style.css
    ├── js/
    │   └── app.js
    └── images/
```

The `images` folder is intentionally empty. The first prototype is drawn entirely with HTML/CSS so it runs immediately without external assets.

## Good next upgrades
- Replace CSS character with illustrated sprite sheets
- Add animated train interiors and multiple cars
- Add inventory and supply management
- Add clickable decisions during random events
- Add saved game state with localStorage
- Add audio for wheels, rain, radio, and zombies
- Add AI-generated radio broadcasts or story events
- Add cinematic scenes using pre-rendered video clips

## V2 illustrated visuals
This build keeps the original simulation and CSS visuals, and adds an illustrated art mode using the generated character, zombie, train-car, and world artwork.

New controls:
- **Visuals: Art / Classic** toggles the illustrated layer without deleting the original visuals.
- **Car: Living / Workshop** switches between the two illustrated train interiors.
- World events can automatically change the illustrated exterior background.

## V2.1 visual fix
The illustrated character is now rendered outside the hidden classic car-body container, so she remains visible in Art mode. Art mode also includes a visible exterior roof cap, lower chassis, and wheels around the illustrated cutaway train interior.


## V2.4 Ready Build Notes
- Uses illustrated living, workshop, and engine cars.
- Smooth scene transitions between environments and train sections.
- Longer background scenes and slower scrolling world.
- Steam-powered rusty train shell with steam animation.
- The girl automatically moves to the correct train section based on activity: living, workshop, or engine.
- More zombies chase the train.

## V2.5 Scene + Wheel Update
- Updated train wheels to look more like real locomotive wheels.
- Blended scrolling background panels to remove visible vertical scene seams.
- Added roughly 1 additional minute to each major scene/environment change.
- Slowed down automatic event changes so scenes stay visible longer.

## V2.6 Zombie + Track Update
- Slowed down zombie pass-by movement slightly.
- Zombies now render behind the train so they disappear while passing behind it and reappear after clearing it.
- Lowered/seated the train more firmly onto the tracks for a more grounded look.

## V2.7 Mixed Zombie Depth
- Not all zombies go behind the train now.
- Some zombies run behind the train and disappear/reappear naturally.
- Some zombies run in front of the train so the scene feels more varied.

## V2.8 Zombie Layer Fix
- Zombies are now split into two actual rendering layers.
- Some zombies run behind the train and disappear naturally behind the rail car.
- Some zombies run in front of the train and remain visible the whole time.

## V2.9 Front Zombie Height Effect
- Front-layer zombies now spawn lower in the frame.
- Some front zombies start with their feet at the bottom edge of the screen.
- Some front zombies start slightly above the bottom edge for a layered perspective effect.
- Front zombies no longer line up visually with the girl inside the train.

## V3 Window + Scene Timing Update
- Train window views now sync with the current outside scene/background.
- Scene transitions are slower and more gradual.
- Major background scenes now stay on screen roughly 2 to 3 minutes before returning.
- Base simulation pacing was slowed slightly so scene changes feel less rushed.

## V3.1 Background Cycle Fix
- Fixed the background system so it no longer depends on random events.
- Guaranteed order: Daytime → Sunset → Night → Sunrise → Daytime.
- Every background stays active for a randomized 4–8 minutes of real run time.
- Background transitions now take about 8 seconds and happen gradually.
- Windows remain synchronized with the current outside scene.
- Weather/zombie/radio events no longer interrupt the ordered background cycle.

## V3.2 Exterior Train Update
- Replaced the simpler train shell with a fully illustrated rusted steam-train exterior.
- Kept the smoke-stack feel while upgrading the exterior look.
- Character now moves to the living car, workshop, or engine section based on activity.
- Added animated wheel and rod overlays so the train feels more alive.
- Train windows continue to show the current outside background.

## V3.3 Train Alignment Fix
- Enlarged and centered the exterior train.
- Repositioned the train lower so it sits on the rails properly.
- Restored animated smoke/steam over the stack.
- Re-aligned animated locomotive wheels and moving rods onto the train image.
- Re-sized and repositioned the character in each train section.

## V3.6 Wheel Alignment Update
- Repositioned the overlaid train wheels so they match the locomotive wheels in the image.
- Reduced the amount of wheel motion so they mostly spin in place.
- Kept the steam-engine side rods moving for a more realistic locomotive effect.

## V3.7 Wheel Layer Hard Fix
- Forced the wheel overlay layer to use the full train box so the wheels no longer appear in the sky.
- Repositioned the overlay wheels directly onto the locomotive wheels.
- Kept the wheels spinning in place while the steam-engine rods move over the drive wheels.

## V3.8 Precise Wheel Alignment
- Changed only wheel and steam-rod positioning/animation.
- Overlay wheels now match the actual locomotive wheel centers.
- Wheels spin in fixed positions and no longer travel vertically or horizontally.
- Only the steam locomotive rods reciprocate up/down and fore/aft.

## V3.9 Wheel Center Correction
- Fine-tuned the animated wheel centers to sit directly over the locomotive wheels.
- Wheels remain fixed in place and only spin.
- Only the steam-engine rods reciprocate.

## V4.0 Fixed-Position Wheel Spin
- Locked the animated locomotive wheels in one exact position.
- Wheels now only rotate in place and do not move up, down, or sideways.
- Re-aligned the moving rods to the corrected wheel centers.

## V4.2 Wheel Spin Alignment
- Nudged the overlay wheel centers to sit directly over the painted locomotive wheels.
- Kept the wheels fixed in place and spinning like car tires.
- Kept only the rods reciprocating across the wheel set.

## V4.3 Locked Axle Wheel Animation
- Wheel containers are completely fixed in place and never animate.
- Only an inner wheel rotor spins 360 degrees around the fixed axle center.
- Wheel centers were reset to the measured centers of the painted locomotive wheels.
- Connecting rods continue to reciprocate independently.

## V4.4 Scoped Background + Radio Update
- Replaced the old background restart with a continuous two-panel seamless loop.
- Kept the existing Day → Sunset → Night → Sunrise scheduler at 4–8 minutes per scene.
- Increased the actual scene crossfade to 12 seconds for a slower transition.
- Moved scheduled and event-driven radio activity to the workshop section.
- No wheel/rod, zombie, smoke/steam, train placement, or other activity logic was changed.

## V4.5 Three Scoped Fixes
- Raised the animated steam slightly to align with the black smoke plume.
- Removed screen blur from character activity changes; scene transitions remain unchanged.
- Lowered the train only in the night scene so it sits closer to the visible tracks.


## V5 Audio Story System
- Adds a roughly one-hour narrated survival story in 10 chapters.
- Uses the browser speech engine so the program remains fully local and does not require API keys.
- Prefers a natural English female system voice when available.
- Adds procedural train rumble, rail clacks, wind, cold night wind, rain, distant zombie moans, and radio static.
- Radio transmissions occur unpredictably every few minutes and temporarily interrupt the narration.
- Night scenes increase cold wind; rain events fade in rain ambience.
- Click **Start Story Audio** once after the page loads. Browsers require a user click before audio can begin.
- Use **Pause Story** to pause narration and generated ambience, and the **Audio** slider to adjust the overall level.
- The exact narration duration varies with the installed browser voice and speech engine, but is designed to run approximately 55–65 minutes including pauses, chapter interludes, and radio interruptions.
- Full narration text is also included in `STORY_TRANSCRIPT.txt`.
