/* ==================== PERFORMANCE OPTIMIZATION ==================== */

// Detect if mobile device
const isMobile =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || window.innerWidth < 768;

// Adjust settings based on device
const PARTICLES_COUNT = isMobile ? 500 : 2000; // 4x less particles on mobile
const CANVAS_SIZE = isMobile ? 256 : 512; // Half resolution on mobile
const SPHERE_DETAIL = isMobile ? 32 : 64; // Lower geometry detail on mobile
const PIXEL_RATIO = isMobile ? 1 : Math.min(window.devicePixelRatio, 2); // Limit pixel ratio
/* ==================== UTILITIES & LOGGING ==================== */
function log(pageId, msg, type = "normal") {
  const prefix = type === "error" ? "❌" : type === "highlight" ? "✨" : "ℹ️";
  console.log(`${prefix} [${pageId}] ${msg}`);
}

/* ==================== TOUCH CONTROLS FOR MOBILE ==================== */
let touchStartX = 0;
let touchEndX = 0;
let touchStartY = 0;
let touchEndY = 0;
let touchStartTime = 0;
let isTouchMove = false;

const minSwipeDistance = 50; // Minimum distance for swipe detection
const tapMaxDuration = 300; // Maximum time for a tap (ms)
const tapMaxMovement = 10; // Maximum movement for a tap (pixels)
const Draw = {
  circle: (ctx, x, y, r, color, text, stroke = null) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, y);
  },
  line: (ctx, x1, y1, x2, y2, color = "#aaa", width = 2) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  },
  arrow: (ctx, x1, y1, x2, y2, color = "#aaa") => {
    const headlen = 10;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const angle = Math.atan2(dy, dx);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(
      x2 - headlen * Math.cos(angle - Math.PI / 6),
      y2 - headlen * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      x2 - headlen * Math.cos(angle + Math.PI / 6),
      y2 - headlen * Math.sin(angle + Math.PI / 6)
    );
    ctx.lineTo(x2, y2);
    ctx.fillStyle = color;
    ctx.fill();
  },
};

/* ==================== 1. BINARY HEAP LOGIC ==================== */
const heapViz = {
  data: [],
  type: "min",
  canvas: document.getElementById("heapCanvas"),
  animating: false,
  nodeAnimations: new Map(),

  init() {
    this.resize();
    window.addEventListener("resize", () => this.resize());
    addLog(
      `Binary ${this.type === "min" ? "Min" : "Max"} Heap initialized`,
      "info"
    ); // LOG ADDED
  },

  resize() {
    const container = document.getElementById("heap-container");
    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;
    this.draw();
  },

  toggleType(t) {
    this.type = t;
    addLog(`Switched to ${t === "min" ? "Min" : "Max"} Heap`, "info"); // LOG ADDED

    if (this.data.length > 0) {
      addLog("Rebuilding heap with new type...", "info"); // LOG ADDED
      const startIdx = Math.floor(this.data.length / 2) - 1;
      for (let i = startIdx; i >= 0; i--) {
        this.heapifyDown(i);
      }
      addLog("Heap rebuilt successfully", "success"); // LOG ADDED
    }
    this.draw();
  },

  async insert() {
    if (this.animating) return;
    this.animating = true;

    const val = parseInt(document.getElementById("heap-value").value);
    if (isNaN(val)) {
      addLog("Please enter a valid number", "error"); // LOG ADDED
      this.animating = false;
      return;
    }

    addLog(`Inserting value ${val}...`, "info"); // LOG ADDED
    const newIndex = this.data.length;
    this.data.push(val);
    addLog(`Added ${val} at index ${newIndex}`, "info"); // LOG ADDED

    // Animate node appearing
    await this.animateNodeAppear(newIndex);

    // Animate bubble up
    if (newIndex > 0) {
      addLog("Bubbling up to maintain heap property...", "info"); // LOG ADDED
      await this.heapifyUpAnimated(this.data.length - 1);
      addLog("Heap property restored", "success"); // LOG ADDED
    } else {
      addLog("First element inserted (root node)", "success"); // LOG ADDED
    }

    document.getElementById("heap-value").value = "";
    this.draw();
    this.animating = false;
  },

  async extract() {
    if (this.animating || this.data.length === 0) {
      if (this.data.length === 0) {
        addLog("Heap is empty, nothing to extract", "error"); // LOG ADDED
      }
      return;
    }
    this.animating = true;

    const root = this.data[0];
    addLog(`Extracting root: ${root}`, "info"); // LOG ADDED

    // Animate root extraction
    await this.animateExtractRoot();

    const last = this.data.pop();

    if (this.data.length > 0) {
      this.data[0] = last;
      addLog(`Moving last element ${last} to root`, "info"); // LOG ADDED

      // Animate moving last to root
      await this.animateMoveToRoot();

      addLog("Bubbling down to restore heap...", "info"); // LOG ADDED
      // Animate bubble down
      await this.heapifyDownAnimated(0);
      addLog("Heap property restored", "success"); // LOG ADDED
    }

    addLog(`Root ${root} extracted successfully`, "success"); // LOG ADDED
    this.draw();
    this.animating = false;
  },

  clear() {
    this.data = [];
    this.draw();
    addLog("Heap cleared", "info"); // LOG ADDED
  },

  heapifyUp(idx) {
    while (idx > 0) {
      let parent = Math.floor((idx - 1) / 2);
      if (this.compare(this.data[idx], this.data[parent])) {
        [this.data[idx], this.data[parent]] = [
          this.data[parent],
          this.data[idx],
        ];
        idx = parent;
      } else break;
    }
  },

  async heapifyUpAnimated(idx) {
    let swapCount = 0;
    while (idx > 0) {
      let parent = Math.floor((idx - 1) / 2);

      // Highlight comparison
      await this.animateComparison(idx, parent);
      addLog(
        `Comparing ${this.data[idx]} (child) with ${this.data[parent]} (parent)`,
        "info"
      ); // LOG ADDED

      if (this.compare(this.data[idx], this.data[parent])) {
        // Animate swap
        await this.animateSwap(idx, parent);
        addLog(`Swapping ${this.data[idx]} ↔ ${this.data[parent]}`, "warning"); // LOG ADDED
        swapCount++;

        [this.data[idx], this.data[parent]] = [
          this.data[parent],
          this.data[idx],
        ];
        idx = parent;
      } else {
        addLog("Heap property satisfied, stopping", "info"); // LOG ADDED
        break;
      }
    }

    if (swapCount === 0) {
      addLog("No swaps needed, already in correct position", "success"); // LOG ADDED
    }
  },

  heapifyDown(idx) {
    while (true) {
      let left = 2 * idx + 1;
      let right = 2 * idx + 2;
      let target = idx;
      if (
        left < this.data.length &&
        this.compare(this.data[left], this.data[target])
      )
        target = left;
      if (
        right < this.data.length &&
        this.compare(this.data[right], this.data[target])
      )
        target = right;
      if (target !== idx) {
        [this.data[idx], this.data[target]] = [
          this.data[target],
          this.data[idx],
        ];
        idx = target;
      } else break;
    }
  },

  async heapifyDownAnimated(idx) {
    let swapCount = 0;
    while (true) {
      let left = 2 * idx + 1;
      let right = 2 * idx + 2;
      let target = idx;

      // Highlight children comparison
      const children = [];
      if (left < this.data.length) children.push(left);
      if (right < this.data.length) children.push(right);

      if (children.length > 0) {
        await this.animateCompareChildren(idx, children);
        addLog(
          `Comparing with children at index ${children.join(", ")}`,
          "info"
        ); // LOG ADDED
      }

      if (
        left < this.data.length &&
        this.compare(this.data[left], this.data[target])
      )
        target = left;
      if (
        right < this.data.length &&
        this.compare(this.data[right], this.data[target])
      )
        target = right;

      if (target !== idx) {
        // Animate swap
        await this.animateSwap(idx, target);
        addLog(`Swapping ${this.data[idx]} ↔ ${this.data[target]}`, "warning"); // LOG ADDED
        swapCount++;

        [this.data[idx], this.data[target]] = [
          this.data[target],
          this.data[idx],
        ];
        idx = target;
      } else {
        addLog("Heap property satisfied, stopping", "info"); // LOG ADDED
        break;
      }
    }

    if (swapCount === 0) {
      addLog("No swaps needed, heap property maintained", "success"); // LOG ADDED
    }
  },

  async animateNodeAppear(index) {
    return new Promise((resolve) => {
      let scale = 0;
      anime({
        targets: { scale: 0 },
        scale: 1,
        duration: 600,
        easing: "easeOutElastic(1, .8)",
        update: (anim) => {
          scale = anim.animations[0].currentValue;
          this.nodeAnimations.set(index, { scale, color: "#00b894" });
          this.draw();
        },
        complete: () => {
          this.nodeAnimations.delete(index);
          resolve();
        },
      });
    });
  },

  async animateComparison(idx1, idx2) {
    return new Promise((resolve) => {
      anime({
        targets: { progress: 0 },
        progress: 1,
        duration: 500,
        easing: "easeInOutQuad",
        update: () => {
          this.nodeAnimations.set(idx1, { highlight: true, color: "#fdcb6e" });
          this.nodeAnimations.set(idx2, { highlight: true, color: "#fdcb6e" });
          this.draw();
        },
        complete: () => {
          this.nodeAnimations.delete(idx1);
          this.nodeAnimations.delete(idx2);
          resolve();
        },
      });
    });
  },

  async animateSwap(idx1, idx2) {
    return new Promise((resolve) => {
      let progress = 0;
      anime({
        targets: { value: 0 },
        value: 1,
        duration: 800,
        easing: "easeInOutQuad",
        update: (anim) => {
          progress = anim.progress / 100;
          this.nodeAnimations.set(idx1, {
            swap: progress,
            swapWith: idx2,
            color: "#e17055",
          });
          this.nodeAnimations.set(idx2, {
            swap: progress,
            swapWith: idx1,
            color: "#e17055",
          });
          this.draw();
        },
        complete: () => {
          this.nodeAnimations.delete(idx1);
          this.nodeAnimations.delete(idx2);
          resolve();
        },
      });
    });
  },

  async animateCompareChildren(parent, children) {
    return new Promise((resolve) => {
      anime({
        targets: { progress: 0 },
        progress: 1,
        duration: 400,
        easing: "easeInOutQuad",
        update: () => {
          this.nodeAnimations.set(parent, {
            highlight: true,
            color: "#74b9ff",
          });
          children.forEach((child) => {
            this.nodeAnimations.set(child, {
              highlight: true,
              color: "#fdcb6e",
            });
          });
          this.draw();
        },
        complete: () => {
          this.nodeAnimations.delete(parent);
          children.forEach((child) => this.nodeAnimations.delete(child));
          resolve();
        },
      });
    });
  },

  async animateExtractRoot() {
    return new Promise((resolve) => {
      anime({
        targets: { scale: 1 },
        scale: 0,
        duration: 600,
        easing: "easeInBack",
        update: (anim) => {
          const scale = anim.animations[0].currentValue;
          this.nodeAnimations.set(0, { scale, color: "#d63031" });
          this.draw();
        },
        complete: () => {
          this.nodeAnimations.delete(0);
          resolve();
        },
      });
    });
  },

  async animateMoveToRoot() {
    return new Promise((resolve) => {
      anime({
        targets: { progress: 0 },
        progress: 1,
        duration: 600,
        easing: "easeInOutQuad",
        update: () => {
          this.nodeAnimations.set(0, { pulse: true, color: "#6c5ce7" });
          this.draw();
        },
        complete: () => {
          this.nodeAnimations.delete(0);
          resolve();
        },
      });
    });
  },

  compare(a, b) {
    return this.type === "min" ? a < b : a > b;
  },

  drawArray() {
    const arrayDisplay = document.getElementById("array-display");

    if (this.data.length === 0) {
      arrayDisplay.innerHTML = '<div class="empty-state">Array is empty</div>';
      return;
    }

    arrayDisplay.innerHTML = this.data
      .map(
        (val, idx) => `
    <div class="array-item">
      <span class="array-index">${idx}</span>
      ${val}
    </div>
  `
      )
      .join("");
  },

  draw() {
    const ctx = this.canvas.getContext("2d");
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.data.length === 0) return;

    const levels = Math.floor(Math.log2(this.data.length)) + 1;
    const startY = 50;
    const levelHeight = 80;

    this.data.forEach((val, i) => {
      const level = Math.floor(Math.log2(i + 1));
      const posInLevel = i + 1 - Math.pow(2, level);
      const maxInLevel = Math.pow(2, level);

      const slice = this.canvas.width / (maxInLevel + 1);
      const x = slice * (posInLevel + 1);
      const y = startY + level * levelHeight;

      if (i > 0) {
        const parentIdx = Math.floor((i - 1) / 2);
        const pLevel = Math.floor(Math.log2(parentIdx + 1));
        const pPos = parentIdx + 1 - Math.pow(2, pLevel);
        const pMax = Math.pow(2, pLevel);
        const pSlice = this.canvas.width / (pMax + 1);
        const px = pSlice * (pPos + 1);
        const py = startY + pLevel * levelHeight;
        Draw.line(ctx, px, py, x, y);
      }
      this.drawArray();
    });

    this.data.forEach((val, i) => {
      const level = Math.floor(Math.log2(i + 1));
      const posInLevel = i + 1 - Math.pow(2, level);
      const maxInLevel = Math.pow(2, level);
      const slice = this.canvas.width / (maxInLevel + 1);
      let x = slice * (posInLevel + 1);
      let y = startY + level * levelHeight;

      // Apply animations
      let color = "#a29bfe";
      let radius = 20;

      if (this.nodeAnimations.has(i)) {
        const anim = this.nodeAnimations.get(i);

        if (anim.scale !== undefined) {
          radius = 20 * anim.scale;
        }

        if (anim.color) {
          color = anim.color;
        }

        if (anim.highlight) {
          radius = 25;
        }

        if (anim.swap !== undefined && anim.swapWith !== undefined) {
          const swapIdx = anim.swapWith;
          const swapLevel = Math.floor(Math.log2(swapIdx + 1));
          const swapPos = swapIdx + 1 - Math.pow(2, swapLevel);
          const swapMax = Math.pow(2, swapLevel);
          const swapSlice = this.canvas.width / (swapMax + 1);
          const targetX = swapSlice * (swapPos + 1);
          const targetY = startY + swapLevel * levelHeight;

          x = x + (targetX - x) * anim.swap;
          y = y + (targetY - y) * anim.swap;
        }
      }

      Draw.circle(ctx, x, y, radius, color, val);
    });
  },
};

