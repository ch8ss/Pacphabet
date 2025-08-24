const input = document.getElementById("letter-input");
const startScreen = document.getElementById("start-screen");
const gameScreen = document.getElementById("game-screen"); // this is the hidden one

input.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;

  const letter = input.value.trim().toUpperCase();
  if (/^[A-Z]$/.test(letter)) {
    startScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden"); // ✅ show the game screen
    console.log("Starting game with:", letter);
    // TODO: use `letter` to set initial pacman position later
  } else {
    alert("Please enter a single letter A–Z");
    input.value = "";
    input.focus();
  }
});
