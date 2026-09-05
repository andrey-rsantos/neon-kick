import "./style.css";
import { createScene } from "./scene.js";
import { makeBall, drive, hitBall, stepBall } from "./physics.js";
import {
  makeRoster,
  resetRoster,
  assignRoles,
  botInput,
  collideCars,
} from "./teams.js";

document.querySelector("#app").innerHTML = `
 <div id="world" aria-label="Arena 3D de futebol de carros"></div>
 <header class="topbar"><div class="brand">NEON<em> KICK</em><small>ARCADE MOTORSPORTS</small></div><div class="tools"><span class="live">ARENA ONLINE · LOCAL</span><button id="camera" class="icon hidden" aria-label="Alternar câmera (C)">C · CARRO</button><button id="sound" class="icon" aria-label="Ativar som">SOM OFF</button><button id="pause" class="icon hidden" aria-label="Pausar partida">Ⅱ PAUSA</button><button id="fullscreen" class="icon" aria-label="Tela cheia">⛶</button></div></header>
 <main id="menu" class="menu"><div class="menu-content"><div class="eyebrow">FUTEBOL EM ALTA VOLTAGEM</div><h1>ACELERE.<br>VOE.<span>MARQUE.</span></h1><p class="intro">Quatro rodas. Uma bola. Nenhum freio na emoção.<br>Domine a arena e faça o próximo golaço.</p><div class="settings"><label for="mode">MODO</label><select id="mode"><option value="1">1 × 1</option><option value="2">2 × 2</option><option value="3">3 × 3</option></select><label for="difficulty">SEU DESAFIO</label><select id="difficulty"><option value="casual">Casual</option><option value="normal" selected>Competitivo</option></select></div><button id="start" class="primary">ENTRAR NA ARENA <span>↗</span></button><div class="match-meta"><span id="mode-summary"><b>1 × 1</b> CONTRA IA</span><span><b>02:00</b> POR PARTIDA</span><span><b>∞</b> REVANCHES</span></div></div></main>
 <div id="hud" class="hud hidden"><div class="scoreboard"><div class="team">AZUL <b id="score-blue">0</b></div><div id="time" class="time">2:00</div><div class="team orange"><b id="score-orange">0</b> LARANJA</div></div><div class="ball-guide"><span id="ball-arrow">↑</span><span id="ball-direction">BOLA À FRENTE</span></div><div class="radar" aria-label="Radar da arena: azul é você, laranja é o rival, branco é a bola"><span id="radar-cars"></span><i id="radar-ball" class="radar-ball"></i></div><div id="dash-status" class="dash-status"></div><div id="callout" class="callout" aria-live="polite"></div><div class="speed"><b id="speed">0</b> KM/H<br><small>SEU ALVO: GOL LARANJA</small></div><div class="boost"><div class="boost-title">TURBO <b id="boost-number">100</b></div><div class="meter"><i id="boost-fill"></i></div><small>SHIFT · RECARREGA AUTOMATICAMENTE</small></div></div>
 <footer class="controls"><div class="control"><kbd>W A S D</kbd><span>dirigir</span></div><div class="control"><kbd>SHIFT</kbd><span>turbo</span></div><div class="control"><kbd>ESPAÇO</kbd><span>pulo / 2× dash</span></div><div class="control"><kbd>E</kbd><span>derrapar</span></div><div class="control"><kbd>C</kbd><span>câmera</span></div><div class="control"><kbd>ESC</kbd><span>pausar</span></div></footer><div class="arena-label">THE NIGHT YARD<small id="match-format">1 × 1 / CIRCUITO NEON</small></div>
 <div id="modal" class="modal hidden"><section class="panel"><div id="modal-eyebrow" class="eyebrow">RESPIRE. RECARREGUE.</div><h2 id="modal-title">JOGO PAUSADO</h2><p id="modal-copy"></p><button id="resume" class="primary">VOLTAR AO JOGO</button><button id="back" class="secondary">Voltar ao início</button></section></div>
 <div id="touch" class="touch"><div class="touch-group"><button data-key="KeyA" aria-label="Virar à esquerda">◀</button><button data-key="KeyD" aria-label="Virar à direita">▶</button><button data-key="KeyS" aria-label="Dar ré">RÉ</button></div><div class="touch-group"><button data-key="Space" aria-label="Pular; toque novamente no ar para dash">↑ 2×</button><button data-key="ShiftLeft" aria-label="Turbo">TURBO</button><button data-key="KeyW" aria-label="Acelerar">GÁS</button></div></div>`;