/* ==================== 2. AVL/BST LOGIC ==================== */
const avlViz = {
  root: null,
  canvas: document.getElementById("avlCanvas"),
  animating: false,
  logs: [],
  maxLogs: 15,
  nodePositions: new Map(),

  max(a, b) {
    return a > b ? a : b;
  },

  getHeight(node) {
    return node ? node.height : 0;
  },

  updateHeight(node) {
    if (node) {
      node.height =
        1 + this.max(this.getHeight(node.left), this.getHeight(node.right));
    }
  },

  getBalance(node) {
    return node ? this.getHeight(node.left) - this.getHeight(node.right) : 0;
  },

  rotateRight(y) {
    let x = y.left;
    let T2 = x.right;
    x.right = y;
    y.left = T2;
    this.updateHeight(y);
    this.updateHeight(x);
    return x;
  },

  rotateLeft(x) {
    let y = x.right;
    let T2 = y.left;
    y.left = x;
    x.right = T2;
    this.updateHeight(x);
    this.updateHeight(y);
    return y;
  },

  init() {
    this.resize();
    window.addEventListener("resize", () => this.resize());
    addLog("AVL Tree initialized", "info");
  },

  resize() {
    const container = document.getElementById("avl-container");
    if (container && this.canvas) {
      this.canvas.width = container.clientWidth;
      this.canvas.height = container.clientHeight;
      this.draw();
    }
  },

  async insert() {
    if (this.animating) return;
    const input = document.getElementById("avl-value");
    const val = parseInt(input.value);
    if (isNaN(val)) {
      addLog("Please enter a valid number", "error");
      return;
    }
    this.animating = true;
    addLog(`Inserting value ${val}...`, "info");
    this.root = await this.insertNode(this.root, val);
    input.value = "";
    this.draw();
    addLog(`Value ${val} inserted successfully`, "success");
    this.animating = false;
  },

  async animateNodeAppear(node, val) {
    node.scale = 0;
    addLog(`Creating new node with value ${val}`, "info");
    return new Promise((resolve) => {
      anime({
        targets: node,
        scale: 1,
        duration: 800,
        easing: "easeOutElastic(1, .6)",
        update: () => this.draw(),
        complete: () => {
          addLog(`Node ${val} created`, "success");
          resolve();
        },
      });
    });
  },

  async animateRotation(node, direction) {
    addLog(`Performing ${direction} rotation on node ${node.val}`, "warning");
    return new Promise((resolve) => {
      let rotationCount = 0;
      anime({
        targets: { rotation: 0 },
        rotation: 360,
        duration: 1200,
        easing: "easeInOutQuad",
        update: () => {
          this.draw();
        },
        complete: () => {
          addLog(`${direction} rotation completed`, "success");
          setTimeout(resolve, 200);
        },
      });
    });
  },

  delete() {
    const input = document.getElementById("avl-value");
    const val = parseInt(input.value);
    if (isNaN(val)) {
      addLog("Please enter a valid number", "error");
      return;
    }
    addLog(`Deleting value ${val}...`, "info");
    const prevRoot = this.root;
    this.root = this.deleteNode(this.root, val);
    if (this.root === prevRoot && this.root !== null) {
      addLog(`Value ${val} not found in tree`, "warning");
    } else {
      addLog(`Value ${val} deleted successfully`, "success");
    }
    input.value = "";
    this.draw();
  },

  clear() {
    this.root = null;
    this.draw();
    addLog("AVL Tree cleared", "info");
  },

  async insertNode(node, val) {
    if (!node) {
      const newNode = {
        val: val,
        height: 1,
        left: null,
        right: null,
        scale: 0,
      };
      await this.animateNodeAppear(newNode, val);
      return newNode;
    }

    if (val < node.val) {
      addLog(`${val} < ${node.val}, going left`, "info");
      node.left = await this.insertNode(node.left, val);
    } else if (val > node.val) {
      addLog(`${val} > ${node.val}, going right`, "info");
      node.right = await this.insertNode(node.right, val);
    } else {
      addLog(`Value ${val} already exists, skipping`, "warning");
      return node;
    }
    this.updateHeight(node);
    let balance = this.getBalance(node);

    addLog(
      `Node ${node.val}: height=${node.height}, balance=${balance}`,
      "info"
    );

    if (balance > 1 && val < node.left.val) {
      addLog(`Left-Left case detected at node ${node.val}`, "warning");
      await this.animateRotation(node, "Right");
      return this.rotateRight(node);
    }

    if (balance < -1 && val > node.right.val) {
      addLog(`Right-Right case detected at node ${node.val}`, "warning");
      await this.animateRotation(node, "Left");
      return this.rotateLeft(node);
    }

    if (balance > 1 && val > node.left.val) {
      addLog(`Left-Right case detected at node ${node.val}`, "warning");
      await this.animateRotation(node.left, "Left");
      node.left = this.rotateLeft(node.left);
      await this.animateRotation(node, "Right");
      return this.rotateRight(node);
    }

    if (balance < -1 && val < node.right.val) {
      addLog(`Right-Left case detected at node ${node.val}`, "warning");
      await this.animateRotation(node.right, "Right");
      node.right = this.rotateRight(node.right);
      await this.animateRotation(node, "Left");
      return this.rotateLeft(node);
    }

    if (Math.abs(balance) <= 1) {
      addLog(`Node ${node.val} is balanced`, "success");
    }

    return node;
  },

  deleteNode(root, key) {
    if (root === null) return null;

    if (key < root.val) {
      root.left = this.deleteNode(root.left, key);
    } else if (key > root.val) {
      root.right = this.deleteNode(root.right, key);
    } else {
      if (root.left === null || root.right === null) {
        let temp = root.left ? root.left : root.right;
        root = temp;
      } else {
        let temp = this.minValueNode(root.right);
        root.val = temp.val;
        root.right = this.deleteNode(root.right, temp.val);
      }
    }

    if (root === null) return root;

    this.updateHeight(root);
    let balance = this.getBalance(root);

    if (balance > 1 && this.getBalance(root.left) >= 0)
      return this.rotateRight(root);

    if (balance > 1 && this.getBalance(root.left) < 0) {
      root.left = this.rotateLeft(root.left);
      return this.rotateRight(root);
    }

    if (balance < -1 && this.getBalance(root.right) <= 0)
      return this.rotateLeft(root);

    if (balance < -1 && this.getBalance(root.right) > 0) {
      root.right = this.rotateRight(root.right);
      return this.rotateLeft(root);
    }

    return root;
  },

  minValueNode(node) {
    let current = node;
    while (current.left !== null) current = current.left;
    return current;
  },

  draw() {
    const ctx = this.canvas.getContext("2d");
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (!this.root) return;
    this.drawNode(
      ctx,
      this.root,
      this.canvas.width / 2,
      50,
      this.canvas.width / 4
    );
  },

  drawNode(ctx, node, x, y, offset) {
    // Draw lines to children first (so they appear behind nodes)
    if (node.left) {
      Draw.line(ctx, x, y, x - offset, y + 60);
      this.drawNode(ctx, node.left, x - offset, y + 60, offset / 2);
    }
    if (node.right) {
      Draw.line(ctx, x, y, x + offset, y + 60);
      this.drawNode(ctx, node.right, x + offset, y + 60, offset / 2);
    }

    // Draw the main node circle
    const radius = 20 * (node.scale || 1);
    Draw.circle(ctx, x, y, radius, "#74b9ff", node.val);

    // Calculate balance factor and height
    const balance = this.getBalance(node);
    const height = this.getHeight(node);

    // Draw info box below node
    const boxY = y + 28;
    const boxWidth = 50;
    const boxHeight = 16;

    // Background box with slight transparency
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(x - boxWidth / 2, boxY, boxWidth, boxHeight);

    // Border for the box
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x - boxWidth / 2, boxY, boxWidth, boxHeight);

    // Text styling
    ctx.font = "bold 11px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Height (left side) - Green color
    ctx.fillStyle = "#00b894";
    ctx.fillText(`h:${height}`, x - 12, boxY + boxHeight / 2);

    // Balance factor (right side) - Color based on balance
    // Green if balanced (|balance| <= 1), Red if unbalanced
    const balanceColor = Math.abs(balance) <= 1 ? "#00b894" : "#ff6b6b";
    ctx.fillStyle = balanceColor;
    ctx.fillText(`b:${balance}`, x + 12, boxY + boxHeight / 2);
  },
};
/* ==================== 3. GRAPH LOGIC ==================== */
const graphViz = {
  nodes: [],
  edges: [],
  isDirected: false,
  canvas: document.getElementById("graphCanvas"),
  animating: false, // ADD THIS
  nodeAnimations: new Map(), // ADD THIS
  edgeAnimations: new Map(), // ADD THIS
  init() {
    this.resize();
    this.initGraph();
    window.addEventListener("resize", () => this.resize());
  },
  resize() {
    const container = document.getElementById("graph-container");
    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;
    this.draw();
  },
  initGraph() {
    const count =
      parseInt(document.getElementById("graph-nodes-count").value) || 5;
    this.isDirected = document.getElementById("graph-directed").checked;
    this.nodes = [];
    this.edges = [];
    this.layoutNodes(count);
    this.draw();
    addLog(`Graph reset with ${count} nodes (${this.isDirected ? "directed" : "undirected"})`, "info");
  },
  layoutNodes(count) {
    // Arrange in a circle
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 50;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
      // Check if node exists to preserve edges if we are just adding
      if (!this.nodes.find((n) => n.id === i)) {
        this.nodes.push({
          id: i,
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
          color: "#55efc4",
        });
      }
    }
    // If we have more nodes than count, remove extras (for reset)
    if (this.nodes.length > count) {
      this.nodes = this.nodes.slice(0, count);
      this.edges = this.edges.filter((e) => e.from < count && e.to < count);
    }
    // Re-calculate positions for ALL current nodes
    for (let i = 0; i < this.nodes.length; i++) {
      const angle = (i / this.nodes.length) * Math.PI * 2 - Math.PI / 2;
      this.nodes[i].x = centerX + radius * Math.cos(angle);
      this.nodes[i].y = centerY + radius * Math.sin(angle);
    }
  },
  async addVertex() {
    if (this.animating) return;
    this.animating = true;

    let nextId = 0;
    while (this.nodes.find((n) => n.id === nextId)) nextId++;

    addLog(`Adding vertex ${nextId}...`, "info");
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    this.nodes.push({
      id: nextId,
      x: centerX,
      y: centerY,
      color: "#55efc4",
      scale: 0,
    });

    await this.animateNodeAppear(nextId);
    await this.animateLayoutTransition();
    addLog(`Vertex ${nextId} added successfully`, "success");
    this.animating = false;
  },
  async removeVertex() {
    if (this.animating) return;
    this.animating = true;

    const id = parseInt(document.getElementById("vertex-to-remove").value);
    if (isNaN(id)) {
      addLog("Please enter a valid node ID", "error");
      this.animating = false;
      return;
    }

    const idx = this.nodes.findIndex((n) => n.id === id);
    if (idx === -1) {
      addLog(`Node ${id} not found`, "error");
      this.animating = false;
      return;
    }

    addLog(`Removing vertex ${id}...`, "info");
    await this.animateEdgesDisappear(id);
    await this.animateNodeDisappear(id);

    this.nodes.splice(idx, 1);
    this.edges = this.edges.filter((e) => e.from !== id && e.to !== id);

    await this.animateLayoutTransition();

    document.getElementById("vertex-to-remove").value = "";
    addLog(`Vertex ${id} removed`, "success");
    this.animating = false;
  },
  async addEdge() {
    if (this.animating) return;
    this.animating = true;

    const from = parseInt(document.getElementById("edge-from").value);
    const to = parseInt(document.getElementById("edge-to").value);
    const weight = parseInt(document.getElementById("edge-weight").value) || 1;

    if (
      !this.nodes.find((n) => n.id === from) ||
      !this.nodes.find((n) => n.id === to)
    ) {
      addLog(`Invalid nodes: ${from} or ${to} not found`, "error");
      this.animating = false;
      return;
    }

    addLog(`Adding edge ${from} → ${to} (weight: ${weight})`, "info");
    this.edges = this.edges.filter((e) => !(e.from === from && e.to === to));
    this.edges.push({ from, to, weight, opacity: 0 });
    if (!this.isDirected) {
      this.edges = this.edges.filter((e) => !(e.from === to && e.to === from));
      this.edges.push({ from: to, to: from, weight, opacity: 0 });
    }

    await this.animateEdgeAppear(from, to);
    addLog(`Edge ${from} ↔ ${to} added`, "success");
    this.animating = false;
  },
  async removeEdge() {
    if (this.animating) return;
    this.animating = true;

    const from = parseInt(document.getElementById("edge-from").value);
    const to = parseInt(document.getElementById("edge-to").value);

    addLog(`Removing edge ${from} → ${to}...`, "info");
    await this.animateEdgeDisappear(from, to);

    this.edges = this.edges.filter((e) => !(e.from === from && e.to === to));
    if (!this.isDirected) {
      this.edges = this.edges.filter((e) => !(e.from === to && e.to === from));
    }

    this.draw();
    addLog(`Edge ${from} ↔ ${to} removed`, "success");
    this.animating = false;
  },
  async animateNodeDisappear(nodeId) {
    const node = this.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    return new Promise((resolve) => {
      anime({
        targets: node,
        scale: [1, 1.5, 0],
        duration: 800,
        easing: "easeInBack",
        update: () => {
          node.color = "#d63031"; // Red flash before disappearing
          this.draw();
        },
        complete: resolve,
      });
    });
  },

  async animateEdgeDisappear(from, to) {
    const edgesToRemove = this.edges.filter(
      (e) =>
        (e.from === from && e.to === to) ||
        (!this.isDirected && e.from === to && e.to === from)
    );

    if (edgesToRemove.length === 0) return;

    return new Promise((resolve) => {
      anime({
        targets: { opacity: 1 },
        opacity: 0,
        duration: 600,
        easing: "easeInQuad",
        update: (anim) => {
          const opacity = 1 - anim.progress / 100;
          edgesToRemove.forEach((edge) => {
            const edgeKey = `${edge.from}-${edge.to}`;
            this.edgeAnimations.set(edgeKey, {
              opacity,
              color: "#d63031", // Red color for removing
              width: 3,
            });
          });
          this.draw();
        },
        complete: () => {
          edgesToRemove.forEach((edge) => {
            const edgeKey = `${edge.from}-${edge.to}`;
            this.edgeAnimations.delete(edgeKey);
          });
          resolve();
        },
      });
    });
  },

  async animateEdgesDisappear(nodeId) {
    const connectedEdges = this.edges.filter(
      (e) => e.from === nodeId || e.to === nodeId
    );

    if (connectedEdges.length === 0) return;

    return new Promise((resolve) => {
      anime({
        targets: { opacity: 1 },
        opacity: 0,
        duration: 500,
        easing: "easeInQuad",
        update: (anim) => {
          const opacity = 1 - anim.progress / 100;
          connectedEdges.forEach((edge) => {
            const edgeKey = `${edge.from}-${edge.to}`;
            this.edgeAnimations.set(edgeKey, {
              opacity,
              color: "#d63031",
              width: 3,
            });
          });
          this.draw();
        },
        complete: () => {
          connectedEdges.forEach((edge) => {
            const edgeKey = `${edge.from}-${edge.to}`;
            this.edgeAnimations.delete(edgeKey);
          });
          resolve();
        },
      });
    });
  },
  displayDataStructure(type, data) {
    const ctx = this.canvas.getContext("2d");

    // Draw background box
    const boxX = 10;
    const boxY = 10;
    const boxWidth = 200;
    const boxHeight = 60;

    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

    // Title
    ctx.fillStyle = "#00b894";
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "left";
    ctx.fillText(
      type === "queue" ? "Queue (BFS)" : "Stack (DFS)",
      boxX + 10,
      boxY + 25
    );

    // Data
    ctx.fillStyle = "#fff";
    ctx.font = "14px Arial";
    const dataStr = data.length > 0 ? data.join(" → ") : "Empty";
    ctx.fillText(dataStr, boxX + 10, boxY + 45);
  },
  async animateNodeAppear(nodeId) {
    const node = this.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    return new Promise((resolve) => {
      anime({
        targets: node,
        scale: [0, 1.3, 1],
        duration: 800,
        easing: "easeOutElastic(1, .8)",
        update: () => this.draw(),
        complete: resolve,
      });
    });
  },

  async animateLayoutTransition() {
    const count = this.nodes.length;
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 50;

    const targets = [];
    for (let i = 0; i < this.nodes.length; i++) {
      const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
      targets.push({
        node: this.nodes[i],
        targetX: centerX + radius * Math.cos(angle),
        targetY: centerY + radius * Math.sin(angle),
      });
    }

    return new Promise((resolve) => {
      anime({
        targets: targets.map((t) => t.node),
        x: (el, i) => targets[i].targetX,
        y: (el, i) => targets[i].targetY,
        duration: 1000,
        easing: "easeInOutQuad",
        update: () => this.draw(),
        complete: resolve,
      });
    });
  },

  async animateEdgeAppear(from, to) {
    const edgeKey = `${from}-${to}`;
    return new Promise((resolve) => {
      anime({
        targets: { opacity: 0 },
        opacity: 1,
        duration: 600,
        easing: "easeInOutQuad",
        update: (anim) => {
          const progress = anim.progress / 100;
          this.edges.forEach((e) => {
            if (e.from === from && e.to === to) {
              e.opacity = progress;
            }
          });
          this.draw();
        },
        complete: () => {
          this.edges.forEach((e) => {
            if (e.from === from && e.to === to) {
              delete e.opacity;
            }
          });
          resolve();
        },
      });
    });
  },

  async animateNodeExplore(nodeId, color) {
    const node = this.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    return new Promise((resolve) => {
      const originalScale = node.scale || 1;
      anime({
        targets: node,
        scale: [originalScale, 1.5, 1],
        duration: 600,
        easing: "easeInOutQuad",
        update: () => {
          node.color = color;
          this.draw();
        },
        complete: resolve,
      });
    });
  },

  async animateEdgeTraversal(from, to) {
    return new Promise((resolve) => {
      let progress = 0;
      const edgeKey = `${from}-${to}`;

      anime({
        targets: { value: 0 },
        value: 1,
        duration: 500,
        easing: "easeInOutQuad",
        update: (anim) => {
          progress = anim.progress / 100;
          this.edgeAnimations.set(edgeKey, {
            progress,
            color: "#e17055",
            width: 4,
          });
          this.draw();
        },
        complete: () => {
          this.edgeAnimations.delete(edgeKey);
          resolve();
        },
      });
    });
  },
  displayTraversalOrder(algorithm, order) {
    const ctx = this.canvas.getContext("2d");

    // Draw result box at bottom
    const boxX = 10;
    const boxY = this.canvas.height - 80;
    const boxWidth = this.canvas.width - 20;
    const boxHeight = 70;

    ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
    ctx.strokeStyle = "#00b894";
    ctx.lineWidth = 3;
    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

    // Title
    ctx.fillStyle = "#00b894";
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`${algorithm} Traversal Order:`, boxX + 15, boxY + 25);

    // Traversal order
    ctx.fillStyle = "#fff";
    ctx.font = "bold 16px Arial";
    const orderStr = order.join(" → ");
    ctx.fillText(orderStr, boxX + 15, boxY + 50);
  },
  async runBFS() {
    if (this.animating) return;
    this.animating = true;

    const start = parseInt(document.getElementById("algo-start").value);
    if (!this.nodes.find((n) => n.id === start)) {
      addLog(`Start node ${start} not found`, "error");
      this.animating = false;
      return;
    }

    addLog(`BFS starting from node ${start}`, "info");
    let queue = [start];
    let visited = new Set();
    let traversalOrder = [];
    visited.add(start);

    this.resetColors();

    while (queue.length > 0) {
      this.draw();
      this.displayDataStructure("queue", queue);
      await new Promise((r) => setTimeout(r, 800));

      const current = queue.shift();
      traversalOrder.push(current);
      addLog(`Visiting node ${current} | Queue: [${queue.join(", ")}]`, "info");
      const nodeObj = this.nodes.find((n) => n.id === current);

      await this.animateNodeExplore(current, "#ff7675");
      if (nodeObj) nodeObj.color = "#ffeaa7";

      for (const e of this.edges) {
        if (e.from === current && !visited.has(e.to)) {
          visited.add(e.to);
          queue.push(e.to);
          addLog(`  Enqueuing neighbor ${e.to}`, "info");

          await this.animateEdgeTraversal(e.from, e.to);

          const neighbor = this.nodes.find((n) => n.id === e.to);
          if (neighbor) neighbor.color = "#a29bfe";

          this.draw();
          this.displayDataStructure("queue", queue);
          await new Promise((r) => setTimeout(r, 400));
        }
      }
    }

    this.draw();
    this.displayTraversalOrder("BFS", traversalOrder);
    addLog(`BFS complete! Order: ${traversalOrder.join(" → ")}`, "success");
    this.animating = false;
  },
  async runDFS() {
    if (this.animating) return;
    this.animating = true;

    const start = parseInt(document.getElementById("algo-start").value);
    if (!this.nodes.find((n) => n.id === start)) {
      addLog(`Start node ${start} not found`, "error");
      this.animating = false;
      return;
    }

    addLog(`DFS starting from node ${start}`, "info");
    let stack = [start];
    let visited = new Set();
    let traversalOrder = [];

    this.resetColors();

    while (stack.length > 0) {
      this.draw();
      this.displayDataStructure("stack", stack);
      await new Promise((r) => setTimeout(r, 800));

      const current = stack.pop();

      if (!visited.has(current)) {
        visited.add(current);
        traversalOrder.push(current);
        addLog(`Visiting node ${current} | Stack: [${stack.join(", ")}]`, "info");

        await this.animateNodeExplore(current, "#ff7675");

        const nodeObj = this.nodes.find((n) => n.id === current);
        if (nodeObj) nodeObj.color = "#ffeaa7";

        const neighbors = [];
        for (const e of this.edges) {
          if (e.from === current && !visited.has(e.to)) {
            neighbors.push(e.to);
            addLog(`  Pushing neighbor ${e.to} to stack`, "info");
            await this.animateEdgeTraversal(e.from, e.to);
          }
        }

        neighbors.reverse().forEach((n) => stack.push(n));

        if (neighbors.length > 0) {
          this.draw();
          this.displayDataStructure("stack", stack);
          await new Promise((r) => setTimeout(r, 400));
        }
      }
    }

    this.draw();
    this.displayTraversalOrder("DFS", traversalOrder);
    addLog(`DFS complete! Order: ${traversalOrder.join(" → ")}`, "success");
    this.animating = false;
  },
  highlightShortestPathTree(previous, distances) {
    // <--- NOW ACCEPTS distances
    let sptEdges = [];

    // 1. Convert the 'previous' map (the SPT structure) into a list of edges
    previous.forEach((fromId, toId) => {
      if (fromId !== null) {
        // Find the original edge in the visualization data
        const edge = this.edges.find(
          (e) =>
            (e.from === fromId && e.to === toId) ||
            (!this.isDirected && e.from === toId && e.to === fromId)
        );

        if (edge) {
          // Store the edge: Use the final calculated shortest distance (distance[toId])
          // as the weight for display purposes.
          const finalWeight = distances.get(toId);
          sptEdges.push({
            from: fromId,
            to: toId,
            weight: finalWeight, // <--- Key change: uses final path cost
            isSPT: true,
          });
        }
      }
    });

    // 2. Clear all previous node colors and set to the final path color
    this.nodes.forEach((n) => (n.color = "#00b894")); // Final SPT color

    // 3. Draw the graph, highlighting ONLY the SPT edges
    this.draw(sptEdges);
  },

  async runDijkstra() {
    this.resetColors();
    const startId = parseInt(document.getElementById("algo-start").value);
    const startNode = this.nodes.find((n) => n.id === startId);
    if (!startNode) {
      addLog(`Start node ${startId} not found`, "error");
      return;
    }

    addLog(`Dijkstra starting from node ${startId}`, "info");
    let distances = new Map();
    let previous = new Map();
    let priorityQueue = [];

    this.nodes.forEach((node) => {
      distances.set(node.id, Infinity);
      previous.set(node.id, null);
    });

    distances.set(startId, 0);
    priorityQueue.push({ id: startId, dist: 0 });
    addLog(`Initial distances set. Start node ${startId} = 0`, "info");

    startNode.color = "#00b894";
    this.draw();

    while (priorityQueue.length > 0) {
      priorityQueue.sort((a, b) => a.dist - b.dist);
      let { id: uId, dist: uDist } = priorityQueue.shift();

      if (uDist > distances.get(uId)) continue;

      addLog(`Processing node ${uId} (dist: ${uDist})`, "info");
      const uNode = this.nodes.find((n) => n.id === uId);
      uNode.color = "#ff7675";
      this.draw();
      await new Promise((r) => setTimeout(r, 600));
      uNode.color = "#ffeaa7";

      const neighbors = this.edges.filter((e) => e.from === uId);

      for (const edge of neighbors) {
        const vId = edge.to;
        const weight = edge.weight;
        const vNode = this.nodes.find((n) => n.id === vId);
        const alt = uDist + weight;

        if (alt < distances.get(vId)) {
          distances.set(vId, alt);
          previous.set(vId, uId);
          priorityQueue.push({ id: vId, dist: alt });
          addLog(`  Updated node ${vId}: dist ${distances.get(vId)} → ${alt}`, "info");

          if (vNode) vNode.color = "#a29bfe";
          this.draw();
          await new Promise((r) => setTimeout(r, 300));
        }
      }
      this.draw();
    }

    this.highlightShortestPathTree(previous, distances);
    const result = [...distances.entries()].map(([id, d]) => `${id}:${d === Infinity ? '∞' : d}`).join(", ");
    addLog(`Dijkstra complete! Distances: ${result}`, "success");
  },
  async runPrim() {
    if (this.nodes.length === 0) {
      addLog("No nodes in graph", "error");
      return;
    }
    this.resetColors();

    let startNode = this.nodes[0].id;
    let visited = new Set([startNode]);
    let mstEdges = [];

    addLog(`Prim's MST starting from node ${startNode}`, "info");
    this.nodes.find((n) => n.id === startNode).color = "#ffeaa7";
    this.draw();

    while (visited.size < this.nodes.length) {
      await new Promise((r) => setTimeout(r, 600));
      let minEdge = null;
      let minWeight = Infinity;

      for (const edge of this.edges) {
        if (visited.has(edge.from) && !visited.has(edge.to)) {
          if (edge.weight < minWeight) {
            minWeight = edge.weight;
            minEdge = edge;
          }
        }
        if (!this.isDirected && visited.has(edge.to) && !visited.has(edge.from)) {
          if (edge.weight < minWeight) {
            minWeight = edge.weight;
            minEdge = { from: edge.to, to: edge.from, weight: edge.weight };
          }
        }
      }

      if (minEdge) {
        visited.add(minEdge.to);
        mstEdges.push(minEdge);
        addLog(`MST edge: ${minEdge.from} → ${minEdge.to} (weight: ${minEdge.weight})`, "info");
        this.nodes.find((n) => n.id === minEdge.to).color = "#ffeaa7";
        this.draw(mstEdges);
      } else {
        addLog("Graph is disconnected — MST incomplete", "error");
        break;
      }
    }
    addLog(`Prim's MST complete! ${mstEdges.length} edges in MST`, "success");
  },
  resetColors() {
    this.nodes.forEach((n) => (n.color = "#55efc4"));
    this.draw();
  },
  draw(highlightEdges = []) {
    const ctx = this.canvas.getContext("2d");
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const isAlgorithmRun = highlightEdges.length > 0;

    // Edges
    this.edges.forEach((e) => {
      const n1 = this.nodes.find((n) => n.id === e.from);
      const n2 = this.nodes.find((n) => n.id === e.to);
      if (!n1 || !n2) return;

      const angle = Math.atan2(n2.y - n1.y, n2.x - n1.x);
      const r = 20;
      const x1 = n1.x + r * Math.cos(angle);
      const y1 = n1.y + r * Math.sin(angle);
      const x2 = n2.x - r * Math.cos(angle);
      const y2 = n2.y - r * Math.sin(angle);

      // --- Determine Edge Style ---
      let color = "#18538eff";
      let width = 2;
      let weightToDisplay = e.weight;
      let weightColor = "#c20c36ff";
      let weightFont = "12px Arial";

      if (isAlgorithmRun) {
        // Algorithm mode logic
        const isHighlight = highlightEdges.find(
          (h) =>
            (h.from === e.from && h.to === e.to) ||
            (!this.isDirected && h.from === e.to && h.to === e.from)
        );

        if (isHighlight) {
          // Style for Shortest Path Tree (SPT) edges
          color = "#c20c36ff";
          width = 4;
          weightColor = "#936d14ff";
          weightFont = "14px Arial Bold";

          // Use the calculated path cost as the weight (for Dijkstra's end state)
          const sptEdge = highlightEdges.find(
            (h) => h.from === e.from && h.to === e.to
          );
          weightToDisplay = sptEdge ? sptEdge.weight : e.weight;
        } else {
          // Faded style for "unwanted" (non-SPT) edges
          color = "#bdc3c730";
          width = 1;
          weightToDisplay = null; // Do not display weight for faded edges
        }
      }

      // Apply edge animations
      const edgeKey = `${e.from}-${e.to}`;
      if (this.edgeAnimations.has(edgeKey)) {
        const anim = this.edgeAnimations.get(edgeKey);
        color = anim.color;
        width = anim.width;

        // Animated dashed line effect
        if (anim.progress < 1) {
          ctx.setLineDash([5, 5]);
          ctx.lineDashOffset = -anim.progress * 50;
        }
      }

      // Apply opacity for new/removing edges
      if (e.opacity !== undefined) {
        ctx.globalAlpha = e.opacity;
      }

      // Apply edge animation opacity (for removal)
      if (this.edgeAnimations.has(edgeKey)) {
        const anim = this.edgeAnimations.get(edgeKey);
        if (anim.opacity !== undefined) {
          ctx.globalAlpha = anim.opacity;
        }
      }
      if (this.isDirected) {
        Draw.arrow(ctx, x1, y1, x2, y2, color);
      } else {
        Draw.line(ctx, x1, y1, x2, y2, color, width);
      }

      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      // --- Draw the Weight Label ---
      if (weightToDisplay !== null) {
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;

        ctx.fillStyle = weightColor;
        ctx.font = weightFont;
        ctx.fillText(weightToDisplay, mx, my - 10);
      }
    });

    this.nodes.forEach((n) => {
      const radius = 20 * (n.scale || 1);
      Draw.circle(
        ctx,
        n.x,
        n.y,
        radius,
        n.color,
        n.id,
        n.color === "#e17055" ? "#fff" : null
      );
    });
  },
};

