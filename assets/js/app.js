const scene = document.getElementById('scene');
const trainSection = document.querySelector('.train');
const girl = document.getElementById('girl');
const girlProp = document.getElementById('girlProp');
const activityLabel = document.getElementById('activityLabel');
const timeLabel = document.getElementById('timeLabel');
const dayLabel = document.getElementById('dayLabel');
const weatherLabel = document.getElementById('weatherLabel');
const eventBanner = document.getElementById('eventBanner');
const sceneFade = document.getElementById('sceneFade');
const zombieField = document.getElementById('zombieField');
const zombieFrontField = document.getElementById('zombieFrontField');
const rainLayer = document.getElementById('rainLayer');
const pauseBtn = document.getElementById('pauseBtn');
const speedBtn = document.getElementById('speedBtn');
const eventBtn = document.getElementById('eventBtn');
const energyMeter = document.getElementById('energyMeter');
const foodMeter = document.getElementById('foodMeter');
const safetyMeter = document.getElementById('safetyMeter');
const girlArt = document.getElementById('girlArt');
const trainArt = document.getElementById('trainArt');
const artWorld = document.getElementById('artWorld');
const artPanels = document.querySelectorAll('.art-panel');
const visualBtn = document.getElementById('visualBtn');
const carBtn = document.getElementById('carBtn');
const rootStyle = document.documentElement.style;

let simMinutes = 7 * 60;
let day = 1;
let paused = false;
let speed = 1;
let energy = 82;
let food = 76;
let safety = 91;
let weather = 'Clear';
let artMode = true;
let currentCar = 'living';
let currentWorld = 'city';
let activeRoutineName = '';
let transitionTimer = null;
let radioEventTimer = null;
let worldReturnTimer = null;
let manualCarLockUntil = 0;
let backgroundSceneIndex = 0;
let backgroundSceneRemainingMs = 0;
let backgroundSceneDurationMs = 0;
let backgroundSceneTransitioning = false;

const characterArt = {
  standing: 'assets/images/character/standing.png',
  walking: 'assets/images/character/walking.png',
  reading: 'assets/images/character/reading.png',
  sleeping: 'assets/images/character/sleeping-bunk.png',
  eating: 'assets/images/character/eating.png',
  window: 'assets/images/character/window.png',
  repairing: 'assets/images/character/repairing.png',
  radio: 'assets/images/character/radio.png',
  coal: 'assets/images/character/coal.png'
};

const worldArt = {
  city: 'assets/images/backgrounds/city-day.png',
  swamp: 'assets/images/backgrounds/swamp-rain.png',
  station: 'assets/images/backgrounds/station-dusk.png',
  mountain: 'assets/images/backgrounds/mountain-night.png'
};

const backgroundSceneCycle = [
  { name: 'Daytime', world: 'city', className: 'bg-daytime' },
  { name: 'Sunset', world: 'station', className: 'bg-sunset' },
  { name: 'Night', world: 'mountain', className: 'bg-night' },
  { name: 'Sunrise', world: 'city', className: 'bg-sunrise' }
];

const BACKGROUND_SCENE_MIN_MS = 4 * 60 * 1000;
const BACKGROUND_SCENE_MAX_MS = 8 * 60 * 1000;
const BACKGROUND_SCENE_TRANSITION_MS = 12000;

const trainCarArt = {
  living: 'assets/images/exterior/train-exterior-shell.png',
  workshop: 'assets/images/exterior/train-exterior-shell.png',
  engine: 'assets/images/exterior/train-exterior-shell.png'
};

const zombieArt = ['walker', 'runner', 'crawler', 'thin', 'heavy', 'reaching', 'stumbling', 'pair'];

const routines = [
  { start: 0, end: 360, name: 'Sleeping', cls: 'sleeping', prop: '', art: 'sleeping', car: 'living' },
  { start: 360, end: 450, name: 'Morning coffee', cls: 'cooking', prop: '☕', art: 'eating', car: 'living' },
  { start: 450, end: 570, name: 'Reading', cls: 'reading', prop: '▰', art: 'reading', car: 'living' },
  { start: 570, end: 690, name: 'Watching the world outside', cls: 'windowing', prop: '', art: 'window', car: 'living' },
  { start: 690, end: 840, name: 'Shoveling coal into the engine', cls: 'coaling', prop: '⚒', art: 'coal', car: 'engine' },
  { start: 840, end: 990, name: 'Repairing equipment', cls: 'repairing', prop: '🔧', art: 'repairing', car: 'workshop' },
  { start: 990, end: 1080, name: 'Dinner', cls: 'cooking', prop: '◒', art: 'eating', car: 'living' },
  { start: 1080, end: 1170, name: 'Checking the radio', cls: 'radioing', prop: '📻', art: 'radio', car: 'workshop' },
  { start: 1170, end: 1260, name: 'Reading by lamplight', cls: 'reading', prop: '▰', art: 'reading', car: 'living' },
  { start: 1260, end: 1440, name: 'Sleeping', cls: 'sleeping', prop: '', art: 'sleeping', car: 'living' }
];

