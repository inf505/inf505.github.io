const { createApp, ref, watch, onMounted, onBeforeUnmount } = Vue;

const app = createApp({
  setup() {
    const isSidebarOpen = ref(false);
    const isRunning = ref(false);

    const gameCanvas = ref(null);
    const canvasWrapper = ref(null);
    let ctx = null;

    const speed = ref(15);
    const cellSize = ref(15);
    const density = ref(15);

    // --- NEW: Ruleset State ---
    const rulePresets = ref([
      { name: "Conway", b: "3", s: "23" },
      { name: "HighLife", b: "36", s: "23" },
      { name: "Day & Night", b: "3678", s: "34678" },
      { name: "Maze", b: "3", s: "12345" },
      { name: "Replicator", b: "1357", s: "1357" },
      { name: "Seeds", b: "2", s: "" },
      { name: "Life Without Death", b: "3", s: "012345678" },
    ]);
    const selectedPreset = ref(rulePresets.value[0]);
    const birthRule = ref("3");
    const survivalRule = ref("23");

    // Auto-update input text when a dropdown preset is chosen
    watch(selectedPreset, (newVal) => {
      if (newVal) {
        birthRule.value = newVal.b;
        survivalRule.value = newVal.s;
      }
    });

    let cols = 0;
    let rows = 0;
    let grid = [];
    let animationId = null;

    const toggleSidebar = () => (isSidebarOpen.value = !isSidebarOpen.value);

    const initGrid = (random = false) => {
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
      cols = Math.floor(width / cellSize.value);
      rows = Math.floor(height / cellSize.value);
      initGrid(true);
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

      // Get the current rules as strings so we can check for digit inclusion
      const bString = birthRule.value || "";
      const sString = survivalRule.value || "";

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const state = grid[i][j];
          const neighbors = countNeighbors(grid, i, j).toString(); // Convert neighbor count to string

          // --- Dynamic Rules Logic ---
          if (state === 0 && bString.includes(neighbors)) {
            nextGrid[i][j] = 1; // Birth condition met
          } else if (state === 1 && sString.includes(neighbors)) {
            nextGrid[i][j] = 1; // Survival condition met
          } else {
            nextGrid[i][j] = 0; // Death
          }
        }
      }
      grid = nextGrid;
      draw();
    };

    const loop = () => {
      if (!isRunning.value) return;
      computeNextGen();
      const delay = 1000 / speed.value;
      setTimeout(() => {
        animationId = requestAnimationFrame(loop);
      }, delay);
    };

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
      resizeCanvas,
      rulePresets,
      selectedPreset,
      birthRule,
      survivalRule, // Exported rules
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
app.component("p-slider", PrimeVue.Slider);
app.component("p-select", PrimeVue.Select); // Replaces v3 Dropdown
app.component("p-inputtext", PrimeVue.InputText);

app.mount("#app");