/* ==================== 4. HASH TABLE LOGIC ==================== */
// ========== LOG SYSTEM ==========
function addLog(message, type = "info") {
  const logContent = document.getElementById("log-content");
  if (!logContent) return; // Safety check

  // Remove empty state if it exists
  const emptyState = logContent.querySelector(".log-empty");
  if (emptyState) {
    emptyState.remove();
  }

  // Create log entry
  const entry = document.createElement("div");
  entry.className = `log-entry ${type}`;

  const timestamp = new Date().toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  entry.innerHTML = `${message}<span class="log-timestamp">${timestamp}</span>`;

  logContent.appendChild(entry);

  // Auto-scroll to bottom
  logContent.scrollTop = logContent.scrollHeight;

  // Keep only last 50 entries
  const entries = logContent.querySelectorAll(".log-entry");
  if (entries.length > 50) {
    entries[0].remove();
  }
}

function clearLog() {
  const logContent = document.getElementById("log-content");
  if (logContent) {
    logContent.innerHTML = '<div class="log-empty">No operations yet</div>';
  }
}

// ========== HASH TABLE VISUALIZATION (WITH LOGS) ==========
const hashViz = {
  table: new Array(10).fill(null),
  size: 10,
  canvas: document.getElementById("hashCanvas"),
  animating: false,
  animatedNodes: new Map(),

  hashFunction(key) {
    return Math.abs(key) % this.size;
  },

  async insert() {
    if (this.animating) return;
    this.animating = true;

    const keyInput = document.getElementById("hash-key");
    const key = parseInt(keyInput.value);

    if (isNaN(key)) {
      addLog("Please enter a valid key", "error");
      this.animating = false;
      return;
    }

    addLog(`Inserting key ${key}...`, "info");
    const index = this.hashFunction(key);
    addLog(`Hash function: ${key} % ${this.size} = ${index}`, "info");

    await this.animateHashCalculation(key, index);

    let current = this.table[index];

    while (current) {
      if (current.key === key) {
        await this.animateCollisionUpdate(current);
        addLog(`Key ${key} already exists at index ${index}`, "warning");
        this.draw();
        this.animating = false;
        return;
      }
      current = current.next;
    }

    if (this.table[index] !== null) {
      addLog(`Collision at index ${index} → Chaining new node`, "warning");
    }

    const newNode = { key: key, val: key, next: null, scale: 0, opacity: 0 };
    newNode.next = this.table[index];
    this.table[index] = newNode;

    await this.animateNodeInsertion(newNode, index);

    addLog(`Key ${key} inserted at index ${index}`, "success");

    keyInput.value = "";
    this.draw();
    this.animating = false;
  },

  async search() {
    if (this.animating) return;
    this.animating = true;

    const key = parseInt(document.getElementById("hash-key").value);
    if (isNaN(key)) {
      addLog("Please enter a valid key to search", "error"); // LOG ADDED
      this.animating = false;
      return;
    }

    addLog(`Searching for key ${key}...`, "info"); // LOG ADDED
    const index = this.hashFunction(key);
    addLog(`Checking index ${index} (hash result)`, "info"); // LOG ADDED

    // Animate hash calculation
    await this.animateHashCalculation(key, index);

    let current = this.table[index];
    let position = 0;

    while (current) {
      // Animate searching through chain
      await this.animateSearchNode(current, index, position);
      addLog(`Checking node at position ${position} in chain...`, "info"); // LOG ADDED

      if (current.key === key) {
        await this.animateFoundNode(current);
        addLog(`✓ Key ${key} found at index ${index}!`, "success"); // LOG ADDED
        alert(` Key ${key} found at index ${index}.`);
        this.animating = false;
        return current.val;
      }
      current = current.next;
      position++;
    }

    await this.animateNotFound(index);
    addLog(`✗ Key ${key} not found in table`, "error"); // LOG ADDED
    alert(`Key ${key} not found. Searched index ${index} and its chain.`);
    this.animating = false;
    return null;
  },

  async animateHashCalculation(key, index) {
    const ctx = this.canvas.getContext("2d");
    return new Promise((resolve) => {
      let progress = 0;
      anime({
        targets: { value: 0 },
        value: 100,
        duration: 800,
        easing: "easeInOutQuad",
        update: (anim) => {
          progress = anim.progress;
          this.draw();

          // Draw hash calculation overlay
          ctx.save();
          ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
          ctx.fillRect(0, 0, this.canvas.width, 80);

          ctx.fillStyle = "#00b894";
          ctx.font = "bold 24px Arial";
          ctx.textAlign = "center";
          ctx.fillText(
            `Hash(${key}) = ${key} % 10 = ${index}`,
            this.canvas.width / 2,
            40
          );

          ctx.restore();
        },
        complete: resolve,
      });
    });
  },

  async animateNodeInsertion(node, index) {
    return new Promise((resolve) => {
      anime({
        targets: node,
        scale: [0, 1.2, 1],
        opacity: [0, 1],
        duration: 1000,
        easing: "easeOutElastic(1, .8)",
        update: () => this.draw(),
        complete: resolve,
      });
    });
  },

  async animateCollisionUpdate(node) {
    return new Promise((resolve) => {
      anime({
        targets: node,
        scale: [1, 1.3, 1],
        duration: 600,
        easing: "easeInOutQuad",
        update: () => this.draw(),
        complete: resolve,
      });
    });
  },

  async animateSearchNode(node, index, position) {
    return new Promise((resolve) => {
      node.highlight = true;
      anime({
        targets: { value: 0 },
        value: 1,
        duration: 400,
        update: () => this.draw(),
        complete: () => {
          node.highlight = false;
          resolve();
        },
      });
    });
  },

  async animateFoundNode(node) {
    return new Promise((resolve) => {
      let pulseCount = 0;
      anime({
        targets: node,
        scale: [1, 1.4, 1],
        duration: 400,
        loop: 3,
        easing: "easeInOutQuad",
        update: () => this.draw(),
        complete: () => {
          node.scale = 1;
          resolve();
        },
      });
    });
  },

  async animateNotFound(index) {
    return new Promise((resolve) => {
      const ctx = this.canvas.getContext("2d");
      const boxH = 42;
      const rowGap = 4;
      const startY = 10;
      anime({
        targets: { opacity: 1 },
        opacity: 0,
        duration: 600,
        easing: "easeOutQuad",
        update: (anim) => {
          this.draw();
          ctx.save();
          ctx.fillStyle = `rgba(255, 107, 107, ${anim.progress / 100})`;
          const y = startY + index * (boxH + rowGap);
          ctx.fillRect(0, y, this.canvas.width, boxH);
          ctx.restore();
        },
        complete: resolve,
      });
    });
  },

  init() {
    if (!this._resizeListenerAdded) {
      window.addEventListener("resize", () => this.draw());
      this._resizeListenerAdded = true;
    }
    this.draw();
    addLog("Hash Table initialized (size: 10)", "info");
  },

  resize() {
    this.draw();
  },

  clear() {
    this.table.fill(null);
    this.draw();
    addLog("Hash table cleared", "info"); // LOG ADDED
  },

  draw() {
    const boxW = 120;
    const boxH = 42;
    const indexW = 45;
    const colGap = 8;
    const rowGap = 4;
    const startY = 10;

    // Fixed internal size — CSS width:100% stretches it visually
    this.canvas.width = 600;
    this.canvas.height = startY + this.size * (boxH + rowGap) + 10;

    const ctx = this.canvas.getContext("2d");
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Center the index+box block horizontally
    const blockW = indexW + colGap + boxW;
    const startX = Math.max(20, (this.canvas.width - blockW) / 2);
    const boxX = startX + indexW + colGap;

    this.table.forEach((head, i) => {
      const y = startY + i * (boxH + rowGap);

      // Index cell
      ctx.fillStyle = "#4a5568";
      ctx.strokeStyle = "#718096";
      ctx.lineWidth = 1;
      ctx.fillRect(startX, y, indexW, boxH);
      ctx.strokeRect(startX, y, indexW, boxH);
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "bold 15px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(i, startX + indexW / 2, y + boxH / 2);

      if (!head) {
        // NULL cell
        ctx.fillStyle = "#2d3748";
        ctx.strokeStyle = "#4a5568";
        ctx.lineWidth = 1;
        ctx.fillRect(boxX, y, boxW, boxH);
        ctx.strokeRect(boxX, y, boxW, boxH);
        ctx.fillStyle = "#718096";
        ctx.font = "13px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("NULL", boxX + boxW / 2, y + boxH / 2);
      } else {
        // Draw chained nodes
        let current = head;
        let cx = boxX;
        while (current) {
          const scale = current.scale || 1;
          const opacity = current.opacity !== undefined ? current.opacity : 1;
          const sw = boxW * scale;
          const sh = boxH * scale;
          const ox = (boxW - sw) / 2;
          const oy = (boxH - sh) / 2;

          ctx.save();
          ctx.globalAlpha = opacity;
          ctx.fillStyle = current.highlight ? "#e74c3c" : "#e67e22";
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = current.highlight ? 3 : 1;
          ctx.fillRect(cx + ox, y + oy, sw, sh);
          ctx.strokeRect(cx + ox, y + oy, sw, sh);

          ctx.fillStyle = "#fff";
          ctx.font = "bold 13px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(`${current.key}`, cx + boxW / 2, y + boxH / 2);
          ctx.restore();

          if (current.next) {
            // Arrow to next
            ctx.strokeStyle = "#a0aec0";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx + boxW + 2, y + boxH / 2);
            ctx.lineTo(cx + boxW + 18, y + boxH / 2);
            ctx.stroke();
            // Arrowhead
            ctx.fillStyle = "#a0aec0";
            ctx.beginPath();
            ctx.moveTo(cx + boxW + 18, y + boxH / 2 - 4);
            ctx.lineTo(cx + boxW + 25, y + boxH / 2);
            ctx.lineTo(cx + boxW + 18, y + boxH / 2 + 4);
            ctx.fill();
          }

          cx += boxW + 25;
          current = current.next;
        }
      }
    });
  },
};