const events = [
  { text: 'A wave of zombies is sprinting after the train.', type: 'zombies' },
  { text: 'The train slides past an abandoned station full of shadows.', type: 'station' },
  { text: 'A distant radio transmission cracks through the static.', type: 'radio' },
  { text: 'Heavy rain begins hammering the car windows.', type: 'rain' },
  { text: 'The tracks curve into a freezing mountain corridor.', type: 'tunnel' },
  { text: 'A survivor briefly appears on a rooftop and vanishes.', type: 'survivor' },
  { text: 'Something heavy slams against the train shell.', type: 'impact' }
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function setCharacterArt(key) {
  const src = characterArt[key] || characterArt.standing;
  girlArt.src = src;
  girlArt.alt = `Girl ${key}`;
}

function applyWorldArt(key) {
  currentWorld = key in worldArt ? key : 'city';
  artPanels.forEach(panel => {
    panel.style.backgroundImage = `url('${worldArt[currentWorld]}')`;
  });
  syncWindowWorld(currentWorld);
}

function syncWindowWorld(key) {
  const worldKey = key in worldArt ? key : 'city';
  rootStyle.setProperty('--window-scene', `url('${worldArt[worldKey]}')`);
  rootStyle.setProperty('--window-offset', `${Math.floor(Math.random() * 220)}px`);
}

function randomBackgroundSceneDuration() {
  return Math.floor(BACKGROUND_SCENE_MIN_MS + Math.random() * (BACKGROUND_SCENE_MAX_MS - BACKGROUND_SCENE_MIN_MS));
}

function applyBackgroundSceneClass(className) {
  backgroundSceneCycle.forEach(item => scene.classList.remove(item.className));
  scene.classList.add(className);
}

function updateBackgroundStatus() {
  const current = backgroundSceneCycle[backgroundSceneIndex];
  const totalSeconds = Math.max(0, Math.ceil(backgroundSceneRemainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  document.getElementById('statusText').textContent = `${current.name} scenery • next scene in ${minutes}:${String(seconds).padStart(2, '0')}`;
}

async function changeBackgroundScene(nextIndex, initial = false) {
  if (backgroundSceneTransitioning) return;
  backgroundSceneTransitioning = true;

  const next = backgroundSceneCycle[nextIndex];
  const apply = () => {
    backgroundSceneIndex = nextIndex;
    applyBackgroundSceneClass(next.className);
    applyWorldArt(next.world);
    backgroundSceneDurationMs = randomBackgroundSceneDuration();
    backgroundSceneRemainingMs = backgroundSceneDurationMs;
    updateBackgroundStatus();
  };

  if (initial || !artMode) {
    apply();
  } else {
    scene.classList.add('background-cycle-transition');
    sceneFade.classList.add('active');
    await sleep(BACKGROUND_SCENE_TRANSITION_MS * 0.45);
    apply();
    await sleep(BACKGROUND_SCENE_TRANSITION_MS * 0.55);
    scene.classList.remove('background-cycle-transition');
    sceneFade.classList.remove('active');
  }

  backgroundSceneTransitioning = false;
}

function advanceBackgroundScene() {
  const nextIndex = (backgroundSceneIndex + 1) % backgroundSceneCycle.length;
  changeBackgroundScene(nextIndex, false);
}

function applyTrainCar(key) {
  currentCar = key in trainCarArt ? key : 'living';
  trainArt.src = trainCarArt[currentCar];
  trainSection.dataset.car = currentCar;
  const label = currentCar.charAt(0).toUpperCase() + currentCar.slice(1).replace('-', ' ');
  carBtn.textContent = `Car: ${label}`;
}

async function smoothSceneTransition(callback, duration = 2600) {
  if (!artMode) {
    callback();
    return;
  }
  clearTimeout(transitionTimer);
  scene.classList.add('scene-transition');
  sceneFade.classList.add('active');
  await sleep(duration * 0.35);
  callback();
  await sleep(duration * 0.65);
  scene.classList.remove('scene-transition');
  sceneFade.classList.remove('active');
}

function setWorldArt(key, smooth = true) {
  if (!(key in worldArt) || key === currentWorld) return;
  if (smooth) {
    smoothSceneTransition(() => applyWorldArt(key), 3200);
  } else {
    applyWorldArt(key);
  }
}

function setTrainCar(key, smooth = true) {
  if (!(key in trainCarArt) || key === currentCar) return;
  if (smooth) {
    smoothSceneTransition(() => applyTrainCar(key), 2600);
  } else {
    applyTrainCar(key);
  }
}

function updateClock() {
  const h = Math.floor(simMinutes / 60) % 24;
  const m = simMinutes % 60;
  timeLabel.textContent = `${pad(h)}:${pad(m)}`;
  dayLabel.textContent = `Day ${day}`;

  scene.classList.remove('morning', 'noon', 'evening', 'night');
  if (h >= 6 && h < 11) scene.classList.add('morning');
  else if (h >= 11 && h < 17) scene.classList.add('noon');
  else if (h >= 17 && h < 21) scene.classList.add('evening');
  else scene.classList.add('night');
}

function applyRoutine(routine) {
  clearTimeout(radioEventTimer);
  girl.className = `girl ${routine.cls}`;
  activityLabel.textContent = routine.name;
  girlProp.textContent = routine.prop;
  setCharacterArt(routine.art);
  if (Date.now() > manualCarLockUntil) {
    applyTrainCar(routine.car);
  }
  activeRoutineName = routine.name;
}

function updateRoutine(force = false) {
  const routine = routines.find(r => simMinutes >= r.start && simMinutes < r.end) || routines[0];
  if (force || routine.name !== activeRoutineName) {
    applyRoutine(routine);
  }
}

function updateNeeds() {
  const asleep = activeRoutineName.includes('Sleeping');
  energy += asleep ? 0.22 * speed : -0.03 * speed;
  food -= 0.018 * speed;
  if (activeRoutineName === 'Dinner' || activeRoutineName === 'Morning coffee') {
    food += 0.085 * speed;
  }
  energy = Math.max(0, Math.min(100, energy));
  food = Math.max(0, Math.min(100, food));
  safety = Math.max(0, Math.min(100, safety));
  energyMeter.value = energy;
  foodMeter.value = food;
  safetyMeter.value = safety;
}

function spawnZombie(count = 1, chaseBias = 0.55) {
  for (let i = 0; i < count; i++) {
    const z = document.createElement('div');
    const variant = zombieArt[Math.floor(Math.random() * zombieArt.length)];
    const isChaser = Math.random() < chaseBias;
    const isRunner = variant === 'runner' || Math.random() < 0.28;
    const inFront = Math.random() < 0.38;

    z.className = `zombie${isChaser ? ' chaser' : ''}${isRunner ? ' runner' : ''}${inFront ? ' front' : ' back'}`;
    z.style.left = `${106 + Math.random() * 24}%`;

    if (inFront) {
      const lowTrack = Math.random() < 0.55;
      if (lowTrack) {
        z.classList.add('front-low');
        z.style.bottom = `${-2 + Math.random() * 3}%`;
      } else {
        z.classList.add('front-high');
        z.style.bottom = `${3 + Math.random() * 6}%`;
      }
    } else {
      z.style.bottom = `${13 + Math.random() * 11}%`;
    }

    const duration = isRunner ? (5.8 + Math.random() * 2.8) : (8.2 + Math.random() * 3.8);
    z.style.animationDuration = `${duration / speed}s`;
    const baseScale = inFront
      ? ((isChaser ? 1.02 : 0.9) + Math.random() * (isChaser ? 0.46 : 0.34))
      : ((isChaser ? 0.95 : 0.75) + Math.random() * (isChaser ? 0.5 : 0.35));
    z.style.scale = `${baseScale}`;

    const img = document.createElement('img');
    img.className = 'zombie-art';
    img.src = `assets/images/zombies/${variant}.png`;
    img.alt = '';
    z.appendChild(img);
    const targetField = inFront ? zombieFrontField : zombieField;
    targetField.appendChild(z);
    setTimeout(() => z.remove(), 15000 / speed);
  }
}

function showEvent(text) {
  eventBanner.textContent = text;
  eventBanner.classList.remove('hidden');
  clearTimeout(showEvent.t);
  showEvent.t = setTimeout(() => eventBanner.classList.add('hidden'), 6800);
}

function setWeather(next) {
  weather = next;
  weatherLabel.textContent = weather;
  rainLayer.classList.toggle('active', weather === 'Rain');
}

function queueWorldReturn(delayMs, world = 'city', weatherAfter = 'Clear') {
  clearTimeout(worldReturnTimer);
  worldReturnTimer = setTimeout(() => {
    setWeather(weatherAfter);
    setWorldArt(world, true);
  }, delayMs / speed);
}

function triggerEvent(forceType = null) {
  const e = forceType
    ? events.find(evt => evt.type === forceType) || events[0]
    : events[Math.floor(Math.random() * events.length)];

  showEvent(e.text);

  switch (e.type) {
    case 'zombies':
      spawnZombie(8 + Math.floor(Math.random() * 7), 0.72);
      safety -= 4;
      break;
    case 'rain':
      setWeather('Rain');
      clearTimeout(worldReturnTimer);
      worldReturnTimer = setTimeout(() => setWeather('Clear'), 30000);
      break;
    case 'station':
      spawnZombie(4 + Math.floor(Math.random() * 4), 0.62);
      break;
    case 'tunnel':
      safety -= 1;
      spawnZombie(2 + Math.floor(Math.random() * 3), 0.5);
      break;
    case 'radio':
      clearTimeout(radioEventTimer);
      applyTrainCar('workshop');
      girl.className = 'girl radioing';
      setCharacterArt('radio');
      activityLabel.textContent = 'Listening to a radio transmission';
      girlProp.textContent = '📻';
      radioEventTimer = setTimeout(() => updateRoutine(true), 18000 / speed);
      break;
    case 'impact':
      scene.animate(
        [{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }],
        { duration: 450, iterations: 2 }
      );
      safety -= 6;
      spawnZombie(3 + Math.floor(Math.random() * 3), 0.65);
      break;
    case 'survivor':
      safety += 1;
      break;
  }
}

function setSpeed(next) {
  speed = next;
  scene.classList.remove('speed-2', 'speed-4');
  if (speed === 2) scene.classList.add('speed-2');
  if (speed === 4) scene.classList.add('speed-4');
  speedBtn.textContent = `Speed: ${speed}x`;
}

pauseBtn.addEventListener('click', () => {
  paused = !paused;
  scene.classList.toggle('paused', paused);
  pauseBtn.textContent = paused ? 'Resume' : 'Pause';
});

speedBtn.addEventListener('click', () => {
  const next = speed === 1 ? 2 : speed === 2 ? 4 : 1;
  setSpeed(next);
});

eventBtn.addEventListener('click', () => triggerEvent());

visualBtn.addEventListener('click', () => {
  artMode = !artMode;
  scene.classList.toggle('art-mode', artMode);
  visualBtn.textContent = `Visuals: ${artMode ? 'Art' : 'Classic'}`;
});

carBtn.addEventListener('click', () => {
  const order = ['living', 'workshop', 'engine'];
  const next = order[(order.indexOf(currentCar) + 1) % order.length];
  manualCarLockUntil = Date.now() + 15000;
  setTrainCar(next, true);
});

setInterval(() => {
  if (paused) return;

  simMinutes += speed;
  if (simMinutes >= 1440) {
    simMinutes = 0;
    day += 1;
  }

  updateClock();
  updateRoutine();
  updateNeeds();

  backgroundSceneRemainingMs -= 1500;
  if (backgroundSceneRemainingMs <= 0 && !backgroundSceneTransitioning) {
    advanceBackgroundScene();
  } else {
    updateBackgroundStatus();
  }

  if (Math.random() < 0.075 * speed) spawnZombie(1 + Math.floor(Math.random() * 2), 0.55);
  if (Math.random() < 0.0016 * speed) triggerEvent();
}, 1500);

updateClock();
applyTrainCar('living');
setCharacterArt('reading');
updateRoutine(true);
setWeather('Clear');
setSpeed(1);
changeBackgroundScene(0, true);
setTimeout(() => showEvent('The steam train keeps moving. Outside, the world is gone.'), 1200);
