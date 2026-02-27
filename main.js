const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const levelEl = document.getElementById("level");

const overlay = document.getElementById("overlay");
const panelTitle = document.getElementById("panel-title");
const panelBody = document.getElementById("panel-body");
const panelAction = document.getElementById("panel-action");

const btnStart = document.getElementById("btn-start");
const btnPause = document.getElementById("btn-pause");
const btnReset = document.getElementById("btn-reset");

const state = {
  running: false,
  paused: false,
  lives: 3,
  score: 0,
  level: 1,
  ballStuck: true,
  keys: new Set(),
  touchX: null,
  lastTime: 0,
};

const paddle = {
  width: 140,
  height: 14,
  speed: 640,
  x: (canvas.width - 140) / 2,
  y: canvas.height - 40,
};

const ball = {
  radius: 8,
  speed: 360,
  x: canvas.width / 2,
  y: paddle.y - 8,
  vx: 0,
  vy: 0,
};

const brickLayout = {
  rows: 6,
  cols: 12,
  padding: 10,
  offsetTop: 70,
  offsetLeft: 40,
  height: 26,
};

let bricks = [];

function initBricks() {
  bricks = [];
  const totalWidth = canvas.width - brickLayout.offsetLeft * 2;
  const brickWidth = (totalWidth - brickLayout.padding * (brickLayout.cols - 1)) / brickLayout.cols;
  for (let r = 0; r < brickLayout.rows; r += 1) {
    for (let c = 0; c < brickLayout.cols; c += 1) {
      const strength = 1 + Math.floor((r + state.level - 1) / 3);
      bricks.push({
        x: brickLayout.offsetLeft + c * (brickWidth + brickLayout.padding),
        y: brickLayout.offsetTop + r * (brickLayout.height + brickLayout.padding),
        width: brickWidth,
        height: brickLayout.height,
        hp: Math.min(strength, 3),
        alive: true,
      });
    }
  }
}

function resetBall() {
  ball.x = paddle.x + paddle.width / 2;
  ball.y = paddle.y - ball.radius - 2;
  ball.vx = 0;
  ball.vy = 0;
  state.ballStuck = true;
}

function resetGame() {
  state.lives = 3;
  state.score = 0;
  state.level = 1;
  state.running = false;
  state.paused = false;
  resetPaddle();
  resetBall();
  initBricks();
  updateHUD();
  showOverlay("벽돌깨기", "시작 버튼 또는 스페이스를 눌러 시작하세요.", "시작하기");
}

function resetPaddle() {
  paddle.width = 140;
  paddle.x = (canvas.width - paddle.width) / 2;
}

function updateHUD() {
  scoreEl.textContent = state.score;
  livesEl.textContent = state.lives;
  levelEl.textContent = state.level;
}

function showOverlay(title, body, actionLabel) {
  panelTitle.textContent = title;
  panelBody.textContent = body;
  panelAction.textContent = actionLabel;
  overlay.classList.add("show");
}

function hideOverlay() {
  overlay.classList.remove("show");
}

function startGame() {
  if (!state.running) {
    state.running = true;
    state.paused = false;
    hideOverlay();
  }
  if (state.ballStuck) {
    launchBall();
  }
}

function pauseGame() {
  if (!state.running) return;
  state.paused = !state.paused;
  if (state.paused) {
    showOverlay("일시정지", "P 키 또는 버튼으로 계속할 수 있습니다.", "계속하기");
  } else {
    hideOverlay();
  }
}

function launchBall() {
  const angle = (-Math.PI / 2) + (Math.random() * 0.6 - 0.3);
  ball.vx = Math.cos(angle) * ball.speed;
  ball.vy = Math.sin(angle) * ball.speed;
  state.ballStuck = false;
}

function loseLife() {
  state.lives -= 1;
  updateHUD();
  if (state.lives <= 0) {
    state.running = false;
    showOverlay("게임 오버", "R 키를 눌러 다시 시작하세요.", "다시 시작");
    return;
  }
  resetPaddle();
  resetBall();
}

function nextLevel() {
  state.level += 1;
  ball.speed += 35;
  paddle.width = Math.max(90, paddle.width - 8);
  initBricks();
  resetBall();
  updateHUD();
  showOverlay(`레벨 ${state.level}`, "스페이스를 눌러 계속하세요.", "계속하기");
}

