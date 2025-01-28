window.addEventListener("load", function () {
  const canvas = document.getElementById("canvas1");
  const ctx = canvas.getContext("2d", { alpha: false });

  // Fixed canvas dimensions
  const GAME_WIDTH = window.innerWidth;
  const GAME_HEIGHT = window.innerHeight;
  canvas.width = GAME_WIDTH;
  canvas.height = GAME_HEIGHT;

  // Game state
  let enemies = [];
  let score = 0;
  let gameOver = false;
  let gameStarted = false;
  let countdownTimer = 0;
  let countdown = 3;

  const ENEMY_SPAWN_MIN = 500;
  const ENEMY_SPAWN_MAX = 1500;

  class InputHandler {
    constructor() {
      this.keys = new Set();
      window.addEventListener("keydown", (e) => {
        if (e.key === "ArrowUp") {
          this.keys.add(e.key);
        } else if (e.key === "Enter" && gameOver) {
          restartGame();
        }
      });

      window.addEventListener("keyup", (e) => {
        if (e.key === "ArrowUp") {
          this.keys.delete(e.key);
        }
      });
    }
  }

  class Player {
    constructor(gameWidth, gameHeight) {
      this.gameWidth = gameWidth;
      this.gameHeight = gameHeight;
      this.scale = 5;
      this.spriteWidth = 32;
      this.spriteHeight = 33;
      this.width = this.spriteWidth * this.scale;
      this.height = this.spriteHeight * this.scale;
      this.x = 100;
      this.y = this.gameHeight - this.height;
      this.image = document.getElementById("playerImage");
      this.frameX = 0;
      this.frameY = 2;
      this.maxFrame = 7;
      this.fps = 20;
      this.frameTimer = 0;
      this.frameInterval = 1000 / this.fps;
      this.vy = 0;
      this.weight = 1;
    }

    restart() {
      this.x = 100;
      this.y = this.gameHeight - this.height;
      this.maxFrame = 7;
      this.frameY = 2;
      this.vy = 0;
    }

    draw(context) {
      context.drawImage(
        this.image,
        this.frameX * this.spriteWidth,
        this.frameY * this.spriteHeight,
        this.spriteWidth,
        this.spriteHeight,
        this.x,
        this.y,
        this.width,
        this.height
      );
    }

    update(input, deltaTime, enemies) {
      // Collision detection
      for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        const dx = enemy.x + enemy.width / 2 - (this.x + this.width / 2);
        const dy = enemy.y + enemy.height / 2 - (this.y + this.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < enemy.width / 2 + this.width / 2) {
          gameOver = true;
          break;
        }
      }

      // Sprite animation
      if (this.frameTimer > this.frameInterval) {
        if (this.frameX >= this.maxFrame) this.frameX = 0;
        else this.frameX++;
        this.frameTimer = 0;
      } else {
        this.frameTimer += deltaTime;
      }

      // Jump control
      if (input.keys.has("ArrowUp") && this.onGround()) {
        this.vy = -32;
      }

      // Vertical movement
      this.y += this.vy;

      if (!this.onGround()) {
        this.vy += this.weight;
        this.maxFrame = 5;
        this.frameY = 3;
        this.frameX = 4;
      } else {
        this.vy = 0;
        this.y = this.gameHeight - this.height;
        this.maxFrame = 7;
        this.frameY = 2;
      }
    }

    onGround() {
      return this.y >= this.gameHeight - this.height;
    }
  }

  class Background {
    constructor(gameWidth, gameHeight) {
      this.gameWidth = gameWidth;
      this.gameHeight = gameHeight;
      this.image = document.getElementById("backgroundImage");
      this.x = 0;
      this.y = 0;
      this.width = gameWidth;
      this.height = gameHeight;
      this.speed = 7;
    }

    draw(context) {
      context.drawImage(this.image, this.x, this.y, this.width, this.height);
      context.drawImage(
        this.image,
        this.x + this.width - this.speed,
        this.y,
        this.width,
        this.height
      );
    }

    update() {
      this.x -= this.speed;
      if (this.x < -this.width) this.x = 0;
    }

    restart() {
      this.x = 0;
    }
  }

  class Enemy {
    constructor(gameWidth, gameHeight) {
      this.gameWidth = gameWidth;
      this.gameHeight = gameHeight;
      this.image = document.getElementById("enemyImage");
      this.scale = 0.2;
      this.width = this.image.width * this.scale;
      this.height = this.image.height * this.scale;
      this.x = this.gameWidth;
      this.y = this.gameHeight - this.height;
      this.speed = 8;
      this.markedForDeletion = false;
    }

    draw(context) {
      context.drawImage(this.image, this.x, this.y, this.width, this.height);
    }

    update() {
      this.x -= this.speed;
      if (this.x < 0 - this.width) {
        this.markedForDeletion = true;
        score++;
      }
    }
  }

  function handleEnemies(deltaTime) {
    if (enemyTimer > enemyInterval) {
      enemies.push(new Enemy(canvas.width, canvas.height));
      enemyTimer = 0;
      enemyInterval =
        Math.random() * (ENEMY_SPAWN_MAX - ENEMY_SPAWN_MIN) + ENEMY_SPAWN_MIN;
    } else {
      enemyTimer += deltaTime;
    }

    for (let i = 0; i < enemies.length; i++) {
      enemies[i].draw(ctx);
      enemies[i].update();
    }

    enemies = enemies.filter((enemy) => !enemy.markedForDeletion);
  }

  function restartGame() {
    player.restart();
    background.restart();
    enemies = [];
    score = 0;
    gameOver = false;
    gameStarted = false;
    countdown = 3;
    countdownTimer = 0;
    animate(0);
  }

  // Initialize game objects
  const input = new InputHandler();
  const player = new Player(canvas.width, canvas.height);
  const background = new Background(canvas.width, canvas.height);

  let lastTime = 0;
  let enemyTimer = 0;
  let enemyInterval = 1000;

  function displayCountdown(context, canvas) {
    context.textAlign = "center";
    context.font = "80px 'Press Start 2P', cursive";
    context.shadowColor = "rgba(0, 0, 0, 0.8)";
    context.shadowOffsetX = 3;
    context.shadowOffsetY = 3;
    context.shadowBlur = 5;

    context.lineWidth = 7;
    context.strokeStyle = "#000";
    context.lineJoin = "round";
    context.strokeText(
      countdown > 0 ? countdown.toString() : "GO!",
      canvas.width / 2,
      canvas.height / 2
    );
    context.fillStyle = "white";
    context.fillText(
      countdown > 0 ? countdown.toString() : "GO!",
      canvas.width / 2 + 2,
      canvas.height / 2 + 2
    );
  }

  function displayStatusText(context, canvas) {
    context.textAlign = "left";
    context.font = "30px 'Press Start 2P', cursive";
    context.shadowColor = "rgba(0, 0, 0, 0.8)";
    context.shadowOffsetX = 2;
    context.shadowOffsetY = 2;
    context.shadowBlur = 4;

    context.lineWidth = 5;
    context.strokeStyle = "#000";
    context.lineJoin = "round";
    context.strokeText("Score: " + score, 20, 50);
    context.fillStyle = "white";
    context.fillText("Score: " + score, 22, 52);

    if (gameOver) {
      context.textAlign = "center";
      context.fillStyle = "black";
      context.strokeText(
        "GAME OVER, press Enter to restart!",
        canvas.width / 2,
        200
      );
      context.fillStyle = "white";
      context.fillText(
        "GAME OVER, press Enter to restart!",
        canvas.width / 2 + 2,
        202
      );
    }
  }

  function animate(timeStamp) {
    const deltaTime = timeStamp - lastTime;
    lastTime = timeStamp;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    background.draw(ctx);
    player.draw(ctx);

    if (!gameStarted) {
      if (countdownTimer > 1000) {
        countdown--;
        countdownTimer = 0;
      } else {
        countdownTimer += deltaTime;
      }

      if (countdown < 0) {
        gameStarted = true;
      }

      displayCountdown(ctx, canvas);
    }

    if (gameStarted && !gameOver) {
      background.update();
      player.update(input, deltaTime, enemies);
      handleEnemies(deltaTime);
    }

    displayStatusText(ctx, canvas);

    if (!gameOver) requestAnimationFrame(animate);
  }

  animate(0);
});
