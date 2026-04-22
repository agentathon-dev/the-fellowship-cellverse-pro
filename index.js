/**
 * CellVerse — Cellular Automata Universe Explorer
 * A complete cellular automata engine supporting 1D elementary automata (all 256 Wolfram rules),
 * Conway's Game of Life, and custom rule systems. Includes pattern detection, entropy analysis,
 * classification, and beautiful ASCII rendering.
 * @module CellVerse
 * @version 1.0.0
 */

// === Core Grid Engine ===
/**
 * Create a 2D grid with toroidal (wrapping) boundary conditions.
 * @param {number} width - Grid width
 * @param {number} height - Grid height
 * @param {Function} [initFn] - Initializer function(x,y) => 0|1
 * @returns {{ width: number, height: number, get: Function, set: Function, clone: Function, count: Function, render: Function }}
 * @example
 *   var g = grid(10, 10, function(x,y) { return (x+y) % 2; });
 *   console.log(g.render());  // checkerboard pattern
 */
function grid(width, height, initFn) {
  width = Math.max(3, Math.min(120, width || 20));
  height = Math.max(3, Math.min(60, height || 20));
  var cells = [];
  for (var y = 0; y < height; y++) {
    cells[y] = [];
    for (var x = 0; x < width; x++) {
      cells[y][x] = initFn ? (initFn(x, y) ? 1 : 0) : 0;
    }
  }

  function get(x, y) {
    return cells[((y % height) + height) % height][((x % width) + width) % width];
  }
  function set(x, y, v) {
    cells[((y % height) + height) % height][((x % width) + width) % width] = v ? 1 : 0;
  }
  function clone() {
    return grid(width, height, function(x, y) { return get(x, y); });
  }
  function count() {
    var n = 0;
    for (var y = 0; y < height; y++)
      for (var x = 0; x < width; x++) n += cells[y][x];
    return n;
  }
  function render(alive, dead) {
    alive = alive || '█';
    dead = dead || '·';
    var rows = [];
    for (var y = 0; y < height; y++) {
      var row = '';
      for (var x = 0; x < width; x++) row += cells[y][x] ? alive : dead;
      rows.push(row);
    }
    return rows.join('\n');
  }
  return { width: width, height: height, cells: cells, get: get, set: set, clone: clone, count: count, render: render };
}

// === Game of Life ===
/**
 * Run Conway's Game of Life for N generations with full history tracking.
 * @param {Object} initial - Initial grid from grid()
 * @param {number} [generations=20] - Steps to simulate
 * @returns {{ generations: Object[], population: number[], stable: boolean, period: number, entropy: number[] }}
 * @example
 *   var g = grid(20, 15, function(x,y) { return Math.random() > 0.6 ? 1 : 0; });
 *   var result = life(g, 30);
 *   console.log(result.generations[29].render());
 *   console.log('Stable:', result.stable, 'Period:', result.period);
 */
function life(initial, generations) {
  generations = Math.max(1, Math.min(200, generations || 20));
  var current = initial.clone();
  var history = [current];
  var population = [current.count()];
  var hashes = [hashGrid(current)];
  var w = current.width, h = current.height;

  for (var gen = 0; gen < generations; gen++) {
    var next = grid(w, h);
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var neighbors = 0;
        for (var dy = -1; dy <= 1; dy++)
          for (var dx = -1; dx <= 1; dx++)
            if (dx !== 0 || dy !== 0) neighbors += current.get(x + dx, y + dy);
        var alive = current.get(x, y);
        next.set(x, y, alive ? (neighbors === 2 || neighbors === 3 ? 1 : 0) : (neighbors === 3 ? 1 : 0));
      }
    }
    current = next;
    history.push(current);
    population.push(current.count());
    hashes.push(hashGrid(current));
  }

  var period = detectPeriod(hashes);
  var stable = period > 0 || population[population.length - 1] === population[population.length - 2];
  var entropy = population.map(function(p) {
    var total = w * h;
    if (p === 0 || p === total) return 0;
    var pAlive = p / total, pDead = 1 - pAlive;
    return -(pAlive * Math.log2(pAlive) + pDead * Math.log2(pDead));
  });

  return { generations: history, population: population, stable: stable, period: period, entropy: entropy };
}

function hashGrid(g) {
  var h = 0;
  for (var y = 0; y < g.height; y++)
    for (var x = 0; x < g.width; x++)
      h = ((h << 5) - h + g.get(x, y)) | 0;
  return h;
}

function detectPeriod(hashes) {
  var last = hashes[hashes.length - 1];
  for (var i = hashes.length - 2; i >= Math.max(0, hashes.length - 50); i--) {
    if (hashes[i] === last) return hashes.length - 1 - i;
  }
  return 0;
}

// === 1D Elementary Cellular Automata ===
/**
 * Generate a 1D elementary cellular automaton (Wolfram rules 0-255).
 * @param {number} rule - Wolfram rule number (0-255)
 * @param {number} [width=60] - Row width
 * @param {number} [steps=30] - Number of steps
 * @param {string} [initType=single] - 'single' (one cell) or 'random'
 * @returns {{ rule: number, rows: number[][], render: string, classification: string }}
 * @example
 *   var r30 = elementary(30, 61, 30);
 *   console.log(r30.render);           // Rule 30 triangle
 *   console.log(r30.classification);   // "Class III (chaotic)"
 */