const dataStructures = [
  {
    name: "Binary Heap",
    icon: "🌳",
    desc: "Min/Max Heap",
    color: "#a29bfe",
    page: "binaryHeapPage",
  },
  {
    name: "AVL Tree",
    icon: "🎋",
    desc: "Self-Balancing",
    color: "#74b9ff",
    page: "avlTreePage",
  },
  {
    name: "Graph",
    icon: "🕸️",
    desc: "BFS, DFS, Dijkstra",
    color: "#55efc4",
    page: "graphPage",
  },
  {
    name: "Hash Table",
    icon: "🔐",
    desc: "Key-Value Pairs",
    color: "#ff9f43",
    page: "hashTablePage",
  },
];

const mainCanvas = document.getElementById("canvas3d");
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 6;
camera.position.y = 0.6;

const renderer = new THREE.WebGLRenderer({
  canvas: mainCanvas,
  antialias: true,
  alpha: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio || 1);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

const radius = 3.5;
const total = dataStructures.length;

const spheres = [];
const sphereGeometry = new THREE.SphereGeometry(0.8, 64, 64);
sphereGeometry.rotateY(-Math.PI / 2);

dataStructures.forEach((ds, i) => {
  const labelCanvas = document.createElement("canvas");
  labelCanvas.width = 512;
  labelCanvas.height = 512;
  const ctx = labelCanvas.getContext("2d");

  ctx.clearRect(0, 0, 512, 512);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = ds.color;
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 20;

  if (ds.name === "Hash Table") {
    ctx.font = "bold 300px Arial";
    ctx.fillText("#", 256, 256);
  } else if (ds.name === "Binary Heap") {
    ctx.font = "250px 'Segoe UI Emoji'";
    ctx.fillText("🌳", 256, 256);
  } else if (ds.name === "AVL Tree") {
    ctx.font = "250px 'Segoe UI Emoji'";
    ctx.fillText("🌲", 256, 256);
  } else if (ds.name === "Graph") {
    ctx.font = "250px 'Segoe UI Emoji'";
    ctx.fillText("🕸️", 256, 256);
  }

  ctx.shadowBlur = 10;
  ctx.font = "bold 50px Arial";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(ds.name, 256, 420);

  const texture = new THREE.CanvasTexture(labelCanvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const planeGeometry = new THREE.PlaneGeometry(2.5, 2.5);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide,
    opacity: 0.95,
  });

  const plane = new THREE.Mesh(planeGeometry, material);
  const angle = (i / total) * Math.PI * 2;
  plane.position.set(radius * Math.sin(angle), 0, radius * Math.cos(angle));
  plane.userData = { index: i, page: ds.page, angle: angle };
  spheres.push(plane);
  scene.add(plane);
});

