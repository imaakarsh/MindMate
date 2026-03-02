

'use strict';

// ── 1. QUOTES OF THE DAY 
const QUOTES = [
    '"The secret of getting ahead is getting started." – Mark Twain',
    '"Push yourself, because no one else is going to do it for you."',
    '"Believe you can and you\'re halfway there." – Theodore Roosevelt',
    '"It always seems impossible until it\'s done." – Nelson Mandela',
    '"You don\'t have to be great to start, but you have to start to be great."',
    '"Study now, enjoy later."',
    '"Little by little, a little becomes a lot."',
    '"Each day is a step closer to your goal. Keep going."',
    '"Your future is created by what you do today."',
    '"Consistency beats intensity every time."',
    '"Great things never come from comfort zones."',
    '"Dream it. Plan it. Do it."',
    '"Success is the sum of small efforts, repeated daily."',
    '"Don\'t wish for it; work for it."',
];

// ── 2. MOOD MESSAGES ────
const MOOD_CONFIG = {
    happy: {
        icon: '🌟',
        msg: 'Great energy! Keep the momentum going.',
        cls: 'happy',
    },
    normal: {
        icon: '💙',
        msg: 'Stay consistent. Small progress daily leads to success.',
        cls: 'normal',
    },
    stressed: {
        icon: '🌿',
        msg: 'Take a deep breath. Try a 2-minute break and focus on one small task.',
        cls: 'stressed',
    },
};

// ── 3. STATE
let studyPlan = [];   // Array of day objects
let currentMood = 'normal';
let progress = {};   // { 'd0_t0': true, … }

// Timer state
const FOCUS_DURATION = 25 * 60; // 25 minutes in seconds
const BREAK_DURATION = 5 * 60;  // 5 minutes in seconds
const RING_CIRCUMFERENCE = 2 * Math.PI * 60; // r = 60  →  376.99

let currentTimerMode = 'focus';
let timerSeconds = FOCUS_DURATION;
let timerRunning = false;
let timerInterval = null;

// ── 4. DOM REFERENCES ───
const sections = {
    landing: document.getElementById('landing'),
    planner: document.getElementById('planner'),
    dashboard: document.getElementById('dashboard'),
    timer: document.getElementById('timer'),
};
const navLinks = {
    landing: document.getElementById('navHome'),
    planner: document.getElementById('navPlanner'),
    dashboard: document.getElementById('navDashboard'),
    timer: document.getElementById('navTimer'),
};

// ── 5. SECTION NAVIGATION

/**
 * Show one section and hide the rest.
 * Also highlights the correct nav link.
 */