function update(dt) {
  if (!state.running || state.paused) return;

  const moveDir = (state.keys.has("ArrowLeft") || state.keys.has("a")) ? -1 :
    (state.keys.has("ArrowRight") || state.keys.has("d")) ? 1 : 0;

  if (state.touchX !== null) {
    paddle.x += (state.touchX - (paddle.x + paddle.width / 2)) * 0.2;
  } else {
    paddle.x += moveDir * paddle.speed * dt;
  }

  paddle.x = Math.max(20, Math.min(canvas.width - paddle.width - 20, paddle.x));

  if (state.ballStuck) {
    ball.x = paddle.x + paddle.width / 2;
    ball.y = paddle.y - ball.radius - 2;
    return;
  }

  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  if (ball.x - ball.radius < 10) {
    ball.x = 10 + ball.radius;
    ball.vx *= -1;
  }
  if (ball.x + ball.radius > canvas.width - 10) {
    ball.x = canvas.width - 10 - ball.radius;
    ball.vx *= -1;
  }
  if (ball.y - ball.radius < 10) {
    ball.y = 10 + ball.radius;
    ball.vy *= -1;
  }
  if (ball.y - ball.radius > canvas.height) {
    loseLife();
  }

  if (ball.y + ball.radius >= paddle.y &&
      ball.x >= paddle.x && ball.x <= paddle.x + paddle.width &&
      ball.vy > 0) {
    const hit = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
    const bounceAngle = hit * (Math.PI / 3);
    ball.vx = Math.sin(bounceAngle) * ball.speed;
    ball.vy = -Math.cos(bounceAngle) * ball.speed;
    ball.y = paddle.y - ball.radius - 1;
  }

  let aliveCount = 0;
  for (const brick of bricks) {
    if (!brick.alive) continue;
    aliveCount += 1;
    if (ball.x + ball.radius > brick.x &&
        ball.x - ball.radius < brick.x + brick.width &&
        ball.y + ball.radius > brick.y &&
        ball.y - ball.radius < brick.y + brick.height) {
      const overlapX = Math.min(
        Math.abs(ball.x + ball.radius - brick.x),
        Math.abs(brick.x + brick.width - (ball.x - ball.radius))
      );
      const overlapY = Math.min(
        Math.abs(ball.y + ball.radius - brick.y),
        Math.abs(brick.y + brick.height - (ball.y - ball.radius))
      );
      if (overlapX < overlapY) {
        ball.vx *= -1;
      } else {
        ball.vy *= -1;
      }
      brick.hp -= 1;
      if (brick.hp <= 0) {
        brick.alive = false;
        state.score += 50;
      } else {
        state.score += 15;
      }
      updateHUD();
      break;
    }
  }

  if (aliveCount === 0) {
    nextLevel();
  }
}

function drawBackground() {
  ctx.fillStyle = "#0b101b";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i += 1) {
    ctx.beginPath();
    ctx.arc(canvas.width * 0.1, canvas.height * 0.3, 120 + i * 28, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPaddle() {
  ctx.save();
  ctx.fillStyle = "#f4b642";
  ctx.shadowColor = "rgba(244,182,66,0.35)";
  ctx.shadowBlur = 18;
  ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
  ctx.restore();
}

function drawBall() {
  ctx.save();
  ctx.fillStyle = "#ff6b6b";
  ctx.shadowColor = "rgba(255,107,107,0.45)";
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBricks() {
  for (const brick of bricks) {
    if (!brick.alive) continue;
    const strength = brick.hp;
    const colors = ["#5eead4", "#60a5fa", "#c084fc"];
    ctx.fillStyle = colors[strength - 1] || colors[0];
    ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.strokeRect(brick.x, brick.y, brick.width, brick.height);
  }
}

function drawHUD() {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = "14px 'Space Grotesk', sans-serif";
  ctx.fillText("SPACE 발사", 20, canvas.height - 16);
  ctx.restore();
}

function render() {
  drawBackground();
  drawBricks();
  drawPaddle();
  drawBall();
  drawHUD();
}

function gameLoop(timestamp) {
  const dt = Math.min(0.02, (timestamp - state.lastTime) / 1000) || 0;
  state.lastTime = timestamp;
  update(dt);
  render();
  requestAnimationFrame(gameLoop);
}

function handleKeyDown(e) {
  if (["ArrowLeft", "ArrowRight", "a", "d"].includes(e.key)) {
    state.keys.add(e.key);
  }
  if (e.key === " ") {
    e.preventDefault();
    startGame();
  }
  if (e.key === "p" || e.key === "P") {
    pauseGame();
  }
  if (e.key === "r" || e.key === "R") {
    resetGame();
  }
}

function handleKeyUp(e) {
  state.keys.delete(e.key);
}

function bindTouch() {
  canvas.addEventListener("touchstart", (e) => {
    const touch = e.touches[0];
    state.touchX = (touch.clientX / canvas.clientWidth) * canvas.width;
  }, { passive: true });

  canvas.addEventListener("touchmove", (e) => {
    const touch = e.touches[0];
    state.touchX = (touch.clientX / canvas.clientWidth) * canvas.width;
  }, { passive: true });

  canvas.addEventListener("touchend", () => {
    state.touchX = null;
  });

  let lastTouchY = null;
  canvas.addEventListener("touchstart", (e) => {
    lastTouchY = e.touches[0].clientY;
  }, { passive: true });
  canvas.addEventListener("touchend", (e) => {
    const endY = e.changedTouches[0].clientY;
    if (lastTouchY !== null && lastTouchY - endY > 20) {
      startGame();
    }
    lastTouchY = null;
  });
}

btnStart.addEventListener("click", startGame);
btnPause.addEventListener("click", pauseGame);
btnReset.addEventListener("click", resetGame);
panelAction.addEventListener("click", () => {
  if (state.lives <= 0) {
    resetGame();
  } else if (state.paused) {
    pauseGame();
  } else {
    startGame();
  }
});

window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);

initBricks();
resetGame();
requestAnimationFrame(gameLoop);
bindTouch();
