(() => {
  const story = window.ZOMBIE_TRAIN_STORY || [];
  const startBtn = document.getElementById('storyAudioBtn');
  const pauseBtn = document.getElementById('storyPauseBtn');
  const volumeSlider = document.getElementById('audioVolume');
  const chapterLabel = document.getElementById('audioChapter');
  const detailLabel = document.getElementById('audioDetail');
  const sceneEl = document.getElementById('scene');
  const weatherLabel = document.getElementById('weatherLabel');

  if (!startBtn || !pauseBtn || !volumeSlider || !chapterLabel || !detailLabel || story.length === 0) return;

  let ctx = null;
  let master = null;
  let trainGain = null;
  let windGain = null;
  let rainGain = null;
  let coldGain = null;
  let windSource = null;
  let rainSource = null;
  let coldSource = null;
  let trainOsc1 = null;
  let trainOsc2 = null;
  let clackTimer = null;
  let zombieTimer = null;
  let radioTimer = null;

  let storyStarted = false;
  let storyPaused = false;
  let storyFinished = false;
  let currentChapter = 0;
  let currentChunk = 0;
  let chunks = [];
  let narratorVoice = null;
  let radioVoice = null;
  let radioPending = false;
  let radioActive = false;
  let interludeActive = false;
  let interludeTimer = null;
  let speechToken = 0;

  const radioLines = [
    'Is anyone out there? Please. If you can hear me, answer.',
    'Oh my God... I need help. I need somebody to hear me.',
    'I do not want to die alone. Please tell me somebody is listening.',
    'This is emergency channel seven. We are running out of water. Is anyone receiving?',
    'Hello? Hello? There were six of us. I think I am the only one left.',
    'If you hear this, stay away from the highway. Do not come here.',
    'Can anybody hear me? My name is Daniel. I have been calling for three days.',
    'Please... somebody say something.'
  ];

  const voicePreferences = [
    'Natural', 'Neural', 'Aria', 'Jenny', 'Ava', 'Sonia', 'Emma', 'Michelle',
    'Samantha', 'Zira', 'Libby', 'Hazel', 'Google US English', 'Female'
  ];

  function splitIntoChunks(text, maxLen = 165) {
    const paragraphs = text.split(/\n\s*\n/).map(x => x.trim()).filter(Boolean);
    const result = [];
    for (const paragraph of paragraphs) {
      const sentences = paragraph.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [paragraph];
      let buffer = '';
      for (const sentence of sentences) {
        const cleaned = sentence.replace(/\s+/g, ' ').trim();
        if (!cleaned) continue;
        if ((buffer + ' ' + cleaned).trim().length <= maxLen) {
          buffer = (buffer + ' ' + cleaned).trim();
        } else {
          if (buffer) result.push(buffer);
          buffer = cleaned;
        }
      }
      if (buffer) result.push(buffer);
      result.push('__PAUSE_SHORT__');
    }
    return result;
  }

  function selectVoices() {
    const voices = window.speechSynthesis ? speechSynthesis.getVoices() : [];
    if (!voices.length) return;

    const scoreVoice = (v) => {
      const name = (v.name || '').toLowerCase();
      const lang = (v.lang || '').toLowerCase();
      let score = 0;
      if (lang.startsWith('en-us')) score += 45;
      else if (lang.startsWith('en')) score += 28;
      if (/natural|neural|online/.test(name)) score += 55;
      if (/aria/.test(name)) score += 42;
      if (/jenny/.test(name)) score += 40;
      if (/ava|sonia|emma|michelle|samantha|zira|libby|hazel/.test(name)) score += 32;
      if (/female/.test(name)) score += 15;
      if (/google us english/.test(name)) score += 12;
      if (/male|david|mark|guy/.test(name)) score -= 25;
      return score;
    };

    narratorVoice = [...voices]
      .filter(v => /^en/i.test(v.lang || ''))
      .sort((a, b) => scoreVoice(b) - scoreVoice(a))[0]
      || voices.find(v => /^en/i.test(v.lang || ''))
      || voices[0];

    radioVoice = [...voices]
      .filter(v => /^en/i.test(v.lang || '') && v !== narratorVoice)
      .sort((a, b) => scoreVoice(b) - scoreVoice(a))[0]
      || narratorVoice;
  }

  if ('speechSynthesis' in window) {
    selectVoices();
    speechSynthesis.addEventListener?.('voiceschanged', selectVoices);
    window.speechSynthesis.onvoiceschanged = selectVoices;
  }

  function createNoiseSource(filterType, frequency) {
    const seconds = 3;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = frequency;
    source.connect(filter);
    return { source, output: filter };
  }

  function initAudioGraph() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = Number(volumeSlider.value) / 100;
    master.connect(ctx.destination);
    // Environmental playback is owned by ambient.js; narration remains independent.
  }

  function tone(freq, duration, gainValue, type = 'sine', destination = master) {
    if (!ctx || ctx.state === 'suspended') return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(Math.max(0.0001, gainValue), ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain).connect(destination);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.05);
  }

  function playRailClack() {
    // Environmental layer is controlled exclusively by Ambient Sounds.
  }

  function playNoiseBurst(duration = 1.5, gainValue = 0.06) {
    // Environmental layer is controlled exclusively by Ambient Sounds.
  }

  function playZombieMoan(strength = 1) {
    // Environmental layer is controlled exclusively by Ambient Sounds.
  }

  function scheduleZombieMoan() {
    clearTimeout(zombieTimer);
    const delay = 18000 + Math.random() * 42000;
    zombieTimer = setTimeout(() => {
      if (storyStarted && !storyPaused) {
        const visible = document.querySelectorAll('.zombie').length;
        playZombieMoan(visible > 2 ? 1.8 : 1);
        if (visible > 4 && Math.random() < 0.5) setTimeout(() => playZombieMoan(1.3), 1200 + Math.random() * 1500);
      }
      scheduleZombieMoan();
    }, delay);
  }

  function scheduleRadio() {
    clearTimeout(radioTimer);
    const delay = 3 * 60 * 1000 + Math.random() * 5 * 60 * 1000;
    radioTimer = setTimeout(() => {
      if (storyStarted && !storyFinished) radioPending = true;
      scheduleRadio();
    }, delay);
  }

  function updateAmbience() {
    // Environmental layer is controlled exclusively by Ambient Sounds.
  }



  function moodSettings(mood) {
    const base = { rate: 0.92, pitch: 1.01 };
    if (mood === 'danger') return { rate: 0.98, pitch: 1.00 };
    if (mood === 'despair') return { rate: 0.87, pitch: 0.98 };
    if (mood === 'ending') return { rate: 0.86, pitch: 0.98 };
    if (mood === 'radio') return { rate: 0.94, pitch: 0.99 };
    if (mood === 'memory') return { rate: 0.90, pitch: 1.01 };
    return base;
  }

  function speakText(text, { voice = narratorVoice, rate = 0.92, pitch = 1.01, volume = 0.92, onend } = {}) {
    if (!('speechSynthesis' in window)) {
      detailLabel.textContent = 'This browser does not support speech synthesis.';
      return;
    }
    const naturalText = text
      .replace(/\s+([,.;!?])/g, '$1')
      .replace(/\.{3,}/g, '…')
      .replace(/\s+/g, ' ')
      .trim();
    const u = new SpeechSynthesisUtterance(naturalText);
    if (voice) u.voice = voice;
    u.lang = voice?.lang || 'en-US';
    u.rate = rate;
    u.pitch = pitch;
    u.volume = Math.max(0, Math.min(1, volume * (Number(volumeSlider.value) / 100)));
    u.onend = () => onend?.();
    u.onerror = () => onend?.();
    speechSynthesis.speak(u);
  }

  function startChapter(index) {
    if (index >= story.length) {
      finishStory();
      return;
    }
    currentChapter = index;
    currentChunk = 0;
    chunks = splitIntoChunks(story[index].text);
    chapterLabel.textContent = story[index].title;
    detailLabel.textContent = `Narrating chapter ${index + 1} of ${story.length} • approximately one hour total`;
    const settings = moodSettings(story[index].mood);
    speakText(story[index].title, {
      rate: Math.max(0.84, settings.rate * 0.97),
      pitch: settings.pitch,
      volume: 0.88,
      onend: () => setTimeout(playNextChunk, 420)
    });
  }

  function playNextChunk() {
    if (!storyStarted || storyPaused || storyFinished || interludeActive || radioActive) return;

    if (radioPending) {
      radioPending = false;
      playRadioInterruption(() => setTimeout(playNextChunk, 1000));
      return;
    }

    if (currentChunk >= chunks.length) {
      startInterlude();
      return;
    }

    const chunk = chunks[currentChunk++];
    if (chunk === '__PAUSE_SHORT__') {
      setTimeout(playNextChunk, 520 + Math.random() * 420);
      return;
    }

    const chapter = story[currentChapter];
    const settings = moodSettings(chapter.mood);
    speakText(chunk, {
      rate: settings.rate,
      pitch: settings.pitch,
      volume: 0.92,
      onend: () => setTimeout(playNextChunk, 120 + Math.random() * 220)
    });
  }

  function startInterlude() {
    if (currentChapter >= story.length - 1) {
      finishStory();
      return;
    }
    interludeActive = true;
    chapterLabel.textContent = `Between chapters — ${currentChapter + 1} → ${currentChapter + 2}`;
    detailLabel.textContent = 'Only the train, wind, distant dead, and occasional radio remain.';
    const pauseMs = 22000 + Math.random() * 18000;
    if (Math.random() < 0.58) setTimeout(() => playZombieMoan(0.8), 4000 + Math.random() * 10000);
    if (Math.random() < 0.42) radioPending = true;
    clearTimeout(interludeTimer);
    interludeTimer = setTimeout(() => {
      interludeActive = false;
      startChapter(currentChapter + 1);
    }, pauseMs);
  }

  function playRadioInterruption(done) {
    // Never cancel/queue speech synthesis for ambient radio, or force a visual event.
    window.ZOMBIE_TRAIN_AMBIENT?.requestRadio();
    done?.();
  }

  function finishStory() {
    storyFinished = true;
    storyStarted = false;
    pauseBtn.disabled = true;
    startBtn.textContent = 'Restart Story Audio';
    chapterLabel.textContent = 'The story has ended';
    detailLabel.textContent = 'The train continues. The radio returns to static.';
    setTimeout(() => playNoiseBurst(2.4, 0.035), 1400);
  }

  async function startStory() {
    initAudioGraph();
    if (ctx.state === 'suspended') await ctx.resume();
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    selectVoices();
    storyStarted = true;
    storyFinished = false;
    storyPaused = false;
    pauseBtn.disabled = false;
    pauseBtn.textContent = 'Pause Story';
    startBtn.textContent = 'Restart Story';
    currentChapter = 0;
    currentChunk = 0;
    interludeActive = false;
    radioActive = false;
    radioPending = false;
    clearTimeout(interludeTimer);
    speechToken++;
    if (narratorVoice) detailLabel.textContent = `Using voice: ${narratorVoice.name}`;
    setTimeout(() => startChapter(0), 250);
  }

  async function togglePause() {
    if (!storyStarted && !storyPaused) return;
    if (!storyPaused) {
      storyPaused = true;
      if ('speechSynthesis' in window) speechSynthesis.pause();
      if (ctx?.state === 'running') await ctx.suspend();
      pauseBtn.textContent = 'Resume Story';
      detailLabel.textContent = 'Story audio paused.';
    } else {
      storyPaused = false;
      if (ctx?.state === 'suspended') await ctx.resume();
      if ('speechSynthesis' in window) speechSynthesis.resume();
      pauseBtn.textContent = 'Pause Story';
      detailLabel.textContent = `Narrating chapter ${currentChapter + 1} of ${story.length}`;
      if (!speechSynthesis.speaking && !interludeActive && !radioActive) playNextChunk();
    }
  }

  startBtn.addEventListener('click', startStory);
  pauseBtn.addEventListener('click', togglePause);
  volumeSlider.addEventListener('input', () => {
    if (master && ctx) master.gain.setTargetAtTime(Number(volumeSlider.value) / 100, ctx.currentTime, 0.05);
  });

  window.addEventListener('beforeunload', () => {
    try { speechSynthesis.cancel(); } catch (_) {}
    clearInterval(clackTimer);
    clearTimeout(zombieTimer);
    clearTimeout(radioTimer);
    clearTimeout(interludeTimer);
  });

  window.ZOMBIE_TRAIN_AUDIO = {
    start: startStory,
    pause: togglePause,
    triggerRadio: () => { radioPending = true; },
    triggerZombie: (strength = 1) => playZombieMoan(strength)
  };
})();