function showSection(name) {
    // Hide all
    Object.values(sections).forEach(s => s.classList.add('hidden'));
    // Remove active from all nav links
    Object.values(navLinks).forEach(l => l.classList.remove('active'));

    // Show the target
    if (sections[name]) sections[name].classList.remove('hidden');
    if (navLinks[name]) navLinks[name].classList.add('active');

    // Close mobile nav if open
    document.getElementById('navLinks').classList.remove('open');

    // Scroll top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Hamburger (mobile nav)
function toggleNav() {
    document.getElementById('navLinks').classList.toggle('open');
}

// ── 6. INIT─

/** Runs on page load */
function init() {
    showSection('landing');
    showDailyQuote();
    loadFromStorage();
    updateTimerDisplay();
}

// ── 7. DAILY QUOTE ──────

function showDailyQuote() {
    // Pick a quote based on day of month so it changes each day
    const day = new Date().getDate();
    const quote = QUOTES[day % QUOTES.length];
    document.getElementById('dailyQuote').textContent = quote;
}

// ── 8. FORM VALIDATION & PLAN GENERATION────────

document.getElementById('plannerForm').addEventListener('submit', function (e) {
    e.preventDefault();

    // Read inputs
    const subjectsRaw = document.getElementById('subjectsInput').value.trim();
    const examDateVal = document.getElementById('examDateInput').value;
    const hoursVal = parseInt(document.getElementById('hoursInput').value, 10);

    // Clear previous errors
    clearErrors();

    // Validate subjects
    const subjects = subjectsRaw.split(',').map(s => s.trim()).filter(Boolean);
    if (subjects.length === 0) {
        showError('subjectsErr', 'Please enter at least one subject.');
        return;
    }

    // Validate exam date (must be future)
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const examDate = new Date(examDateVal);
    if (!examDateVal || isNaN(examDate.getTime())) {
        showError('dateErr', 'Please pick a valid date.');
        return;
    }
    if (examDate <= today) {
        showError('dateErr', 'Exam date must be in the future.');
        return;
    }

    // Validate hours
    if (!hoursVal || hoursVal < 1 || hoursVal > 14) {
        showError('hoursErr', 'Please enter 1–14 hours.');
        return;
    }

    // Calculate days remaining
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysLeft = Math.ceil((examDate - today) / msPerDay);

    // Generate plan
    studyPlan = generatePlan(subjects, daysLeft, hoursVal, today);
    currentMood = 'normal';
    progress = {};

    // Save to LocalStorage
    saveToStorage();

    // Update stats
    document.getElementById('statDays').textContent = daysLeft;
    document.getElementById('statSubjects').textContent = subjects.length;
    document.getElementById('statHours').textContent = hoursVal + 'h';

    // Render timetable
    renderTimetable();
    updateProgressBar();
    clearMoodState();

    // Go to dashboard
    showSection('dashboard');
    showToast('Study plan created! 🎉');
});


function generatePlan(subjects, daysLeft, hoursPerDay, startDate) {
    const plan = [];
    const msPerDay = 24 * 60 * 60 * 1000;
    let subjectIndex = 0;

    for (let i = 0; i < daysLeft; i++) {
        const date = new Date(startDate.getTime() + i * msPerDay);
        const dateStr = date.toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric',
        });


        const isRest = (daysLeft > 7 && (i + 1) % 7 === 0);

        if (isRest) {
            plan.push({ day: i + 1, date: dateStr, tasks: [], isRest: true });
            continue;
        }

        // Fill day with subject sessions 
        const tasks = [];
        let hoursFilled = 0;

        while (hoursFilled < hoursPerDay) {
            const sub = subjects[subjectIndex % subjects.length];
            const slot = Math.min(2, hoursPerDay - hoursFilled); // cap at 2h
            tasks.push({ subject: sub, hours: slot, done: false });
            hoursFilled += slot;
            subjectIndex++;
        }

        plan.push({ day: i + 1, date: dateStr, tasks, isRest: false });
    }

    return plan;
}

// ── 10. TIMETABLE RENDERING

/** Builds the day cards in the dashboard */
function renderTimetable() {
    const grid = document.getElementById('timetableGrid');
    grid.innerHTML = ''; // clear old cards

    studyPlan.forEach((dayData, dayIdx) => {

        // Determine tasks to show based on mood
        let tasks = [...dayData.tasks];

        // Stressed → show only 70% of tasks (rounded up)
        if (currentMood === 'stressed' && !dayData.isRest) {
            const reducedCount = Math.ceil(tasks.length * 0.7);
            tasks = tasks.slice(0, reducedCount);
        }

        // Create day card
        const card = document.createElement('div');
        card.className = 'day-card';

        // Header
        const header = document.createElement('div');
        header.className = 'day-header';
        header.innerHTML = `
      <span>${dayData.date}</span>
      <span class="day-header-num">Day ${dayData.day}</span>
    `;
        card.appendChild(header);

        // REST DAY
        if (dayData.isRest) {
            const rest = document.createElement('p');
            rest.className = 'rest-label';
            rest.textContent = '🌿 Rest & Recharge';
            card.appendChild(rest);
            grid.appendChild(card);
            return;
        }

        // STRESSED note on first card
        if (currentMood === 'stressed' && dayIdx === 0) {
            const note = document.createElement('p');
            note.className = 'stressed-note';
            note.textContent = '⚡ Light load mode – you\'ve got this!';
            card.appendChild(note);
        }

        // Task rows
        tasks.forEach((task, taskIdx) => {
            const key = `d${dayIdx}_t${taskIdx}`; // unique key for LocalStorage
            const isDone = progress[key] || false;

            const row = document.createElement('div');
            row.className = 'task-row';

            // Checkbox
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.id = `cb_${key}`;
            cb.checked = isDone;
            cb.addEventListener('change', () => {
                progress[key] = cb.checked;
                saveToStorage();
                updateProgressBar();
            });

            // Label
            const lbl = document.createElement('label');
            lbl.htmlFor = `cb_${key}`;
            lbl.textContent = `${task.subject} (${task.hours}h)`;

            row.appendChild(cb);
            row.appendChild(lbl);
            card.appendChild(row);
        });

        grid.appendChild(card);
    });
}

