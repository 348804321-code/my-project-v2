const noteOrder = [
  "F3", "F#3", "G3", "G#3", "A3", "A#3", "B3",
  "C4", "C#4", "D4", "D#4", "E4", "F4", "F#4", "G4", "G#4", "A4", "A#4", "B4",
  "C5", "C#5", "D5", "D#5", "E5", "F5", "F#5", "G5", "G#5", "A5"
];
const notes = noteOrder;

let current = "C4";
let level = 1;
let score = 0;
let combo = 0;
let hearts = 5;

const synth = new Tone.Sampler({
  urls: {
    A0: "A0.mp3",
    C1: "C1.mp3",
    "D#1": "Ds1.mp3",
    "F#1": "Fs1.mp3",
    A1: "A1.mp3",
    C2: "C2.mp3",
    "D#2": "Ds2.mp3",
    "F#2": "Fs2.mp3",
    A2: "A2.mp3",
    C3: "C3.mp3",
    "D#3": "Ds3.mp3",
    "F#3": "Fs3.mp3",
    A3: "A3.mp3",
    C4: "C4.mp3",
    "D#4": "Ds4.mp3",
    "F#4": "Fs4.mp3",
    A4: "A4.mp3",
    C5: "C5.mp3",
    "D#5": "Ds5.mp3",
    "F#5": "Fs5.mp3",
    A5: "A5.mp3",
    C6: "C6.mp3",
    "D#6": "Ds6.mp3",
    "F#6": "Fs6.mp3",
    A6: "A6.mp3"
  },
  release: 1.2,
  baseUrl: "https://tonejs.github.io/audio/salamander/"
}).toDestination();

const waterSynth = new Tone.MembraneSynth({
  pitchDecay: 0.02,
  octaves: 2,
  envelope: {
    attack: 0.001,
    decay: 0.15,
    sustain: 0.01,
    release: 0.1
  }
}).toDestination();

async function ensurePianoReady() {
  await Tone.start();
  await synth.loaded;
}

async function playChordArpeggio(notes = ["C4", "E4", "G4"]) {
  await ensurePianoReady();
  for (const note of notes) {
    await playTone(note, "8n");
  }
}

function playWaterDrop() {
  if (Tone.context.state !== 'running') {
    Tone.start();
  }
  waterSynth.triggerAttackRelease("C6", "16n");
}

async function transitionTo(screenId) {
  await playChordArpeggio();
  navigateTo(screenId);
}

function navigateTo(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId + '-screen').classList.add('active');
  
  if (screenId === 'game') {
    initGame();
  }
}

function initGame() {
  gameStarted = false;
  questionCount = 0;
  questionActive = false;
  score = 0;
  combo = 0;
  hearts = 5;
  answerHistory = [];
  
  const recordBtn = document.getElementById("referenceBtn");
  recordBtn.innerText = "开始闯关";
  recordBtn.disabled = false;
  
  update();
  generateQuestion();
}

function setupGuideKeys() {
  document.querySelectorAll('#guide-screen .key').forEach(key => {
    key.addEventListener('click', async () => {
      const note = key.dataset.note;
      if (!note) return;
      key.classList.add('active');
      await ensurePianoReady();
      playTone(note, '8n');
      setTimeout(() => key.classList.remove('active'), 200);
    });
  });
}

const recordBtn = document.getElementById("referenceBtn");
const recordCircle = document.getElementById("record");
const messageEl = document.getElementById("message");
const countdownEl = document.getElementById("countdown");
const flashEl = document.getElementById("flash");

let countdownTimer = null;
let questionActive = false;
let gameStarted = false;
let questionCount = 0;
const MAX_QUESTIONS = 10;
let answerHistory = [];

recordBtn.onclick = async () => {
  if (!gameStarted) {
    gameStarted = true;
    recordBtn.innerText = "闯关中...";
    recordBtn.disabled = true;
    answerHistory = [];
    questionCount = 0;
    await startChallenge();
  }
};

recordCircle.onclick = async () => {
  if (!gameStarted) {
    document.querySelector(".record-text").innerText = "请点击上方按钮开始";
    return;
  }
};

function generateQuestion() {
  current = notes[Math.floor(Math.random() * notes.length)];

  const choices = [current];
  while (choices.length < 4) {
    const candidate = notes[Math.floor(Math.random() * notes.length)];
    if (!choices.includes(candidate)) {
      choices.push(candidate);
    }
  }

  choices.sort(() => Math.random() - 0.5);
  const box = document.getElementById("options");
  box.innerHTML = "";

  choices.forEach(item => {
    const btn = document.createElement("button");
    btn.className = "option";
    btn.innerText = item;
    btn.disabled = true;
    btn.onclick = () => selectAnswer(item, btn);
    box.appendChild(btn);
  });
}

function setOptionsEnabled(enabled) {
  document.querySelectorAll("#options .option").forEach(btn => {
    btn.disabled = !enabled;
    btn.style.opacity = enabled ? "1" : "0.6";
    if (!enabled) {
      btn.classList.remove("correct", "wrong");
    }
  });
}