let rotationY = 0;
let targetRotation = 0;

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

/* ==================== DESKTOP MOUSE CLICK ==================== */
mainCanvas.addEventListener("pointerdown", (event) => {
  // Only handle mouse clicks on desktop (not touch)
  if (event.pointerType === "mouse") {
    const rect = mainCanvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(spheres, false);
    if (intersects.length > 0) {
      showVisualization(intersects[0].object.userData.page);
    }
  }
});

/* ==================== MOBILE TOUCH EVENTS ==================== */

// Touch start - Record initial position and time
mainCanvas.addEventListener(
  "touchstart",
  (event) => {
    touchStartX = event.changedTouches[0].screenX;
    touchStartY = event.changedTouches[0].screenY;
    touchStartTime = Date.now();
    isTouchMove = false;
  },
  { passive: true }
);

// Touch move - Detect if user is swiping
mainCanvas.addEventListener(
  "touchmove",
  (event) => {
    isTouchMove = true;
  },
  { passive: true }
);

// Touch end - Handle swipe or tap
mainCanvas.addEventListener(
  "touchend",
  (event) => {
    touchEndX = event.changedTouches[0].screenX;
    touchEndY = event.changedTouches[0].screenY;

    const touchDuration = Date.now() - touchStartTime;
    const diffX = touchStartX - touchEndX;
    const diffY = touchStartY - touchEndY;
    const totalMovement = Math.sqrt(diffX * diffX + diffY * diffY);

    // Check if it's a TAP (short duration, minimal movement)
    if (touchDuration < tapMaxDuration && totalMovement < tapMaxMovement) {
      handleTap(event);
    }
    // Otherwise check if it's a SWIPE
    else if (
      Math.abs(diffX) > Math.abs(diffY) &&
      Math.abs(diffX) > minSwipeDistance
    ) {
      handleSwipe(diffX);
    }
  },
  false
);