// ── 11. PROGRESS BAR ────

/** Counts total tasks shown (respects stressed mode) */
function countTotalTasks() {
    let total = 0;
    studyPlan.forEach(d => {
        if (d.isRest) return;
        const count = currentMood === 'stressed'
            ? Math.ceil(d.tasks.length * 0.7)
            : d.tasks.length;
        total += count;
    });
    return total;
}

/** Recalculates and animates the progress bar */
function updateProgressBar() {
    const total = countTotalTasks();
    const done = Object.values(progress).filter(Boolean).length;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);

    document.getElementById('progressPct').textContent = pct + '%';
    document.getElementById('progressFill').style.width = pct + '%';
}

// ── 12. MOOD TRACKER ────

/**
 * Called when the user clicks a mood button.
 * Updates styles, shows message, and re-renders timetable.
 */
function setMood(mood) {
    currentMood = mood;
    saveToStorage();

    // Update button styles
    document.querySelectorAll('.mood-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`mood${capitalize(mood)}`).classList.add('active');

    // Show message
    const config = MOOD_CONFIG[mood];
    const msgBox = document.getElementById('moodMessage');
    const msgText = document.getElementById('moodMsgText');
    const msgIcon = document.getElementById('moodMsgIcon');

    msgIcon.textContent = config.icon;
    msgText.textContent = config.msg;
    msgBox.className = `mood-message ${config.cls}`; // coloured border
    msgBox.classList.remove('hidden');

    // Re-render timetable with adjusted workload
    renderTimetable();
    // Reset progress when mood changes (new task count)
    progress = {};
    saveToStorage();
    updateProgressBar();
}

/** Clears mood selection (e.g. after new plan is generated) */
function clearMoodState() {
    document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('moodMessage').classList.add('hidden');
}

// ── 13. FOCUS TIMER ─────

function setTimerMode(mode) {
    if (timerRunning) {
        clearInterval(timerInterval);
        timerRunning = false;
        document.getElementById('timerStartBtn').textContent = '▶ Start';
    }

    currentTimerMode = mode;

    const focusBtn = document.getElementById('modeFocusBtn');
    const breakBtn = document.getElementById('modeBreakBtn');
    const title = document.getElementById('timerTitle');
    const desc = document.getElementById('timerDesc');

    if (mode === 'focus') {
        focusBtn.className = 'btn btn-primary';
        breakBtn.className = 'btn btn-outline';
        timerSeconds = FOCUS_DURATION;
        title.textContent = '⏱️ Focus Timer';
        desc.textContent = 'Lock in for 25 minutes of deep focus. No distractions.';
    } else {
        breakBtn.className = 'btn btn-primary';
        focusBtn.className = 'btn btn-outline';
        timerSeconds = BREAK_DURATION;
        title.textContent = '☕ Break Timer';
        desc.textContent = 'Take a 5-minute break to recharge.';
    }

    document.getElementById('timerDone').classList.add('hidden');
    updateTimerDisplay();
    updateTimerRing();
}

/** Formats seconds → MM:SS string */
function formatTime(secs) {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
}

/** Updates the timer display text */
function updateTimerDisplay() {
    document.getElementById('timerTime').textContent = formatTime(timerSeconds);
}

/** Updates the SVG ring stroke-dashoffset to match elapsed time */
function updateTimerRing() {
    const totalDuration = currentTimerMode === 'focus' ? FOCUS_DURATION : BREAK_DURATION;
    const fraction = timerSeconds / totalDuration; // 1 = full, 0 = empty
    const offset = RING_CIRCUMFERENCE * (1 - fraction);
    document.getElementById('timerRingProgress').style.strokeDashoffset = offset;
}

/** Toggles Start ↔ Pause */
function timerToggle() {
    const btn = document.getElementById('timerStartBtn');

    if (timerRunning) {
        // PAUSE
        clearInterval(timerInterval);
        timerRunning = false;
        btn.textContent = '▶ Resume';
    } else {
        // START / RESUME
        document.getElementById('timerDone').classList.add('hidden');

        // If already finished, restart from 25:00
        const totalDuration = currentTimerMode === 'focus' ? FOCUS_DURATION : BREAK_DURATION;
        if (timerSeconds <= 0) timerSeconds = totalDuration;

        timerRunning = true;
        btn.textContent = '⏸ Pause';

        timerInterval = setInterval(() => {
            timerSeconds--;
            updateTimerDisplay();
            updateTimerRing();

            if (timerSeconds <= 0) {
                clearInterval(timerInterval);
                timerRunning = false;
                btn.textContent = '▶ Start';
                document.getElementById('timerDone').classList.remove('hidden');
                playBeep(); // audio feedback
            }
        }, 1000);
    }
}

/** Resets timer to default value */
function timerReset() {
    clearInterval(timerInterval);
    timerRunning = false;
    timerSeconds = currentTimerMode === 'focus' ? FOCUS_DURATION : BREAK_DURATION;

    updateTimerDisplay();
    updateTimerRing();

    document.getElementById('timerStartBtn').textContent = '▶ Start';
    document.getElementById('timerDone').classList.add('hidden');
}

/** Plays a short beep using Web Audio API */
function playBeep() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.9);
    } catch (_) {
        // Browser may not support Web Audio; silently skip
    }
}