function playTone(note, duration = "4n") {
  return new Promise(resolve => {
    synth.triggerAttackRelease(note, duration);
    setTimeout(resolve, Tone.Time(duration).toMilliseconds() + 120);
  });
}

async function playQuestionSequence() {
  await ensurePianoReady();
  recordCircle.classList.add("spin");

  await playTone("A4", "4n");
  await playTone(current, "4n");
  await new Promise(resolve => setTimeout(resolve, 3000));
  await playTone("A4", "4n");
  await playTone(current, "4n");

  recordCircle.classList.remove("spin");
}

function startCountdown() {
  let countdownValue = 8;
  countdownEl.innerText = countdownValue;
  questionActive = true;
  countdownTimer = setInterval(() => {
    countdownValue -= 1;
    countdownEl.innerText = countdownValue;
    if (countdownValue <= 0) {
      stopCountdown();
      revealCorrectAnswer();
    }
  }, 1000);
}

function stopCountdown() {
  clearInterval(countdownTimer);
  countdownTimer = null;
  questionActive = false;
}

async function startChallenge() {
  await beginNextQuestion();
}

async function beginNextQuestion() {
  questionCount++;
  
  if (questionCount > MAX_QUESTIONS || hearts <= 0) {
    showGameOver();
    return;
  }

  generateQuestion();
  setOptionsEnabled(false);
  await playQuestionSequence();
  setOptionsEnabled(true);
  startCountdown();
}

function revealCorrectAnswer() {
  messageEl.innerText = `⏱ 正确答案：${current}`;
  setOptionsEnabled(false);
  setTimeout(() => {
    messageEl.innerText = "";
    beginNextQuestion();
  }, 1200);
}

function showGameOver() {
  stopCountdown();
  questionActive = false;
  const isPassed = score >= 60;
  const errorQuestions = answerHistory.filter(q => !q.isCorrect);
  
  let gameOverHTML = `
    <div class="game-over-screen">
      <div class="score-section">
        <h1>挑战结束</h1>
        <div class="final-score">${score}</div>
        <div class="max-score">/ 100</div>
        <div class="status ${isPassed ? 'passed' : 'failed'}">
          ${isPassed ? '✓ 及格' : '✗ 未及格'}
        </div>
      </div>
      
      ${errorQuestions.length > 0 ? `
        <div class="error-section">
          <h2>错误题目分析</h2>
          <table class="error-table">
            <thead>
              <tr>
                <th>题号</th>
                <th>标准音</th>
                <th>你的选择</th>
                <th>对比</th>
              </tr>
            </thead>
            <tbody>
              ${errorQuestions.map(q => {
                const standardIdx = noteOrder.indexOf(q.current);
                const choiceIdx = noteOrder.indexOf(q.answer);
                const comparison = choiceIdx < standardIdx ? '偏高' : choiceIdx > standardIdx ? '偏低' : '错误';
                return `
                  <tr>
                    <td>#${q.questionNum}</td>
                    <td>${q.current}</td>
                    <td>${q.answer}</td>
                    <td class="comparison ${comparison}">${comparison}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      ` : `<div class="perfect-section"><h2>🎉 完美通过！全部答题正确！</h2></div>`}
      
      <button class="restart-btn" onclick="navigateTo('title')">返回首页</button>
    </div>
  `;
  
  const gameOverScreen = document.getElementById('game-over-screen');
  gameOverScreen.innerHTML = gameOverHTML;
  navigateTo('game-over');
}

async function selectAnswer(answer, btn) {
  if (!questionActive) {
    return;
  }
  playWaterDrop();
  stopCountdown();
  setOptionsEnabled(false);

  const isCorrect = answer === current;
  
  answerHistory.push({
    questionNum: questionCount,
    current: current,
    answer: answer,
    isCorrect: isCorrect
  });

  if (isCorrect) {
    btn.classList.add("correct");
    combo++;
    score += 10;
    level++;
    messageEl.innerText = "✨ PERFECT";
  } else {
    btn.classList.add("wrong");
    combo = 0;
    hearts--;
    document.body.classList.add("shake");
    flashEl.classList.add("redFlash");

    const guessIndex = noteOrder.indexOf(answer);
    const actualIndex = noteOrder.indexOf(current);
    if (guessIndex < actualIndex) {
      messageEl.innerText = "✗ 声音偏高了";
    } else if (guessIndex > actualIndex) {
      messageEl.innerText = "✗ 声音偏低了";
    } else {
      messageEl.innerText = "✗ 音高偏离";
    }

    if (navigator.vibrate) {
      navigator.vibrate(300);
    }
  }

  update();
  setTimeout(() => {
    document.body.classList.remove("shake");
    flashEl.classList.remove("redFlash");
    messageEl.innerText = "";
    beginNextQuestion();
  }, 1200);
}

function update(){

document
.getElementById("level")
.innerText=questionCount + " / " + MAX_QUESTIONS;

document
.getElementById("score")
.innerText=score;

document
.getElementById("combo")
.innerText=
"连击 "+combo;

document
.getElementById("hearts")
.innerHTML=
"❤️".repeat(hearts);

}

setupGuideKeys();
generateQuestion();
update();