// Handle tap to open data structure
function handleTap(event) {
  const rect = mainCanvas.getBoundingClientRect();
  const touch = event.changedTouches[0];
  pointer.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(spheres, false);

  if (intersects.length > 0) {
    // Visual feedback
    const sphere = intersects[0].object;
    sphere.scale.set(1.2, 1.2, 1.2);
    setTimeout(() => {
      sphere.scale.set(1, 1, 1);
    }, 150);

    // Open visualization
    showVisualization(sphere.userData.page);
  } else {
    // If no sphere tapped, select the centered one (like double-tap feature)
    const centeredSphere = getClosestSphereToFront();
    if (centeredSphere) {
      centeredSphere.scale.set(1.2, 1.2, 1.2);
      setTimeout(() => {
        centeredSphere.scale.set(1, 1, 1);
      }, 150);
      showVisualization(centeredSphere.userData.page);
    }
  }
}

// Handle swipe left/right
function handleSwipe(diffX) {
  if (diffX > 0) {
    // Swiped LEFT (show next)
    targetRotation -= Math.PI / 2;
    console.log("⬅️ Swiped LEFT - Next structure");
  } else {
    // Swiped RIGHT (show previous)
    targetRotation += Math.PI / 2;
    console.log("➡️ Swiped RIGHT - Previous structure");
  }
}