// ── 14. LOCAL STORAGE ───

/** Saves plan, mood, and progress to LocalStorage */
function saveToStorage() {
    localStorage.setItem('mm_plan', JSON.stringify(studyPlan));
    localStorage.setItem('mm_mood', currentMood);
    localStorage.setItem('mm_progress', JSON.stringify(progress));
}

/** Loads saved data on startup */
function loadFromStorage() {
    const savedPlan = localStorage.getItem('mm_plan');
    const savedMood = localStorage.getItem('mm_mood');
    const savedProg = localStorage.getItem('mm_progress');

    if (savedPlan) {
        studyPlan = JSON.parse(savedPlan);
        currentMood = savedMood || 'normal';
        progress = savedProg ? JSON.parse(savedProg) : {};

        // Restore stats
        const days = studyPlan.filter(d => !d.isRest).length;
        const firstDay = studyPlan[0];
        const lastDay = studyPlan[studyPlan.length - 1];

        // Rough subject count from first non-rest day
        const firstNonRest = studyPlan.find(d => !d.isRest);
        const subjects = firstNonRest
            ? [...new Set(firstNonRest.tasks.map(t => t.subject))].length
            : '–';
        const hours = firstNonRest
            ? firstNonRest.tasks.reduce((a, t) => a + t.hours, 0)
            : '–';

        document.getElementById('statDays').textContent = studyPlan.length;
        document.getElementById('statSubjects').textContent = subjects;
        document.getElementById('statHours').textContent = hours + 'h';

        renderTimetable();
        updateProgressBar();
    }
}


/** Shows an inline error message */
function showError(id, msg) {
    document.getElementById(id).textContent = msg;
}

/** Clears all inline error messages */
function clearErrors() {
    ['subjectsErr', 'dateErr', 'hoursErr'].forEach(id => {
        document.getElementById(id).textContent = '';
    });
}

/** Capitalises the first letter of a string */
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Shows a brief toast notification */
function showToast(msg) {
    // Create if doesn't exist
    let toast = document.getElementById('mm-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'mm-toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }

    toast.textContent = msg;
    toast.classList.add('show');

    // Hide after 3 seconds
    setTimeout(() => toast.classList.remove('show'), 3000);
}


init();
