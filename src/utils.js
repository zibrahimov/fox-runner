// utils.js
function displayCountdown(context, countdown, canvas) {
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

function displayStatusText(context, score, gameOver, canvas) {
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

export { displayCountdown, displayStatusText };
