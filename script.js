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

  // Input Handler class manages keyboard input
  class InputHandler {
    constructor() {
      // Array to track currently pressed keys
      this.keys = [];

      // Event listener for key presses
      window.addEventListener("keydown", (e) => {
        // Add arrow keys to keys array if not already present
        if (
          (e.key === "ArrowDown" ||
            e.key === "ArrowUp" ||
            e.key === "ArrowLeft" ||
            e.key === "ArrowRight") &&
          this.keys.indexOf(e.key) === -1
        ) {
          this.keys.push(e.key);
        }
        // Restart game if Enter is pressed when game is over
        else if (e.key === "Enter" && gameOver) {
          restartGame();
        }
      });

      // Event listener for key releases
      window.addEventListener("keyup", (e) => {
        // Remove arrow keys from keys array when released
        if (
          e.key === "ArrowDown" ||
          e.key === "ArrowUp" ||
          e.key === "ArrowLeft" ||
          e.key === "ArrowRight"
        ) {
          this.keys.splice(this.keys.indexOf(e.key), 1);
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
      this.maxFrame = 7; // Maximum frames in sprite sheet
      this.frameY = 2; // Current vertical frame (animation state)

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
      if (input.keys.indexOf("ArrowRight") > -1) {
        this.speed = 5; // Move right
      } else if (input.keys.indexOf("ArrowLeft") > -1) {
        this.speed = -5; // Move left
      } else if (input.keys.indexOf("ArrowUp") > -1 && this.onGround()) {
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
        this.maxFrame = 5; // Change to jumping sprite
        this.frameY = 2;
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
      this.width = gameWidth * 2; // Match game width exactly
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

  // Display score and game over text
  function displayStatusText(context) {
    // Score display with black outline
    context.textAlign = "left";
    context.font = "40px Helvetice";
    context.fillStyle = "black";
    context.fillText("Score: " + score, 20, 50);
    context.fillStyle = "white";
    context.fillText("Score: " + score, 22, 52);

    // Game over text when game ends
    if (gameOver) {
      context.textAlign = "center";
      context.fillStyle = "black";
      context.fillText(
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

  // Restart the game to initial state
  function restartGame() {
    player.restart();
    background.restart();

    enemies = [];
    score = 0;
    gameOver = false;

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
    // Calculate time between frames
    const deltaTime = timeStamp - lastTime;
    lastTime = timeStamp;

    // Clear canvas for redrawing
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update and draw background
    background.draw(ctx);
    background.update();

    // Update and draw player
    player.draw(ctx);
    player.update(input, deltaTime, enemies);

    // Handle enemy spawning and management
    handleEnemies(deltaTime);

    // Display score and game over text
    displayStatusText(ctx);

    // Continue animation if game is not over
    if (!gameOver) requestAnimationFrame(animate);
  }

  // Start the game
  animate(0);
});