/* ==================== PARTICLES ==================== */
const particlesGeometry = new THREE.BufferGeometry();
const particlesCount = 2000;
const posArray = new Float32Array(particlesCount * 3);

for (let i = 0; i < particlesCount * 3; i++) {
  posArray[i] = (Math.random() - 0.5) * 20;
}

particlesGeometry.setAttribute(
  "position",
  new THREE.BufferAttribute(posArray, 3)
);

const particlesMaterial = new THREE.PointsMaterial({
  size: 0.015,
  color: 0xffffff,
  transparent: true,
  opacity: 0.4,
  blending: THREE.AdditiveBlending,
});

const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
scene.add(particlesMesh);

/* ==================== ANIMATION LOOP ==================== */
function animate() {
  requestAnimationFrame(animate);
  rotationY += (targetRotation - rotationY) * 0.08;

  spheres.forEach((sphere, i) => {
    const angle = (i / total) * Math.PI * 2 + rotationY;
    sphere.position.x = radius * Math.sin(angle);
    sphere.position.z = radius * Math.cos(angle);
    sphere.position.y = Math.sin(Date.now() * 0.001 + i * 1.5) * 0.3;
    sphere.lookAt(camera.position);
  });

  const positions = particlesGeometry.attributes.position.array;
  for (let i = 0; i < particlesCount; i++) {
    const i3 = i * 3;
    positions[i3 + 1] += Math.sin(Date.now() * 0.001 + i) * 0.002;

    const x = positions[i3];
    const z = positions[i3 + 2];
    positions[i3] = x * Math.cos(0.001) - z * Math.sin(0.001);
    positions[i3 + 2] = x * Math.sin(0.001) + z * Math.cos(0.001);
  }
  particlesGeometry.attributes.position.needsUpdate = true;

  renderer.render(scene, camera);
}
animate();

