// State variables
let array = [];
let arrayBars = [];
let isSorting = false;
let isPaused = false;
let shouldStop = false;

// Statistics
let comparisons = 0;
let swaps = 0;
let startTime = 0;
let executionTimeInterval = null;

// Audio Context
let audioCtx = null;

// DOM Elements
const arrayContainer = document.getElementById('array-container');
const generateBtn = document.getElementById('generate-btn');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resumeBtn = document.getElementById('resume-btn');
const resetBtn = document.getElementById('reset-btn');
const customInputEl = document.getElementById('custom-array-input');
const loadCustomBtn = document.getElementById('load-custom-btn');
const speedSlider = document.getElementById('speed-slider');
const speedDisplay = document.getElementById('speed-display');

const compCountEl = document.getElementById('comparisons-count');
const swapCountEl = document.getElementById('swaps-count');
const timeEl = document.getElementById('execution-time');
const actionLogEl = document.getElementById('action-log');

// Initialization
function init() {
    generateArray();
    setupEventListeners();
    updateSpeedDisplay();
}

// Render Array
function renderArray(values) {
    if (isSorting && !shouldStop) return;
    
    array = [...values];
    arrayBars = [];
    arrayContainer.innerHTML = '';
    resetStats();
    
    const maxValue = Math.max(...array, 1);
    
    // Create visual bars
    for (let i = 0; i < array.length; i++) {
        const value = array[i];
        const heightPercent = Math.max((value / maxValue) * 100, 5); // Ensure minimum height of 5%
        
        const bar = document.createElement('div');
        bar.classList.add('array-bar');
        bar.style.height = `${heightPercent}%`;
        bar.textContent = value;
        
        arrayContainer.appendChild(bar);
        arrayBars.push(bar);
    }
}

// Generate random array
function generateArray(size = 10) {
    if (isSorting && !shouldStop) return;
    
    const newValues = [];
    for (let i = 0; i < size; i++) {
        newValues.push(Math.floor(Math.random() * 90) + 10);
    }
    renderArray(newValues);
    setStepDescription('Generated new random array. Ready to sort.', 'highlight');
}

function loadCustomArray() {
    if (isSorting && !shouldStop) return;
    const input = customInputEl.value;
    if (!input) return;
    
    const parsed = input.split(',')
                        .map(n => parseInt(n.trim(), 10))
                        .filter(n => !isNaN(n) && n > 0);
                        
    if (parsed.length === 0) {
        alert('Please enter valid comma-separated positive numbers.');
        return;
    }
    if (parsed.length > 50) {
        alert('Please limit the array to 50 elements for optimal visualization.');
        return;
    }
    
    renderArray(parsed);
    setStepDescription(`Loaded custom array of size ${parsed.length}. Ready to sort.`, 'highlight');
}

// Setup Event Listeners
function setupEventListeners() {
    generateBtn.addEventListener('click', () => generateArray());
    loadCustomBtn.addEventListener('click', loadCustomArray);
    startBtn.addEventListener('click', startSorting);
    pauseBtn.addEventListener('click', pauseSorting);
    resumeBtn.addEventListener('click', resumeSorting);
    resetBtn.addEventListener('click', resetSorting);
    
    speedSlider.addEventListener('input', updateSpeedDisplay);
}

// Controls logic
async function startSorting() {
    isSorting = true;
    shouldStop = false;
    isPaused = false;
    
    // Init Audio context on user interaction
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // Update UI
    generateBtn.disabled = true;
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    resetBtn.disabled = false;
    
    resetStats();
    startTime = performance.now();
    
    executionTimeInterval = setInterval(() => {
        if (!isPaused) {
            const currentTime = performance.now();
            timeEl.textContent = ((currentTime - startTime) / 1000).toFixed(2) + 's';
        } else {
            // Adjust start time so paused duration doesn't count
            startTime += 100;
        }
    }, 100);
    
    try {
        await quickSort(0, array.length - 1);
        
        if (!shouldStop) {
            setStepDescription('Sorting complete! Array is sorted.', 'sorted');
            await finalizeSorting();
        }
    } catch (e) {
        if (e !== 'Stopped') console.error(e);
    } finally {
        cleanupSort();
    }
}

function pauseSorting() {
    isPaused = true;
    pauseBtn.style.display = 'none';
    resumeBtn.style.display = 'inline-flex';
    resumeBtn.disabled = false;
    setStepDescription('Sorting paused.', 'highlight');
}

function resumeSorting() {
    isPaused = false;
    resumeBtn.style.display = 'none';
    pauseBtn.style.display = 'inline-flex';
    setStepDescription('Sorting resumed.', 'highlight');
}

function resetSorting() {
    shouldStop = true;
    isPaused = false;
    cleanupSort();
    generateArray();
}