const $ = (id) => document.getElementById(id);
const initialRoster = makeRoster(1);
const state = {
  phase: "menu",
  cameraMode: "chase",
  teamSize: 1,
  cars: initialRoster,
  player: initialRoster[0],
  ball: makeBall(),
  aiClock: 0,
  score: [0, 0],
  time: 120,
  overtime: false,
  delay: 0,
};
let view;
try {
  view = createScene($("world"));
} catch (error) {
  $("menu").innerHTML =
    '<div class="menu-content"><h1>OPS!</h1><p>Não foi possível iniciar o WebGL. Ative a aceleração gráfica do navegador e recarregue a página.</p></div>';
  throw error;
}
const keys = new Set();
let sound = false,
  audio,
  accumulator = 0,
  last = performance.now(),
  elapsed = 0,
  pausedPhase = "playing",
  difficulty = "normal",
  lastTick = -1;
function tone(freq = 400, duration = 0.12, type = "sine", volume = 0.06) {
  if (!sound) return;
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    audio.resume();
    const osc = audio.createOscillator(),
      gain = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audio.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      freq * 0.5,
      audio.currentTime + duration,
    );
    gain.gain.setValueAtTime(volume, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + duration);
  } catch {
    sound = false;
  }
}
function resetPositions() {
  resetRoster(state.cars);
  Object.assign(state.ball, makeBall());
  state.aiClock = 0;
}
function configureTeams() {
  state.teamSize = Number($("mode").value);
  state.cars = makeRoster(state.teamSize);
  state.player = state.cars[0];
  $("radar-cars").replaceChildren(
    ...state.cars.map((c) => {
      const dot = document.createElement("i");
      dot.id = `radar-${c.id}`;
      dot.className = c.human
        ? "radar-player"
        : c.team === 0
          ? "radar-ally"
          : "radar-bot";
      return dot;
    }),
  );
  $("match-format").textContent =
    `${state.teamSize} \u00d7 ${state.teamSize} / CIRCUITO NEON`;
}
function modeSummary() {
  const n = Number($("mode").value);
  $("mode-summary").textContent =
    n === 1
      ? "VOC\u00ca CONTRA 1 RIVAL IA"
      : `VOC\u00ca + ${n - 1} ALIADO${n === 3 ? "S" : ""} IA CONTRA ${n} RIVAIS IA`;
}
$("mode").onchange = modeSummary;
configureTeams();
function kickoff() {
  resetPositions();
  state.phase = "countdown";
  state.delay = 3;
  lastTick = -1;
}
function start() {
  difficulty = $("difficulty").value;
  configureTeams();
  state.score = [0, 0];
  state.time = 120;
  state.overtime = false;
  keys.clear();
  $("menu").classList.add("hidden");
  $("modal").classList.add("hidden");
  $("hud").classList.remove("hidden");
  $("pause").classList.remove("hidden");
  $("camera").classList.remove("hidden");
  $("touch").classList.add("playing");
  kickoff();
  tone(600);
}
function pause() {
  if (["menu", "finished"].includes(state.phase)) return;
  if (state.phase === "paused") {
    state.phase = pausedPhase;
    $("modal").classList.add("hidden");
    return;
  }
  pausedPhase = state.phase;
  state.phase = "paused";
  keys.clear();
  $("modal-eyebrow").textContent = "RESPIRE. RECARREGUE.";
  $("modal-title").textContent = "JOGO PAUSADO";
  $("modal-copy").textContent =
    "Seu tempo está guardado. A arena espera por você.";
  $("resume").textContent = "VOLTAR AO JOGO";
  $("modal").classList.remove("hidden");
}
function finish() {
  state.phase = "finished";
  keys.clear();
  const won = state.score[0] > state.score[1];
  $("modal-eyebrow").textContent = "APITO FINAL";
  $("modal-title").textContent = won ? "A ARENA É SUA!" : "QUASE LÁ!";
  $("modal-copy").textContent =
    `Azul ${state.score[0]} × ${state.score[1]} Laranja. ${won ? "Vitória em alta voltagem. Que tal mais uma?" : "Uma nova partida, um novo golaço. Tente outra vez."}`;
  $("resume").textContent = "JOGAR NOVAMENTE";
  $("modal").classList.remove("hidden");
  tone(won ? 880 : 220, 0.6);
}
function goal(team) {
  state.score[team]++;
  state.phase = "goal";
  state.delay = 2.8;
  state.goalTeam = team;
  view.burst(state.ball.x, 2, state.ball.z, team === 0 ? 0 : 1, 100);
  tone(team === 0 ? 740 : 260, 0.7, "triangle", 0.12);
}
function step(dt) {
  if (state.phase === "countdown") {
    state.delay -= dt;
    const count = Math.ceil(state.delay);
    if (count !== lastTick) {
      lastTick = count;
      tone(count ? 420 : 840, 0.1);
    }
    if (state.delay <= 0) {
      state.phase = "playing";
      state.delay = 0.7;
    }
    return;
  }
  if (state.phase === "goal") {
    state.delay -= dt;
    if (state.delay <= 0) {
      if (
        state.overtime ||
        (state.time <= 0 && state.score[0] !== state.score[1])
      )
        finish();
      else kickoff();
    }
    return;
  }
  if (state.phase !== "playing") return;
  state.time = Math.max(0, state.time - dt);
  state.delay = Math.max(0, state.delay - dt);
  const input = {
    throttle:
      (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) -
      (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0),
    steer:
      (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) -
      (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0),
    boost: keys.has("ShiftLeft") || keys.has("ShiftRight"),
    jump: keys.has("Space"),
    drift: keys.has("KeyE"),
  };
  const previousDash = state.player.dashTime;
  state.player.turbo = drive(state.player, input, dt);
  if (state.player.dashTime > previousDash) {
    tone(320, 0.18, "sawtooth", 0.035);
    view.burst(state.player.x, state.player.y + 0.7, state.player.z, 0, 12);
  }
  state.aiClock -= dt;
  if (state.aiClock <= 0) {
    assignRoles(state.cars, state.ball);
    state.aiClock = 0.35;
  }
  for (const c of state.cars) {
    if (!c.human)
      c.turbo = drive(c, botInput(c, state.ball, state.cars, difficulty), dt);
  }
  collideCars(state.cars);
  for (const c of state.cars) {
    const previousHit = c.dashHit;
    const impact = hitBall(c, state.ball);
    if (c.dashHit && !previousHit) {
      tone(640, 0.16, "triangle", 0.08);
      view.burst(state.ball.x, state.ball.y, state.ball.z, 0, 20);
    }
    if (impact > 3) {
      tone(100 + impact * 9, 0.09, "triangle");
      view.burst(state.ball.x, state.ball.y, state.ball.z, 2, 8);
    }
  }
  const scored = stepBall(state.ball, dt);
  if (scored >= 0) {
    goal(scored);
    return;
  }
  if (state.time <= 0 && !state.overtime) {
    if (state.score[0] !== state.score[1]) finish();
    else {
      state.overtime = true;
      tone(780, 0.4);
      kickoff();
    }
  }
}
function hud() {
  const car = state.player;
  $("dash-status").textContent =
    car.dashTime > 0
      ? "DASH!"
      : car.y === 0
        ? "ESPAÇO 2× · PULO + DASH"
        : !car.dashUsed && car.airTime < 0.65
          ? "ESPAÇO AGORA · DASH"
          : "DASH RECARREGA AO POUSAR";
  $("dash-status").classList.toggle(
    "ready",
    car.y > 0 && !car.dashUsed && car.airTime < 0.65,
  );
  $("score-blue").textContent = state.score[0];
  $("score-orange").textContent = state.score[1];
  const secs = Math.ceil(state.time);
  $("time").textContent = state.overtime
    ? "GOL DE OURO"
    : `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
  $("time").style.fontSize = state.overtime ? "14px" : "";
  $("boost-number").textContent = Math.round(state.player.boost);
  $("boost-fill").style.width = state.player.boost + "%";
  $("speed").textContent = Math.round(
    Math.hypot(state.player.vx, state.player.vz) * 4,
  );
  for (const obj of [...state.cars, state.ball]) {
    const dot = $(obj === state.ball ? "radar-ball" : `radar-${obj.id}`);
    dot.style.left = `${50 + (obj.x / 42) * 100}%`;
    dot.style.top = `${50 + (obj.z / 74) * 100}%`;
    if (obj.human)
      dot.style.transform = `translate(-50%, -50%) rotate(${obj.angle}rad)`;
  }
  const dx = state.ball.x - state.player.x,
    dz = state.ball.z - state.player.z;
  const angle = Math.atan2(dx, -dz) - state.player.angle;
  const relative = Math.atan2(Math.sin(angle), Math.cos(angle));
  $("ball-arrow").style.transform = `rotate(${relative}rad)`;
  $("ball-direction").textContent =
    `${Math.abs(relative) > 2 ? "BOLA ATRÁS" : Math.abs(relative) < 0.5 ? "BOLA À FRENTE" : relative > 0 ? "BOLA À DIREITA" : "BOLA À ESQUERDA"} · ${Math.round(Math.hypot(dx, dz))} m`;
  let text = "";
  if (state.phase === "countdown")
    text = `${Math.max(1, Math.ceil(state.delay))}<small>${state.overtime ? "GOL DE OURO · QUEM MARCAR VENCE" : "ACELERE PARA O GOL LARANJA"}</small>`;
  if (state.phase === "playing" && state.delay > 0) text = "VAI!";
  if (state.phase === "goal")
    text =
      state.goalTeam === 0
        ? "GOOOL!<small>ISSO É NEON KICK.</small>"
        : "GOL DO RIVAL<small>A VIRADA COMEÇA AGORA.</small>";
  $("callout").innerHTML = text;
}
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  elapsed += dt;
  accumulator += dt;
  while (accumulator >= 1 / 120) {
    step(1 / 120);
    accumulator -= 1 / 120;
  }
  hud();
  view.render(state, dt, elapsed);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
const gameplayKeys = [
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Space",
  "ShiftLeft",
  "ShiftRight",
  "KeyE",
];
addEventListener("keydown", (e) => {
  if (e.target instanceof HTMLSelectElement) return;
  if (gameplayKeys.includes(e.code) && state.phase !== "menu") {
    e.preventDefault();
    keys.add(e.code);
  }
  if (e.code === "Escape" && !e.repeat) pause();
  if (e.code === "KeyC" && !e.repeat && state.phase !== "menu") toggleCamera();
});
addEventListener("keyup", (e) => keys.delete(e.code));
addEventListener("blur", () => {
  keys.clear();
  if (["playing", "countdown", "goal"].includes(state.phase)) pause();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && ["playing", "countdown", "goal"].includes(state.phase))
    pause();
});
function toggleCamera() {
  state.cameraMode = state.cameraMode === "chase" ? "ball" : "chase";
  $("camera").textContent =
    state.cameraMode === "chase" ? "C · CARRO" : "C · BOLA";
}
$("camera").onclick = toggleCamera;
$("start").onclick = start;
$("pause").onclick = pause;
$("resume").onclick = () => (state.phase === "finished" ? start() : pause());
$("back").onclick = () => {
  state.phase = "menu";
  keys.clear();
  resetPositions();
  $("modal").classList.add("hidden");
  $("hud").classList.add("hidden");
  $("pause").classList.add("hidden");
  $("camera").classList.add("hidden");
  $("touch").classList.remove("playing");
  $("menu").classList.remove("hidden");
};
$("sound").onclick = () => {
  sound = !sound;
  $("sound").textContent = sound ? "SOM ON" : "SOM OFF";
  $("sound").setAttribute("aria-label", sound ? "Desativar som" : "Ativar som");
  tone(660);
};
$("fullscreen").onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = "Tela cheia indisponível neste navegador.";
    document.body.append(toast);
    setTimeout(() => toast.remove(), 3000);
  }
};
document.querySelectorAll("[data-key]").forEach((button) => {
  button.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    button.setPointerCapture(e.pointerId);
    keys.add(button.dataset.key);
  });
  for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
    button.addEventListener(event, () => keys.delete(button.dataset.key));
});
// Read-only diagnostics help automated browser checks without changing a match.
window.neonKick = { snapshot: () => JSON.parse(JSON.stringify(state)) };