/* ==================== KEYBOARD CONTROLS (DESKTOP) ==================== */
document.addEventListener("keydown", (e) => {
  const landingPage = document.getElementById("landingPage");

  // Only handle keyboard if on landing page
  if (landingPage && landingPage.style.display !== "none") {
    // Arrow Left - Previous structure
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      targetRotation += Math.PI / 2;
      console.log("⬅️ Arrow Left - Previous structure");
    }

    // Arrow Right - Next structure
    if (e.key === "ArrowRight") {
      e.preventDefault();
      targetRotation -= Math.PI / 2;
      console.log("➡️ Arrow Right - Next structure");
    }

    // Enter - Open centered structure
    if (e.key === "Enter") {
      e.preventDefault();
      const centeredSphere = getClosestSphereToFront();

      if (centeredSphere) {
        // Visual feedback
        centeredSphere.scale.set(1.3, 1.3, 1.3);
        setTimeout(() => {
          centeredSphere.scale.set(1, 1, 1);
        }, 200);

        const pageId = centeredSphere.userData.page;
        console.log("✅ Enter pressed - Opening:", pageId);
        showVisualization(pageId);
      }
    }
  }
});

/* ==================== HELPER FUNCTIONS ==================== */

// Get the sphere closest to front/center
function getClosestSphereToFront() {
  let mostCentered = null;
  let minDistance = Infinity;

  spheres.forEach((sphere) => {
    const distanceFromCenter = Math.abs(sphere.position.x);

    if (sphere.position.z > 0 && distanceFromCenter < minDistance) {
      minDistance = distanceFromCenter;
      mostCentered = sphere;
    }
  });

  return mostCentered;
}

// Show visualization page
function showVisualization(pageId) {
  document.getElementById("landingPage").style.display = "none";
  document
    .querySelectorAll(".viz-page")
    .forEach((p) => p.classList.remove("active"));
  const p = document.getElementById(pageId);
  if (p) {
    p.classList.add("active");
    if (pageId === "binaryHeapPage") heapViz.init();
    if (pageId === "avlTreePage") avlViz.init();
    if (pageId === "graphPage") graphViz.init();
    if (pageId === "hashTablePage") hashViz.init();
  }
}

// Go back to landing page
function goBack() {
  document
    .querySelectorAll(".viz-page")
    .forEach((p) => p.classList.remove("active"));
  document.getElementById("landingPage").style.display = "block";
}

// Handle window resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});



/* ============================
   PATCH: Robust log + showVisualization overrides
   Applied: 2025-12-07T06:54:53.226385Z
   Purpose: Fixes duplicate #log-content, 0x0 canvas on hidden pages,
            and makes resize fallbacks robust.
   NOTE: These functions are appended to the end of the file to safely
         override earlier definitions without modifying the large original file.
   ============================ */

(function(){
  // Helper: prefer the active viz page's log content; fallback to any #log-content
  function getActiveLogContent() {
    try {
      var active = document.querySelector(".viz-page.active .log-content");
      if (active) return active;
      // fallback to any element with id log-content (backwards compatibility)
      return document.querySelector("#log-content");
    } catch (e) {
      return document.querySelector("#log-content");
    }
  }

  // Replace global addLog/clearLog with safer versions
  window.addLog = function(message, type) {
    type = type || "info";
    var logContent = getActiveLogContent();
    if (!logContent) return;

    // Remove empty state if present
    var emptyState = logContent.querySelector(".log-empty");
    if (emptyState) emptyState.remove();

    var entry = document.createElement("div");
    entry.className = "log-entry " + type;

    var now = new Date();
    // Use dd:hh:mm:ss style timestamp (24h)
    var ts = now.toLocaleTimeString("en-GB", { hour12:false, hour: '2-digit', minute:'2-digit', second:'2-digit' });

    entry.innerHTML = message + '<span class="log-timestamp">' + ts + '</span>';

    logContent.appendChild(entry);

    // Auto-scroll
    logContent.scrollTop = logContent.scrollHeight;

    // Trim to last 200 entries (generous)
    var entries = logContent.querySelectorAll(".log-entry");
    if (entries.length > 200) {
      // remove oldest until length <= 200
      var removeCount = entries.length - 200;
      for (var i = 0; i < removeCount; i++) {
        if (entries[i] && entries[i].parentNode) entries[i].parentNode.removeChild(entries[i]);
      }
    }
  };

  window.clearLog = function() {
    var logContent = getActiveLogContent();
    if (!logContent) {
      // final fallback: any container with class .log-content
      logContent = document.querySelector(".log-content");
    }
    if (logContent) {
      logContent.innerHTML = '<div class="log-empty">No operations yet</div>';
      logContent.scrollTop = 0;
    }
  };

  // Override showVisualization if present, otherwise create it.
  window.showVisualization = function(pageId) {
    try {
      var landing = document.getElementById("landingPage");
      if (landing) landing.style.display = "none";

      var pages = document.querySelectorAll(".viz-page");
      pages.forEach(function(p){ p.classList.remove("active"); });

      var p = document.getElementById(pageId);
      if (!p) return;

      p.classList.add("active");

      // Wait until next paint so layout has been applied and container sizes are correct
      requestAnimationFrame(function() {
        try {
          // call any known viz init functions if they exist
          if (pageId === "binaryHeapPage" && window.heapViz && typeof window.heapViz.init === "function") window.heapViz.init();
          if (pageId === "avlTreePage" && window.avlViz && typeof window.avlViz.init === "function") window.avlViz.init();
          if (pageId === "graphPage" && window.graphViz && typeof window.graphViz.init === "function") window.graphViz.init();
          if (pageId === "hashTablePage" && window.hashViz && typeof window.hashViz.init === "function") window.hashViz.init();
          // Generic attempt: find any canvas inside the page and trigger a resize/draw if available
          var canvases = p.querySelectorAll("canvas");
          canvases.forEach(function(c) {
            // If viz object stores canvas by id (e.g., heapCanvas -> heapViz.canvas), call its resize if present
            var id = c.id;
            if (!id) return;
            var mapping = {
              'heapCanvas': window.heapViz,
              'avlCanvas': window.avlViz,
              'graphCanvas': window.graphViz,
              'hashCanvas': window.hashViz
            };
            var viz = mapping[id] || window[id.replace('Canvas','Viz')] || null;
            if (viz && typeof viz.resize === 'function') {
              try { viz.resize(); } catch(e) {}
            } else {
              var container = c.parentElement || c.closest(".canvas-container");
              if (container) {
                var rect = container.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                  try {
                    c.width = Math.floor(rect.width);
                    c.height = Math.floor(Math.max(rect.height, 300));
                    if (typeof c.draw === "function") {
                      try { c.draw(); } catch(e){}
                    }
                  } catch(e){}
                }
              }
            }
          });
        } catch(e){}
      });

    } catch(e){}
  };

  // Make resize functions more forgiving by wrapping them (best-effort)
  // NOTE: hashViz is excluded — it uses fixed internal canvas size, no container measurement needed
  ['heapViz','avlViz','graphViz'].forEach(function(name){
    try {
      var obj = window[name];
      if (obj && typeof obj.resize === 'function') {
        if (!obj._patchedResize) {
          var orig = obj.resize.bind(obj);
          obj.resize = function() {
            try {
              var container = null;
              if (this.canvas && this.canvas.parentElement) container = this.canvas.parentElement;
              if (!container) container = document.querySelector('#' + (this.canvas && this.canvas.id ? this.canvas.id.replace('Canvas','-container') : ''));
              var rect = container ? container.getBoundingClientRect() : null;
              if (rect && rect.width > 0 && rect.height > 0) {
                orig();
              } else {
                if (this.canvas) {
                  var w = (rect && rect.width>0) ? rect.width : Math.max(window.innerWidth*0.5, 600);
                  var h = (rect && rect.height>0) ? rect.height : Math.max(window.innerHeight*0.45, 360);
                  try { this.canvas.width = Math.floor(w); this.canvas.height = Math.floor(h); } catch(e){}
                }
                if (typeof this.draw === 'function') {
                  try { this.draw(); } catch(e){}
                }
              }
            } catch(e){
              try { orig(); } catch(e){}
            }
          };
          obj._patchedResize = true;
        }
      }
    } catch(e){}
  });

})(); // end patch IIFE
