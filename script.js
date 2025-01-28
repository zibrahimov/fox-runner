window.addEventListener("load", function () {
  // Get canvas and 2D context to draw
  const canvas = document.getElementById("canvas1");
  const ctx = canvas.getContext("2d", { alpha: false });

  let animationFrameId;

  // Fixed canvas dimensions
  const GAME_WIDTH = window.innerWidth;
  const GAME_HEIGHT = window.innerHeight;
  canvas.width = GAME_WIDTH;
  canvas.height = GAME_HEIGHT;

  // Game state variables
  let enemies = []; // Stores the active enemies
  let score = 0; // Player score
  let gameOver = false; // Game over state
  let gameStarted = false; // Game start state
  let countdownTimer = 0; // Timer for countdown
  let countdown = 3; // Countdown seconds before game starts

  const ENEMY_SPAWN_MIN = 500; // Min time between enemy spawns
  const ENEMY_SPAWN_MAX = 1500; // Max time between enemy spawns

  // InputHandler to capture user inputs (e.g., arrow keys and enter)
  class InputHandler {
    constructor() {
      this.keys = new Set();

      // Register keydown event to track ArrowUp and Enter keys
      this.handleKeyDown = (e) => {
        if (e.key === "ArrowUp") {
          e.preventDefault(); // Prevent page scrolling
          this.keys.add(e.key);
        } else if (e.key === "Enter" && gameOver) {
          restartGame(); // Restart game if Enter is pressed after game over
        }
      };

      // Register keyup event to stop tracking ArrowUp key
      this.handleKeyUp = (e) => {
        if (e.key === "ArrowUp") {
          this.keys.delete(e.key);
        }
      };

      window.addEventListener("keydown", this.handleKeyDown);
      window.addEventListener("keyup", this.handleKeyUp);
    }

    // Cleanup event listeners when no longer needed
    cleanup() {
      window.removeEventListener("keydown", this.handleKeyDown);
      window.removeEventListener("keyup", this.handleKeyUp);
    }
  }

  // Player class to handle player-related logic
  class Player {
    constructor(gameWidth, gameHeight) {
      this.gameWidth = gameWidth;
      this.gameHeight = gameHeight;
      this.scale = 5;
      this.spriteWidth = 32;
      this.spriteHeight = 33;
      this.width = this.spriteWidth * this.scale;
      this.height = this.spriteHeight * this.scale;
      this.x = 100; // Initial x-position
      this.y = this.gameHeight - this.height; // Initial y-position
      this.image = document.getElementById("playerImage"); // Player sprite
      this.frameX = 0;
      this.frameY = 2; // Start from the default idle frame
      this.maxFrame = 7; // Max frame for animation
      this.fps = 20;
      this.frameTimer = 0;
      this.frameInterval = 1000 / this.fps; // Time between frames for animation
      this.vy = 0; // Vertical velocity for jumping
      this.weight = 1; // Gravity effect
    }

    // Reset player state to start a new game
    restart() {
      this.x = 100;
      this.y = this.gameHeight - this.height;
      this.maxFrame = 7;
      this.frameY = 2;
      this.vy = 0;
    }

    // Draw the player sprite at the current position
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

    // Update player position, handle input, and check collisions
    update(input, deltaTime, enemies) {
      // Collision detection with enemies
      for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        const dx = enemy.x + enemy.width / 2 - (this.x + this.width / 2);
        const dy = enemy.y + enemy.height / 2 - (this.y + this.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < enemy.width / 2 + this.width / 2) {
          gameOver = true; // End the game if player collides with enemy
          break;
        }
      }

      // Handle sprite animation for player movement
      if (this.frameTimer > this.frameInterval) {
        if (this.frameX >= this.maxFrame) this.frameX = 0;
        else this.frameX++;
        this.frameTimer = 0;
      } else {
        this.frameTimer += deltaTime;
      }

      // Jump control
      if (input.keys.has("ArrowUp") && this.onGround()) {
        this.vy = -32; // Apply upwards force when jumping
      }

      // Vertical movement and gravity effect
      this.y += this.vy;

      if (!this.onGround()) {
        this.vy += this.weight; // Apply gravity
        this.maxFrame = 5; // Change to falling animation
        this.frameY = 3;
        this.frameX = 4;
      } else {
        this.vy = 0;
        this.y = this.gameHeight - this.height; // Player lands on the ground
        this.maxFrame = 7; // Change to idle animation
        this.frameY = 2;
      }
    }

    // Check if player is on the ground (not falling)
    onGround() {
      return this.y >= this.gameHeight - this.height;
    }
  }

  // Background class to manage the scrolling background
  class Background {
    constructor(gameWidth, gameHeight) {
      this.gameWidth = gameWidth;
      this.gameHeight = gameHeight;
      this.image = document.getElementById("backgroundImage"); // Background image
      this.x = 0;
      this.y = 0;
      this.width = gameWidth;
      this.height = gameHeight;
      this.speed = 7; // Scroll speed
    }

    // Draw background twice to create a seamless scrolling effect
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

    // Update background position for scrolling
    update() {
      this.x -= this.speed;
      if (this.x < -this.width) this.x = 0; // Loop background
    }

    // Reset background to its initial position
    restart() {
      this.x = 0;
    }
  }

  // Enemy class to manage enemy behavior and rendering
  class Enemy {
    constructor(gameWidth, gameHeight) {
      this.gameWidth = gameWidth;
      this.gameHeight = gameHeight;
      this.image = document.getElementById("enemyImage"); // Enemy sprite
      this.scale = 0.2; // Scale of the enemy
      this.width = this.image.width * this.scale;
      this.height = this.image.height * this.scale;
      this.x = this.gameWidth; // Start enemy off-screen
      this.y = this.gameHeight - this.height;
      this.speed = 8; // Enemy movement speed
      this.markedForDeletion = false; // Flag to mark enemies for deletion
    }

    // Draw the enemy sprite at its current position
    draw(context) {
      context.drawImage(this.image, this.x, this.y, this.width, this.height);
    }

    // Update the enemy position and check if it should be removed
    update() {
      this.x -= this.speed;
      if (this.x < 0 - this.width) {
        this.markedForDeletion = true; // Mark enemy for deletion when off-screen
        score++; // Increment score for each enemy passed
      }
    }
  }

  // Handle enemy spawning and updating
  function handleEnemies(deltaTime) {
    if (enemyTimer > enemyInterval) {
      enemies.push(new Enemy(canvas.width, canvas.height)); // Spawn a new enemy
      enemyTimer = 0;
      enemyInterval =
        Math.random() * (ENEMY_SPAWN_MAX - ENEMY_SPAWN_MIN) + ENEMY_SPAWN_MIN; // Random interval for next enemy
    } else {
      enemyTimer += deltaTime;
    }

    for (const enemy of enemies) {
      enemy.draw(ctx);
      enemy.update();
    }

    // Remove enemies that are off-screen
    if (enemies.length > 0 && enemies[0].markedForDeletion) {
      enemies = enemies.filter((enemy) => !enemy.markedForDeletion);
    }
  }

  // Restart the game by resetting all states
  function restartGame() {
    player.restart();
    background.restart();
    enemies = [];
    score = 0;
    gameOver = false;
    gameStarted = false;
    countdown = 3;
    countdownTimer = 0;
    animate(0); // Start animation loop
  }

  // Clean up game state and input handlers when exiting
  function cleanup() {
    cancelAnimationFrame(animationFrameId);
    input.cleanup();
  }

  // Initialize game objects
  const input = new InputHandler();
  const player = new Player(canvas.width, canvas.height);
  const background = new Background(canvas.width, canvas.height);

  let lastTime = 0;
  let enemyTimer = 0;
  let enemyInterval = 1000;

  // Display countdown before game starts
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

  // Display game status text (score and game over message)
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

    // Use limitedDelta only for game physics, not for countdown
    const limitedDelta = Math.min(deltaTime, 32);

    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    background.draw(ctx);
    player.draw(ctx);

    if (!gameStarted) {
      // Use actual deltaTime for countdown, not limitedDelta
      if (countdownTimer > 1000) {
        countdown--;
        countdownTimer = 0;
      } else {
        countdownTimer += deltaTime; // Use deltaTime instead of limitedDelta
      }

      if (countdown < 0) {
        gameStarted = true;
      }

      displayCountdown(ctx, canvas);
    }

    if (gameStarted && !gameOver) {
      background.update();
      player.update(input, limitedDelta, enemies); // Use limitedDelta for game physics
      handleEnemies(limitedDelta); // Use limitedDelta for enemy movement
    }

    displayStatusText(ctx, canvas);

    if (!gameOver) {
      animationFrameId = requestAnimationFrame(animate);
    }
  }

  // Clean up when window is closed or hidden
  window.addEventListener("unload", cleanup);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cleanup();
    } else {
      animate(0);
    }
  });

  animate(0);
});
