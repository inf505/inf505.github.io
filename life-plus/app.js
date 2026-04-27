const { createApp, ref, onMounted, onBeforeUnmount } = Vue;

const app = createApp({
  setup() {
    // UI State
    const isSidebarOpen = ref(false);
    const isRunning = ref(false);

    // Canvas Refs
    const gameCanvas = ref(null);
    const canvasWrapper = ref(null);
    let ctx = null;

    // Simulation Variables (Now Reactive!)
    const speed = ref(15); // Frames per second
    const cellSize = ref(20); // Pixels per cell
    const density = ref(15); // Probability percentage for random spawn

    let cols = 0;
    let rows = 0;
    let grid = [];
    let animationId = null;

    const toggleSidebar = () => {
      isSidebarOpen.value = !isSidebarOpen.value;
    };

    // --- Core Engine Logic ---

    const initGrid = (random = false) => {
      // Calculate the spawn threshold based on the density slider
      const threshold = 1 - density.value / 100;

      grid = new Array(cols)
        .fill(null)
        .map(() =>
          new Array(rows)
            .fill(0)
            .map(() => (random ? (Math.random() > threshold ? 1 : 0) : 0)),
        );
      draw();
    };

    const resizeCanvas = () => {
      if (!gameCanvas.value || !canvasWrapper.value) return;

      const width = canvasWrapper.value.clientWidth;
      const height = canvasWrapper.value.clientHeight;

      gameCanvas.value.width = width;
      gameCanvas.value.height = height;

      // Update dimensions based on the new cellSize slider value
      cols = Math.floor(width / cellSize.value);
      rows = Math.floor(height / cellSize.value);

      initGrid(true); // Restart with new dimensions
    };

    const draw = () => {
      if (!ctx) return;

      ctx.fillStyle = "#f8f9fa";
      ctx.fillRect(0, 0, gameCanvas.value.width, gameCanvas.value.height);

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          if (grid[i][j] === 1) {
            ctx.fillStyle = "#10b981";
            ctx.fillRect(
              i * cellSize.value,
              j * cellSize.value,
              cellSize.value - 1,
              cellSize.value - 1,
            );
          } else {
            ctx.fillStyle = "#e2e8f0";
            ctx.fillRect(
              i * cellSize.value,
              j * cellSize.value,
              cellSize.value - 1,
              cellSize.value - 1,
            );
          }
        }
      }
    };

    const countNeighbors = (grid, x, y) => {
      let sum = 0;
      for (let i = -1; i < 2; i++) {
        for (let j = -1; j < 2; j++) {
          const col = (x + i + cols) % cols;
          const row = (y + j + rows) % rows;
          sum += grid[col][row];
        }
      }
      sum -= grid[x][y];
      return sum;
    };

    const computeNextGen = () => {
      let nextGrid = new Array(cols)
        .fill(null)
        .map(() => new Array(rows).fill(0));

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const state = grid[i][j];
          const neighbors = countNeighbors(grid, i, j);

          if (state === 0 && neighbors === 3) {
            nextGrid[i][j] = 1;
          } else if (state === 1 && (neighbors < 2 || neighbors > 3)) {
            nextGrid[i][j] = 0;
          } else {
            nextGrid[i][j] = state;
          }
        }
      }
      grid = nextGrid;
      draw();
    };

    const loop = () => {
      if (!isRunning.value) return;
      computeNextGen();

      // Calculate delay in milliseconds based on FPS slider
      const delay = 1000 / speed.value;

      setTimeout(() => {
        animationId = requestAnimationFrame(loop);
      }, delay);
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

    const toggleCell = (event) => {
      const rect = gameCanvas.value.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const col = Math.floor(x / cellSize.value);
      const row = Math.floor(y / cellSize.value);

      if (col >= 0 && col < cols && row >= 0 && row < rows) {
        grid[col][row] = grid[col][row] ? 0 : 1;
        draw();
      }
    };

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
      speed,
      cellSize,
      density,
      resizeCanvas, // Exported the new vars!
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
// Registering the new PrimeVue Slider component
app.component("p-slider", PrimeVue.Slider);

app.mount("#app");
