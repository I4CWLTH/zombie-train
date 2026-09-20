/* Original bundled soundtrack; separate from the browser's narration queue. */
(() => {
  'use strict';
  const musicButton = document.getElementById('ambientMusicBtn');
  const soundsButton = document.getElementById('ambientSoundsBtn');
  const status = document.getElementById('ambientStatus');
  const girl = document.getElementById('girl');
  let ctx, musicBus, soundsBus, musicSource, loadingMusic, loadingSounds;
  let musicOn = false, soundsOn = false, disposed = false;
  let musicVersion = 0, soundsVersion = 0;
  let radioTimer, effectTimer, voice = null, lastLine = -1;
  let activity = '', radioGeneration = 0;
  const cache = new Map(), active = new Set(), loops = new Map();
  const levels = { train: .16, wind: .16, rain: .14 };
  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) throw new Error('Web Audio is unavailable in this browser.');
    ctx = new AC({sampleRate: 24000});
    musicBus = ctx.createGain(); soundsBus = ctx.createGain();
    musicBus.gain.value = soundsBus.gain.value = 0;
    musicBus.connect(ctx.destination); soundsBus.connect(ctx.destination);
  }
  function fade(param, value, seconds = 2) {
    const now = ctx.currentTime;
    if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(now);
    else { const current = param.value; param.cancelScheduledValues(now); param.setValueAtTime(current, now); }
    param.linearRampToValueAtTime(value, now + seconds);
  }
  function loadLocalBytes(name) {
    // Classic script assets can load beside file:// pages without requesting
    // cross-origin file reads. Decode bundled bytes into the same Web Audio graph.
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      let timer;
      const cleanup = () => { clearTimeout(timer); script.remove(); };
      script.src = `assets/audio/local/${name}.js`;
      script.onload = () => {
        cleanup();
        try {
          const encoded = window.ZOMBIE_LOCAL_AUDIO?.[name];
          if (!encoded) throw new Error(`Local audio missing: ${name}`);
          delete window.ZOMBIE_LOCAL_AUDIO[name];
          const binary = atob(encoded);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          resolve(bytes.buffer);
        } catch (error) { reject(error); }
      };
      script.onerror = () => { cleanup(); reject(new Error(`Could not load local audio: ${name}`)); };
      timer = setTimeout(() => { cleanup(); reject(new Error(`Local audio timed out: ${name}`)); }, 20000);
      document.head.appendChild(script);
    });
  }
  async function load(name) {
    if (!cache.has(name)) {
      cache.set(name, (async () => {
        if (location.protocol === 'file:') return ctx.decodeAudioData(await loadLocalBytes(name));
        const response = await fetch(`assets/audio/${name}`, {signal: AbortSignal.timeout(20000)});
        if (!response.ok) throw new Error(`Could not load ${name}`);
        return ctx.decodeAudioData(await response.arrayBuffer());
      })().catch(error => { cache.delete(name); throw error; }));
    }
    return cache.get(name);
  }
  function source(buffer, bus, level = 1, loop = false) {
    const s = ctx.createBufferSource(), g = ctx.createGain();
    s.buffer = buffer; s.loop = loop; g.gain.value = level;
    s.connect(g).connect(bus);
    const item = {s, g, nodes: [], stopped: false}; active.add(item);
    s.onended = () => { active.delete(item); s.disconnect(); g.disconnect(); item.nodes.forEach(n => n.disconnect()); };
    return item;
  }
  function stop(item, seconds = .15) {
    if (!item || item.stopped) return;
    item.stopped = true; fade(item.g.gain, 0, seconds);
    try { item.s.stop(ctx.currentTime + seconds + .02); } catch (_) {}
  }
  function showError(error) { status.textContent = `Ambient audio: ${error.message}. You can try the button again.`; }
  function buttons() {
    musicButton.textContent = `Ambient Music: ${musicOn ? 'On' : 'Off'}`;
    soundsButton.textContent = `Ambient Sounds: ${soundsOn ? 'On' : 'Off'}`;
    musicButton.setAttribute('aria-pressed', String(musicOn));
    soundsButton.setAttribute('aria-pressed', String(soundsOn));
  }
  async function soundtrack() {
    // Bake equal-power overlaps into a circular buffer. The audio clock loops this
    // indefinitely, including 4 -> 1, without relying on throttled browser timers.
    const tracks = await Promise.all([1,2,3,4].map(i => load(`melody-${i}.mp3`)));
    const overlap = Math.round(8 * ctx.sampleRate);
    const lengths = tracks.map(t => t.length - overlap);
    const total = lengths.reduce((a,b) => a+b, 0);
    const mix = ctx.createBuffer(2, total, ctx.sampleRate);
    let offset = 0;
    tracks.forEach((track,k) => {
      for (let c = 0; c < 2; c++) {
        const input = track.getChannelData(Math.min(c,track.numberOfChannels-1));
        const out = mix.getChannelData(c);
        for (let i = 0; i < track.length; i++) {
          let gain = 1;
          if (i < overlap) gain = Math.sin(i / overlap * Math.PI / 2);
          if (i >= lengths[k]) gain = Math.cos((i-lengths[k]) / overlap * Math.PI / 2);
          out[(offset+i)%total] += input[i] * gain;
        }
      }
      offset += lengths[k];
    });
    return mix;
  }
  async function toggleMusic() {
    const token = ++musicVersion;
    musicOn = !musicOn; buttons();
    if (!musicOn) { if(ctx) { fade(musicBus.gain,0,2.5); stop(musicSource,2.5); musicSource=null; } return; }
    try {
      init(); await ctx.resume();
      status.textContent = 'Loading four original melodies…';
      loadingMusic ||= soundtrack().catch(e => {loadingMusic=null;throw e;});
      const buffer = await loadingMusic;
      if (!musicOn || token !== musicVersion || disposed) return;
      musicSource = source(buffer,musicBus,1,true); musicSource.s.start();
      fade(musicBus.gain,.30,3); status.textContent = 'Four melodies • continuous eight-second crossfades';
    } catch(e) { if(token===musicVersion) {musicOn=false;buttons();showError(e);} }
  }
  async function ensureSounds() {
    const names = ['train','wind','rain','distant-moan','radio-static',...Array.from({length:5},(_,i)=>`radio-${i+1}`)];
    const results = await Promise.allSettled(names.map(n=>load(`${n}.wav`)));
    const failures = names.filter((_,i)=>results[i].status==='rejected');
    if (failures.length) {
      loadingSounds = null;
      if (failures.length === names.length) throw new Error('No ambient sound files could load');
      status.textContent = `Some ambient files could not load: ${failures.join(', ')}. Available sounds will continue.`;
    }
    return Object.fromEntries(names.flatMap((n,i)=>results[i].status==='fulfilled'?[[n,results[i].value]]:[]));
  }
  let buffers = {};
  function applyEnvironment() {
    if (!ctx || !soundsOn) return;
    const sleeping = activity === 'sleeping';
    const raining = document.getElementById('weatherLabel').textContent === 'Rain';
    for (const [name,item] of loops) {
      const level = name==='rain' ? (sleeping ? .23 : raining ? .20 : .015) : name==='wind' ? (sleeping ? .20 : .16) : .16;
      fade(item.g.gain,level,4);
    }
  }
  function cancelRadio() {
    radioGeneration++; clearTimeout(radioTimer); radioTimer=null;
    stop(voice,.12); voice=null;
  }
  function queueRadio(min=9,max=22) {
    clearTimeout(radioTimer);
    if (!soundsOn || activity!=='radioing' || disposed) return;
    const generation = radioGeneration;
    radioTimer=setTimeout(()=>{
      radioTimer=null;
      if(generation!==radioGeneration || !soundsOn || activity!=='radioing') return;
      // Keep narration intelligible and never add to its speech synthesis queue.
      if(window.speechSynthesis?.speaking && !window.speechSynthesis.paused) {queueRadio(7,14);return;}
      playRadio();
    },(min+Math.random()*(max-min))*1000);
  }
  function shot(name,level) {
    if(!soundsOn || !buffers[name]) return null;
    const item=source(buffers[name],soundsBus,0);
    item.s.start(); fade(item.g.gain,level,.25); return item;
  }
  function playRadio() {
    if(!soundsOn || activity!=='radioing' || voice) return;
    const choices=[0,1,2,3,4].filter(i=>i!==lastLine && buffers[`radio-${i+1}`]);
    if(!choices.length) {queueRadio(30,50);return;}
    lastLine=choices[Math.floor(Math.random()*choices.length)];
    shot('radio-static',.10);
    const item=source(buffers[`radio-${lastLine+1}`],soundsBus,0);
    const high=ctx.createBiquadFilter(), low=ctx.createBiquadFilter();
    high.type='highpass'; high.frequency.value=340;
    low.type='lowpass'; low.frequency.value=2400;
    item.s.disconnect();item.s.connect(high).connect(low).connect(item.g);item.nodes.push(high,low);
    voice=item;item.s.start(ctx.currentTime+.45);fade(item.g.gain,.13,.7);
    const cleanup=item.s.onended;
    item.s.onended=()=>{cleanup();if(voice===item){voice=null;if(soundsOn&&activity==='radioing')queueRadio(20,43);}};
  }
  function queueEffect() {
    clearTimeout(effectTimer);
    if(!soundsOn || disposed) return;
    effectTimer=setTimeout(()=>{
      if(!soundsOn)return;
      shot(Math.random()<.48?'radio-static':'distant-moan',activity==='sleeping'?.045:.07);
      queueEffect();
    },(30+Math.random()*45)*1000);
  }
  async function toggleSounds() {
    const token=++soundsVersion;soundsOn=!soundsOn;buttons();
    if(!soundsOn) {
      cancelRadio();clearTimeout(effectTimer);
      if(ctx) {fade(soundsBus.gain,0,.3);for(const item of active)if(item!==musicSource)stop(item,.3);loops.clear();}
      return;
    }
    try {
      init();await ctx.resume();loadingSounds ||= ensureSounds();
      buffers=await loadingSounds;
      if(!soundsOn || token!==soundsVersion || disposed)return;
      for(const name of ['train','wind','rain'])if(buffers[name]) {
        const item=source(buffers[name],soundsBus,0,true);item.s.start();loops.set(name,item);
      }
      fade(soundsBus.gain,.65,2);applyEnvironment();queueRadio(3,8);queueEffect();
    }catch(e){if(token===soundsVersion){soundsOn=false;buttons();showError(e);}}
  }
  function syncActivity() {
    const next=girl.classList.contains('radioing')?'radioing':girl.classList.contains('sleeping')?'sleeping':'other';
    if(next!==activity){cancelRadio();activity=next;applyEnvironment();queueRadio(3,8);}
  }
  // The real visible character class is authoritative for routines AND event overrides.
  const activityObserver=new MutationObserver(syncActivity);
  activityObserver.observe(girl,{attributes:true,attributeFilter:['class']});
  const weatherObserver=new MutationObserver(applyEnvironment);
  weatherObserver.observe(document.getElementById('weatherLabel'),{childList:true,subtree:true,characterData:true});
  syncActivity();musicButton.addEventListener('click',toggleMusic);soundsButton.addEventListener('click',toggleSounds);
  window.addEventListener('pagehide',()=>{
    disposed=true;musicVersion++;soundsVersion++;cancelRadio();clearTimeout(effectTimer);
    activityObserver.disconnect();weatherObserver.disconnect();
    for(const item of active)stop(item,0);ctx?.close();
  });
  window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
  window.ZOMBIE_TRAIN_AMBIENT={
    requestRadio:()=>{if(soundsOn&&activity==='radioing'&&!voice)queueRadio(3,8);},
    getState:()=>({musicOn,soundsOn,activity,radioActive:!!voice,radioQueued:radioTimer!=null,lastLine,
      activeSources:active.size,environmentLoops:loops.size,musicDuration:musicSource?.s.buffer.duration||0})
  };
})();
