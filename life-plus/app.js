const { createApp, ref, onMounted, onBeforeUnmount } = Vue;

const app = createApp({
  setup() {
    // UI State
    const isSidebarOpen = ref(false);
    const isRunning = ref(false);

    // Canvas & Grid Refs
    const gameCanvas = ref(null);
    const canvasWrapper = ref(null);
    let ctx = null;

    // Simulation Constants & State
    const cellSize = 20;
    let cols = 0;
    let rows = 0;
    let grid = [];
    let animationId = null;

    const toggleSidebar = () => {
      isSidebarOpen.value = !isSidebarOpen.value;
    };

    // --- Core Engine Logic ---

    // Initialize the grid with either 0s (dead) or random 1s (alive)
    const initGrid = (random = false) => {
      grid = new Array(cols)
        .fill(null)
        .map(() =>
          new Array(rows)
            .fill(0)
            .map(() => (random ? (Math.random() > 0.85 ? 1 : 0) : 0)),
        );
      draw();
    };

    // Resize canvas to fill its container and recalculate rows/cols
    const resizeCanvas = () => {
      if (!gameCanvas.value || !canvasWrapper.value) return;

      const width = canvasWrapper.value.clientWidth;
      const height = canvasWrapper.value.clientHeight;

      gameCanvas.value.width = width;
      gameCanvas.value.height = height;

      cols = Math.floor(width / cellSize);
      rows = Math.floor(height / cellSize);

      initGrid(true); // Start with a random pattern
    };

    // Draw the grid state to the canvas
    const draw = () => {
      if (!ctx) return;

      // Clear background
      ctx.fillStyle = "#f8f9fa"; // Sakai Surface
      ctx.fillRect(0, 0, gameCanvas.value.width, gameCanvas.value.height);

      // Draw cells
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          if (grid[i][j] === 1) {
            ctx.fillStyle = "#10b981"; // Sakai/Aura Primary Green
            // Subtracting 1 from size creates a natural grid-line effect
            ctx.fillRect(
              i * cellSize,
              j * cellSize,
              cellSize - 1,
              cellSize - 1,
            );
          } else {
            ctx.fillStyle = "#e2e8f0"; // Dead cell / Grid line color
            ctx.fillRect(
              i * cellSize,
              j * cellSize,
              cellSize - 1,
              cellSize - 1,
            );
          }
        }
      }
    };

    // Count alive neighbors (with wrapping edges)
    const countNeighbors = (grid, x, y) => {
      let sum = 0;
      for (let i = -1; i < 2; i++) {
        for (let j = -1; j < 2; j++) {
          const col = (x + i + cols) % cols;
          const row = (y + j + rows) % rows;
          sum += grid[col][row];
        }
      }
      sum -= grid[x][y]; // Don't count the cell itself
      return sum;
    };

    // Calculate the next generation
    const computeNextGen = () => {
      let nextGrid = new Array(cols)
        .fill(null)
        .map(() => new Array(rows).fill(0));

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const state = grid[i][j];
          const neighbors = countNeighbors(grid, i, j);

          // Rules of Life
          if (state === 0 && neighbors === 3) {
            nextGrid[i][j] = 1; // Birth
          } else if (state === 1 && (neighbors < 2 || neighbors > 3)) {
            nextGrid[i][j] = 0; // Death
          } else {
            nextGrid[i][j] = state; // Survival
          }
        }
      }
      grid = nextGrid;
      draw();
    };

    // Game loop
    const loop = () => {
      if (!isRunning.value) return;
      computeNextGen();
      // setTimeout to control framerate (~10 fps makes it easy to watch)
      setTimeout(() => {
        animationId = requestAnimationFrame(loop);
      }, 100);
    };

    // --- Controls ---
    const togglePlay = () => {
      isRunning.value = !isRunning.value;
      if (isRunning.value) loop();
      else cancelAnimationFrame(animationId);
    };

    const step = () => computeNextGen();

    const randomize = () => initGrid(true);

    const clear = () => {
      isRunning.value = false;
      cancelAnimationFrame(animationId);
      initGrid(false);
    };

    // Allow user to click canvas to toggle individual cells manually
    const toggleCell = (event) => {
      const rect = gameCanvas.value.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const col = Math.floor(x / cellSize);
      const row = Math.floor(y / cellSize);

      if (col >= 0 && col < cols && row >= 0 && row < rows) {
        grid[col][row] = grid[col][row] ? 0 : 1;
        draw();
      }
    };

    // Lifecycle hooks
    onMounted(() => {
      ctx = gameCanvas.value.getContext("2d");
      resizeCanvas();
      window.addEventListener("resize", resizeCanvas);
    });

    onBeforeUnmount(() => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationId);
    });

    return {
      isSidebarOpen,
      toggleSidebar,
      gameCanvas,
      canvasWrapper,
      isRunning,
      togglePlay,
      step,
      clear,
      randomize,
      toggleCell,
    };
  },
});

app.use(PrimeVue.Config, {
  theme: {
    preset: PrimeUIX.Themes.Aura,
    options: { darkModeSelector: ".app-dark" },
  },
});

app.component("p-button", PrimeVue.Button);
app.mount("#app");