function cleanupSort() {
    clearInterval(executionTimeInterval);
    isSorting = false;
    
    generateBtn.disabled = false;
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    pauseBtn.style.display = 'inline-flex';
    resumeBtn.style.display = 'none';
    resetBtn.disabled = true;
}

function resetStats() {
    comparisons = 0;
    swaps = 0;
    compCountEl.textContent = '0';
    swapCountEl.textContent = '0';
    timeEl.textContent = '0.00s';
}

function updateSpeedDisplay() {
    const val = parseInt(speedSlider.value);
    let text = 'Medium';
    if (val < 50) text = 'Fast';
    else if (val > 500) text = 'Slow';
    
    speedDisplay.textContent = text;
}

// Utility: Sleep function for animations
function sleep() {
    const ms = parseInt(speedSlider.value);
    return new Promise(resolve => {
        const interval = setInterval(() => {
            if (shouldStop) {
                clearInterval(interval);
                resolve('Stopped');
            } else if (!isPaused) {
                clearInterval(interval);
                setTimeout(resolve, ms);
            }
        }, 50); // Check pause state frequently
    });
}

// Sound Synthesis
function playNote(freq) {
    if (!audioCtx) return;
    
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = 'square';
    osc.frequency.value = freq;
    
    // Smooth envelope
    gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
}

// QuickSort Implementation
async function quickSort(low, high) {
    if (low < high) {
        if (shouldStop) throw 'Stopped';
        
        let pi = await partition(low, high);
        
        await quickSort(low, pi - 1);
        await quickSort(pi + 1, high);
    }
}

async function partition(low, high) {
    // Select pivot (last element)
    let pivotValue = array[high];
    
    // Highlight pivot
    arrayBars[high].classList.add('pivot');
    setStepDescription(`Selected pivot: ${pivotValue} at index ${high}`, 'pivot');
    await sleep();
    
    let i = (low - 1);
    
    for (let j = low; j <= high - 1; j++) {
        if (shouldStop) throw 'Stopped';
        
        // Highlight current element being compared
        arrayBars[j].classList.add('comparing');
        setStepDescription(`Comparing ${array[j]} with pivot ${pivotValue}`, 'compare');
        
        comparisons++;
        compCountEl.textContent = comparisons;
        
        await sleep();
        
        if (array[j] < pivotValue) {
            i++;
            // Highlight swap candidates
            arrayBars[i].classList.add('swapping');
            arrayBars[j].classList.add('swapping');
            
            setStepDescription(`Swapping ${array[i]} and ${array[j]}`, 'swap');
            
            await swap(i, j);
            
            arrayBars[i].classList.remove('swapping');
        }
        arrayBars[j].classList.remove('comparing');
    }
    
    // Swap pivot to correct position
    if (i + 1 !== high) {
        arrayBars[i + 1].classList.add('swapping');
        arrayBars[high].classList.add('swapping');
        setStepDescription(`Moving pivot to correct position: swapping ${array[i + 1]} and ${array[high]}`, 'swap');
        await swap(i + 1, high);
        arrayBars[i + 1].classList.remove('swapping');
        arrayBars[high].classList.remove('swapping');
    }
    
    arrayBars[high].classList.remove('pivot');
    arrayBars[i + 1].classList.add('sorted'); // Pivot is now in correct place
    
    return (i + 1);
}

async function swap(i, j) {
    if (shouldStop) throw 'Stopped';
    
    swaps++;
    swapCountEl.textContent = swaps;
    
    // Play sound based on bar height
    playNote(200 + array[i] * 5);
    
    await sleep();
    
    // Swap in array
    let temp = array[i];
    array[i] = array[j];
    array[j] = temp;
    
    // Swap heights in DOM
    arrayBars[i].style.height = `${array[i]}%`;
    arrayBars[j].style.height = `${array[j]}%`;
    
    // Swap text in DOM
    arrayBars[i].textContent = array[i];
    arrayBars[j].textContent = array[j];
}

// Final animation when array is sorted
async function finalizeSorting() {
    for (let i = 0; i < arrayBars.length; i++) {
        if (shouldStop) return;
        arrayBars[i].classList.remove('comparing', 'pivot', 'swapping');
        arrayBars[i].classList.add('sorted');
        playNote(400 + i * 10);
        await sleep();
    }
}

function setStepDescription(text, type = '') {
    if (text.includes('Ready to sort')) {
        actionLogEl.innerHTML = '';
    }
    const p = document.createElement('p');
    p.textContent = text;
    if (type) p.classList.add(type);
    actionLogEl.appendChild(p);
    actionLogEl.scrollTop = actionLogEl.scrollHeight;
}

// Start app
init();
