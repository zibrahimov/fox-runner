import { displayCountdown, displayStatusText } from "./src/utils.js";

window.addEventListener("load", function () {
  // Get the canvas element and set up its drawing context
  const canvas = document.getElementById("canvas1");
  const ctx = canvas.getContext("2d");
  // Set fixed canvas dimensions
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // Global game state variables
  let enemies = []; // Array to store active enemy objects
  let score = 0; // Player's score
  let gameOver = false; // Flag to track game over state
  let gameStarted = false; // // Flag to track game start state
  let countdownTimer = 0; // Timer for countdown
  let countdown = 3; // Initial countdown value

  // Input Handler class manages keyboard input
  class InputHandler {
    constructor() {
      // Use Set to track currently pressed keys
      this.keys = new Set();

      // Event listener for key presses
      window.addEventListener("keydown", (e) => {
        // Only add arrow keys to Set if not already present
        if (e.key === "ArrowUp") {
          this.keys.add(e.key); // Efficiently add key
        }
        // Restart game if Enter is pressed when game is over
        else if (e.key === "Enter" && gameOver) {
          restartGame();
        }
      });

      // Event listener for key releases
      window.addEventListener("keyup", (e) => {
        // Remove arrow keys from Set when released
        if (e.key === "ArrowUp") {
          this.keys.delete(e.key); // Efficiently remove key
        }
      });
    }
  }

  // Player class handles player character mechanics
  class Player {
    constructor(gameWidth, gameHeight) {
      // Game and player dimensions
      this.gameWidth = gameWidth;
      this.gameHeight = gameHeight;

      this.scale = 5;

      this.spriteWidth = 32;
      this.spriteHeight = 33;

      this.width = this.spriteWidth * this.scale;
      this.height = this.spriteHeight * this.scale;

      // Initial player position (bottom-left of canvas)
      this.x = 100;
      this.y = this.gameHeight - this.height;

      // Sprite sheet and animation properties
      this.image = document.getElementById("playerImage");

      this.frameX = 0; // Current horizontal frame
      this.frameY = 2; // Current vertical frame (animation state)
      this.maxFrame = 7; // Maximum frames in sprite sheet

      // Animation timing
      this.fps = 20;
      this.frameTimer = 0;
      this.frameInterval = 1000 / this.fps;

      // Movement properties
      this.speed = 0;
      this.vy = 0; // Vertical velocity
      this.weight = 1; // Gravity effect
    }

    // Reset player position and state when restarting game
    restart() {
      this.x = 100;
      this.y = this.gameHeight - this.height;
      this.maxFrame = 7;
      this.frameY = 2;
    }

    // Draw player sprite on canvas
    draw(context) {
      context.drawImage(
        this.image,
        this.frameX * this.spriteWidth, // Source X position in sprite sheet
        this.frameY * this.spriteHeight, // Source Y position in sprite sheet
        this.spriteWidth, // Source width
        this.spriteHeight, // Source height
        this.x, // Destination X position
        this.y, // Destination Y position
        this.spriteWidth * this.scale, // Destination width
        this.spriteHeight * this.scale // Destination height
      );
    }

    // Update player state and handle game mechanics
    update(input, deltaTime, enemies) {
      // Collision detection with enemies
      enemies.forEach((enemy) => {
        // Calculate distance between player and enemy centers
        const dx = enemy.x + enemy.width / 2 - (this.x + this.width / 2);
        const dy = enemy.y + enemy.height / 2 - (this.y + this.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);

        // End game if player collides with enemy
        if (distance < enemy.width / 2 + this.width / 2) {
          gameOver = true;
        }
      });

      // Sprite animation handling
      if (this.frameTimer > this.frameInterval) {
        // Cycle through sprite frames
        if (this.frameX >= this.maxFrame) this.frameX = 0;
        else this.frameX++;
        this.frameTimer = 0;
      } else {
        this.frameTimer += deltaTime;
      }

      // Player movement controls
      if (input.keys.has("ArrowUp") && this.onGround()) {
        this.vy -= 32; // Jump when on ground
      } else {
        this.speed = 0; // Stop horizontal movement
      }

      // Horizontal movement
      this.x += this.speed;
      // Prevent player from moving off screen
      if (this.x < 0) this.x = 0;
      else if (this.x > this.gameWidth - this.width)
        this.x = this.gameWidth - this.width;

      // Vertical movement with gravity
      this.y += this.vy;
      if (!this.onGround()) {
        this.vy += this.weight; // Apply gravity
        // Change to the jumping sprite
        this.maxFrame = 5;
        this.frameY = 3;
        this.frameX = 4;
      } else {
        this.vy = 0; // Stop vertical movement when on ground
        this.maxFrame = 7; // Return to running sprite
        this.frameY = 2;
      }

      // Prevent player from falling below ground
      if (this.y > this.gameHeight - this.height) {
        this.y = this.gameHeight - this.height;
      }
    }

    // Check if player is on ground
    onGround() {
      return this.y >= this.gameHeight - this.height;
    }
  }

  // Background class handles infinite scrolling background
  class Background {
    constructor(gameWidth, gameHeight) {
      this.gameWidth = gameWidth;
      this.gameHeight = gameHeight;
      this.image = document.getElementById("backgroundImage");
      this.x = 0;
      this.y = 0;
      this.width = gameWidth; // Match game width exactly
      this.height = gameHeight; // Match game height exactly
      this.speed = 7;
    }

    // Draw background image (two images for seamless scrolling)
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

    // Update background position for scrolling effect
    update() {
      this.x -= this.speed;
      // Reset position when scrolled completely
      if (this.x < 0 - this.width) this.x = 0;
    }

    // Reset background position when restarting game
    restart() {
      this.x = 0;
    }
  }

  // Enemy class manages enemy characters
  class Enemy {
    constructor(gameWidth, gameHeight) {
      this.gameWidth = gameWidth;
      this.gameHeight = gameHeight;
      this.image = document.getElementById("enemyImage");

      // Scale down image
      this.scale = 0.2; // Adjust this value to control size
      this.width = this.image.width * this.scale;
      this.height = this.image.height * this.scale;

      // Start at right side of screen
      this.x = this.gameWidth;
      this.y = this.gameHeight - this.height;

      this.speed = 8;
      this.markedForDeletion = false;
    }

    draw(context) {
      context.drawImage(this.image, this.x, this.y, this.width, this.height);
    }

    update() {
      // Move enemy to the left
      this.x -= this.speed;

      // Mark enemy for deletion when off-screen
      if (this.x < 0 - this.width) {
        this.markedForDeletion = true;
        score++; // Increase score when enemy passes
      }
    }
  }

  // Handles enemy spawning and management
  function handleEnemies(deltaTime) {
    if (enemyTimer > enemyInterval) {
      enemies.push(new Enemy(canvas.width, canvas.height));
      enemyTimer = 0;
      // Randomize next spawn interval
      enemyInterval = Math.random() * 1000 + 500;
    } else {
      enemyTimer += deltaTime;
    }

    enemies.forEach((enemy) => {
      enemy.draw(ctx);
      enemy.update();
    });

    enemies = enemies.filter((enemy) => !enemy.markedForDeletion);
  }

  // Restart the game to initial state
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

  // Game loop timing variables
  let lastTime = 0;
  let enemyTimer = 0;
  let enemyInterval = 1000;

  // Main game animation loop
  function animate(timeStamp) {
    const deltaTime = timeStamp - lastTime;
    lastTime = timeStamp;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background without updating during countdown
    background.draw(ctx);

    // Always draw player during countdown
    player.draw(ctx);

    // Countdown logic before game starts
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

      displayCountdown(ctx, countdown, canvas);
    }

    // Only update game elements when game has started
    if (gameStarted && !gameOver) {
      background.update();
      player.update(input, deltaTime, enemies);
      handleEnemies(deltaTime);
    }

    displayStatusText(ctx, score, gameOver, canvas);

    if (!gameOver) requestAnimationFrame(animate);
  }

  // Start the game
  animate(0);
});