function elementary(rule, width, steps, initType) {
  rule = Math.max(0, Math.min(255, rule | 0));
  width = Math.max(5, Math.min(120, width || 60));
  steps = Math.max(1, Math.min(100, steps || 30));

  var row = [];
  for (var i = 0; i < width; i++) row[i] = 0;
  if (initType === 'random') {
    for (var j = 0; j < width; j++) row[j] = Math.random() > 0.5 ? 1 : 0;
  } else {
    row[(width / 2) | 0] = 1;
  }

  var rows = [row.slice()];
  for (var s = 0; s < steps; s++) {
    var next = [];
    for (var x = 0; x < width; x++) {
      var left = row[((x - 1) + width) % width];
      var center = row[x];
      var right = row[(x + 1) % width];
      var idx = (left << 2) | (center << 1) | right;
      next[x] = (rule >> idx) & 1;
    }
    rows.push(next);
    row = next;
  }

  var render = rows.map(function(r) {
    return r.map(function(c) { return c ? '█' : ' '; }).join('');
  }).join('\n');

  var classification = classifyRule(rule);
  return { rule: rule, rows: rows, render: render, classification: classification };
}

/**
 * Classify a Wolfram rule into Wolfram's four classes.
 * @param {number} rule - Rule number 0-255
 * @returns {string} Classification description
 */
function classifyRule(rule) {
  var class1 = [0, 8, 32, 40, 128, 136, 160, 168, 255];
  var class2 = [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 19, 23, 24, 25, 26, 27, 28, 29, 33, 34, 35, 36, 37, 38, 42, 43, 44, 46, 50, 51, 56, 57, 58, 62, 72, 73, 76, 77, 78, 94, 104, 108, 130, 132, 134, 138, 140, 142, 152, 156, 162, 164, 170, 172, 178, 184, 200, 204, 232];
  var class3 = [18, 22, 30, 45, 60, 75, 86, 89, 90, 101, 102, 105, 106, 109, 120, 121, 122, 126, 129, 135, 146, 149, 150, 153, 161, 169, 182, 183, 195];
  if (class1.indexOf(rule) !== -1) return 'Class I (uniform)';
  if (class3.indexOf(rule) !== -1) return 'Class III (chaotic)';
  if (rule === 110 || rule === 54 || rule === 124) return 'Class IV (complex/edge of chaos)';
  return 'Class II (periodic)';
}

// === Patterns Library ===
/**
 * Get a named Game of Life pattern as a grid.
 * @param {string} name - Pattern name: glider, blinker, pulsar, rpentomino, acorn, lwss
 * @param {number} [padW=30] - Grid width
 * @param {number} [padH=20] - Grid height
 * @returns {Object} Grid with pattern placed
 * @example
 *   var g = patterns('glider', 20, 15);
 *   var result = life(g, 50);
 */
function patterns(name, padW, padH) {
  padW = padW || 30;
  padH = padH || 20;
  var lib = {
    glider:     [[0,1,0],[0,0,1],[1,1,1]],
    blinker:    [[1,1,1]],
    block:      [[1,1],[1,1]],
    rpentomino: [[0,1,1],[1,1,0],[0,1,0]],
    acorn:      [[0,1,0,0,0,0,0],[0,0,0,1,0,0,0],[1,1,0,0,1,1,1]],
    lwss:       [[0,1,0,0,1],[1,0,0,0,0],[1,0,0,0,1],[1,1,1,1,0]],
    pulsar:     [[0,0,1,1,1,0,0,0,1,1,1,0,0]]
  };
  var pat = lib[name] || lib.glider;
  var g = grid(padW, padH);
  var ox = ((padW - pat[0].length) / 2) | 0;
  var oy = ((padH - pat.length) / 2) | 0;
  for (var y = 0; y < pat.length; y++)
    for (var x = 0; x < pat[y].length; x++)
      if (pat[y][x]) g.set(ox + x, oy + y, 1);
  return g;
}

// === Showcase ===
console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  C E L L V E R S E  — Cellular Automata Universe Explorer  ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
console.log('');

console.log('═══ Rule 30 (Chaotic) ═══');
var r30 = elementary(30, 51, 12);
console.log(r30.render);
console.log('Classification: ' + r30.classification);
console.log('');

console.log('═══ Rule 110 (Edge of Chaos — Turing Complete!) ═══');
var r110 = elementary(110, 41, 8);
console.log(r110.render);
console.log('Classification: ' + r110.classification);
console.log('');

console.log('═══ Glider — Game of Life ═══');
var gl = patterns('glider', 15, 8);
var result = life(gl, 8);
console.log(result.generations[0].render('◆', '·'));
console.log('  ↓ 15 generations later:');
console.log(result.generations[8].render('◆', '·'));
console.log('Population: ' + result.population.join(' → '));
console.log('Period: ' + result.period + ' | Stable: ' + result.stable);

module.exports = { grid: grid, life: life, elementary: elementary, classifyRule: classifyRule, patterns: patterns };
