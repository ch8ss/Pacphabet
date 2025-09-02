
  // --- elements ---
  const input = document.getElementById("letter-input");
  const startScreen = document.getElementById("start-screen");
  const gameScreen = document.getElementById("game-screen");
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  // --- colors / layout ---
  const BG_COLOR = "#7e2d86";
  const PIXEL_COLOR = "#f6f032ff";
  const PIXEL_GAP = 1;        // space between drawn squares
  const PAD_CELLS = 2;        // board padding (in scaled cells)

  let pixelGrid = null;       // final scaled boolean grid
  let chosenLetter = null;

  // ---- 1) LETTER MATRICES (bitmap) ----
  // Use '.' = off, '#' = on (you can also use '1'/'0')
  // All rows must be same length.
  const FONT = {
    // 16x16 examples (tweak shapes as you like)
    "A": [
      ".......####.......",
      "......######......",
      ".....###..###.....",
      "....###....###....",
      "...###......###...",
      "...###......###...",
      "..################",
      "..################",
      ".###..........###.",
      ".###..........###.",
      "###............###",
      "###............###",
      "###............###",
      "###............###",
      "###............###",
      "###............###",
    ],
    "B": [
      "##############....",
      "###############...",
      "###........####...",
      "###.........###...",
      "###.........###...",
      "###........####...",
      "##############....",
      "###############...",
      "###........####...",
      "###.........###...",
      "###.........###...",
      "###........####...",
      "###############...",
      "##############....",
      "..................",
      "..................",
    ],
    "C": [
      "......###########.",
      "....##############",
      "...####...........",
      "..###.............",
      ".###..............",
      ".###..............",
      "###...............",
      "###...............",
      "###...............",
      ".###..............",
      ".###..............",
      "..###.............",
      "...####...........",
      "....##############",
      "......###########.",
      "..................",
    ],
    "D": [
      "###########.......",
      "#############.....",
      "###......####.....",
      "###.......###.....",
      "###.......###.....",
      "###.......###.....",
      "###.......###.....",
      "###.......###.....",
      "###.......###.....",
      "###.......###.....",
      "###.......###.....",
      "###......####.....",
      "#############.....",
      "###########.......",
      "..................",
      "..................",
    ],
    "E": [
      "################..",
      "################..",
      "###...............",
      "###...............",
      "###...............",
      "##############....",
      "##############....",
      "###...............",
      "###...............",
      "###...............",
      "################..",
      "################..",
      "..................",
      "..................",
      "..................",
      "..................",
    ],
    "F": [
      "################..",
      "################..",
      "###...............",
      "###...............",
      "###...............",
      "##############....",
      "##############....",
      "###...............",
      "###...............",
      "###...............",
      "###...............",
      "###...............",
      "..................",
      "..................",
      "..................",
      "..................",
    ],
  };

  // If a letter is missing, build a simple block matrix (not pretty, but unblocks you)
  function fallbackBlock(letter) {
    const rows = 16, cols = 16;
    const mat = [];
    for (let r = 0; r < rows; r++) {
      let line = "";
      for (let c = 0; c < cols; c++) {
        // hollow rectangle as a placeholder
        const border = (r === 2 || r === rows-3 || c === 2 || c === cols-3);
        line += border ? "#" : ".";
      }
      mat.push(line);
    }
    return mat;
  }

  // Convert string matrix to boolean grid
  function toBoolGrid(matrix) {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const grid = Array.from({length: rows}, () => Array(cols).fill(false));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const ch = matrix[r][c];
        grid[r][c] = (ch === "#" || ch === "1");
      }
    }
    return grid;
  }

  // ---- 2) SCALE THE MATRIX TO FIT BOARD ----
  // Takes a small boolean matrix and scales it up to fill the canvas (minus padding),
  // using nearest-neighbor. Returns a larger boolean grid.
  function scaleMatrixToBoard(smallGrid) {
    const srcRows = smallGrid.length;
    const srcCols = smallGrid[0].length;

    // compute max cell size to fit within canvas with cell padding
    // we want an integer number of cells across and down
    // Let targetCols = srcCols + 2*PAD_CELLS, same for rows
    const targetCols = srcCols + PAD_CELLS * 2;
    const targetRows = srcRows + PAD_CELLS * 2;

    const cellSize = Math.floor(
      Math.min(canvas.width / targetCols, canvas.height / targetRows)
    );

    // derive final grid dimensions in cells (no partial cells)
    const finalCols = Math.floor(canvas.width / cellSize);
    const finalRows = Math.floor(canvas.height / cellSize);

    // we’ll center the scaled letter inside final grid with padding
    const grid = Array.from({length: finalRows}, () => Array(finalCols).fill(false));

    // available area for the letter (after 2*PAD_CELLS padding)
    const areaCols = finalCols - PAD_CELLS * 2;
    const areaRows = finalRows - PAD_CELLS * 2;

    // scale factors from source -> area
    const sx = areaCols / srcCols;
    const sy = areaRows / srcRows;
    const s = Math.min(sx, sy);

    // resulting occupied size
    const occCols = Math.floor(srcCols * s);
    const occRows = Math.floor(srcRows * s);

    // offsets to center within the padded area
    const startCol = Math.floor((finalCols - occCols) / 2);
    const startRow = Math.floor((finalRows - occRows) / 2);

    // fill grid using nearest neighbor sampling
    for (let r = 0; r < occRows; r++) {
      for (let c = 0; c < occCols; c++) {
        const srcR = Math.min(srcRows - 1, Math.floor(r / s));
        const srcC = Math.min(srcCols - 1, Math.floor(c / s));
        grid[startRow + r][startCol + c] = smallGrid[srcR][srcC];
      }
    }

    return { grid, cellSize };
  }

  // ---- 3) DRAW ----
  function drawGrid(boolGrid, cellSize) {
    // background
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // inner border
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

    // center drawing so cells are centered on canvas
    const totalW = boolGrid[0].length * cellSize;
    const totalH = boolGrid.length * cellSize;
    const offsetX = Math.floor((canvas.width - totalW) / 2);
    const offsetY = Math.floor((canvas.height - totalH) / 2);

    ctx.fillStyle = PIXEL_COLOR;
    for (let r = 0; r < boolGrid.length; r++) {
      for (let c = 0; c < boolGrid[0].length; c++) {
        if (!boolGrid[r][c]) continue;
        const x = offsetX + c * cellSize + PIXEL_GAP;
        const y = offsetY + r * cellSize + PIXEL_GAP;
        const size = cellSize - PIXEL_GAP * 2;
        if (size > 0) ctx.fillRect(x, y, size, size);
      }
    }
  }

  // ---- 4) FLOW ----
  input.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const letter = input.value.trim().toUpperCase();
    if (/^[A-Z]$/.test(letter)) {
      chosenLetter = letter;
      startScreen.classList.add("hidden");
      gameScreen.classList.remove("hidden");
      input.blur();
      initGame(letter);
    } else {
      alert("Please enter a single letter A–Z");
      input.value = "";
      input.focus();
    }
  });

  function initGame(letter) {
    const matrix = FONT[letter] ?? fallbackBlock(letter);
    const smallGrid = toBoolGrid(matrix);
    const scaled = scaleMatrixToBoard(smallGrid);
    pixelGrid = scaled.grid;
    drawGrid(pixelGrid, scaled.cellSize);
  }

