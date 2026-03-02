
'use strict';

// QUOTES OF THE DAY 
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

//  MOOD MESSAGES
const MOOD_CONFIG = {
    happy: {
        icon: '🌟',
        msg: 'Great energy! Keep the momentum going — full study mode activated.',
        cls: 'happy',
    },
    normal: {
        icon: '💙',
        msg: 'Stay consistent. Small progress daily leads to big success.',
        cls: 'normal',
    },
    stressed: {
        icon: '🌿',
        msg: 'Take a deep breath. Light load mode — one small task at a time.',
        cls: 'stressed',
    },
};

//  STATE
let studyPlan = [];
let currentMood = 'normal';
let progress = {};

// Timer
const FOCUS_DURATION = 25 * 60;
const BREAK_DURATION = 5 * 60;
const RING_CIRCUMFERENCE = 2 * Math.PI * 60;

let currentTimerMode = 'focus';
let timerSeconds = FOCUS_DURATION;
let timerRunning = false;
let timerInterval = null;

// Sessions
let sessionsToday = 0;

// Milestone tracking
const MILESTONES = [25, 50, 75, 100];
let triggeredMilestones = new Set();

//  DOM REFERENCES
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

//  NAVIGATION
function showSection(name) {
    Object.values(sections).forEach(s => s.classList.add('hidden'));
    Object.values(navLinks).forEach(l => l.classList.remove('active'));
    if (sections[name]) sections[name].classList.remove('hidden');
    if (navLinks[name]) navLinks[name].classList.add('active');
    document.getElementById('navLinks').classList.remove('open');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleNav() {
    document.getElementById('navLinks').classList.toggle('open');
}

//  INIT
function init() {
    showSection('landing');
    showDailyQuote();
    loadFromStorage();
    updateTimerDisplay();
    initParticles();
    updateSessionDisplay();
    // Set initial ring colour
    const svg = document.querySelector('.timer-ring-svg');
    if (svg) svg.classList.add('ring-focus');
}

//  DAILY QUOTE
function showDailyQuote() {
    const day = new Date().getDate();
    const quote = QUOTES[day % QUOTES.length];
    document.getElementById('dailyQuote').textContent = quote;
}

//   FORM / PLAN GENERATION
document.getElementById('plannerForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const subjectsRaw = document.getElementById('subjectsInput').value.trim();
    const examDateVal = document.getElementById('examDateInput').value;
    const hoursVal = parseInt(document.getElementById('hoursInput').value, 10);

    clearErrors();

    const subjects = subjectsRaw.split(',').map(s => s.trim()).filter(Boolean);
    if (subjects.length === 0) { showError('subjectsErr', 'Please enter at least one subject.'); return; }

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const examDate = new Date(examDateVal);
    if (!examDateVal || isNaN(examDate.getTime())) { showError('dateErr', 'Please pick a valid date.'); return; }
    if (examDate <= today) { showError('dateErr', 'Exam date must be in the future.'); return; }
    if (!hoursVal || hoursVal < 1 || hoursVal > 14) { showError('hoursErr', 'Please enter 1–14 hours.'); return; }

    const msPerDay = 24 * 60 * 60 * 1000;
    const daysLeft = Math.ceil((examDate - today) / msPerDay);

    studyPlan = generatePlan(subjects, daysLeft, hoursVal, today);
    currentMood = 'normal';
    progress = {};
    triggeredMilestones = new Set();

    saveToStorage();

    document.getElementById('statDays').textContent = daysLeft;
    document.getElementById('statSubjects').textContent = subjects.length;
    document.getElementById('statHours').textContent = hoursVal + 'h';

    renderTimetable();
    updateProgressBar();
    clearMoodState();
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

        const tasks = [];
        let hoursFilled = 0;
        while (hoursFilled < hoursPerDay) {
            const sub = subjects[subjectIndex % subjects.length];
            const slot = Math.min(2, hoursPerDay - hoursFilled);
            tasks.push({ subject: sub, hours: slot, done: false });
            hoursFilled += slot;
            subjectIndex++;
        }

        plan.push({ day: i + 1, date: dateStr, tasks, isRest: false });
    }

    return plan;
}

//  TIMETABLE RENDERING
function renderTimetable() {
    const grid = document.getElementById('timetableGrid');
    grid.innerHTML = '';

    studyPlan.forEach((dayData, dayIdx) => {
        let tasks = [...dayData.tasks];
        if (currentMood === 'stressed' && !dayData.isRest) {
            tasks = tasks.slice(0, Math.ceil(tasks.length * 0.7));
        }

        const card = document.createElement('div');
        card.className = 'day-card';

        const header = document.createElement('div');
        header.className = 'day-header';
        header.innerHTML = `<span>${dayData.date}</span><span class="day-header-num">Day ${dayData.day}</span>`;
        card.appendChild(header);

        if (dayData.isRest) {
            const rest = document.createElement('p');
            rest.className = 'rest-label';
            rest.textContent = '🌿 Rest & Recharge';
            card.appendChild(rest);
            grid.appendChild(card);
            return;
        }

        if (currentMood === 'stressed' && dayIdx === 0) {
            const note = document.createElement('p');
            note.className = 'stressed-note';
            note.textContent = '⚡ Light load mode – you\'ve got this!';
            card.appendChild(note);
        }

        tasks.forEach((task, taskIdx) => {
            const key = `d${dayIdx}_t${taskIdx}`;
            const isDone = progress[key] || false;

            const row = document.createElement('div');
            row.className = 'task-row';

            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.id = `cb_${key}`;
            cb.checked = isDone;
            cb.addEventListener('change', () => {
                progress[key] = cb.checked;
                saveToStorage();
                updateProgressBar();
            });

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

//  PROGRESS BAR
function countTotalTasks() {
    let total = 0;
    studyPlan.forEach(d => {
        if (d.isRest) return;
        total += currentMood === 'stressed'
            ? Math.ceil(d.tasks.length * 0.7)
            : d.tasks.length;
    });
    return total;
}

function updateProgressBar() {
    const total = countTotalTasks();
    const done = Object.values(progress).filter(Boolean).length;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);

    document.getElementById('progressPct').textContent = pct + '%';
    document.getElementById('progressFill').style.width = pct + '%';

    const sub = document.getElementById('progressSub');
    if (sub) {
        if (pct === 0) sub.textContent = 'Start checking off tasks!';
        else if (pct < 50) sub.textContent = `${done} of ${total} tasks completed. Keep going! 💪`;
        else if (pct < 100) sub.textContent = `You're more than halfway there! 🚀`;
        else sub.textContent = `All tasks complete! You crushed it! 🎉`;
    }

    // Check milestones
    checkMilestone(pct);
}

function checkMilestone(pct) {
    for (const milestone of MILESTONES) {
        if (pct >= milestone && !triggeredMilestones.has(milestone)) {
            triggeredMilestones.add(milestone);
            triggerConfetti();
            showToast(`${milestone}% complete! 🎊 Keep it up!`);
            break;
        }
    }
}

//  MOOD TRACKER
function setMood(mood) {
    currentMood = mood;
    saveToStorage();

    document.querySelectorAll('.mood-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`mood${capitalize(mood)}`).classList.add('active');

    const config = MOOD_CONFIG[mood];
    const msgBox = document.getElementById('moodMessage');
    const msgText = document.getElementById('moodMsgText');
    const msgIcon = document.getElementById('moodMsgIcon');

    msgIcon.textContent = config.icon;
    msgText.textContent = config.msg;
    msgBox.className = `mood-message ${config.cls}`;
    msgBox.classList.remove('hidden');

    renderTimetable();
    progress = {};
    saveToStorage();
    updateProgressBar();
}

function clearMoodState() {
    document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('moodMessage').classList.add('hidden');
}

//  FOCUS TIMER
function setTimerMode(mode) {
    if (timerRunning) {
        clearInterval(timerInterval);
        timerRunning = false;
        document.getElementById('timerStartBtn').textContent = '▶ Start';
        document.querySelector('.timer-ring-svg').classList.remove('ring-running');
    }

    currentTimerMode = mode;

    const focusBtn = document.getElementById('modeFocusBtn');
    const breakBtn = document.getElementById('modeBreakBtn');
    const title = document.getElementById('timerTitle');
    const desc = document.getElementById('timerDesc');
    const svg = document.querySelector('.timer-ring-svg');

    if (mode === 'focus') {
        focusBtn.className = 'btn btn-primary';
        breakBtn.className = 'btn btn-outline';
        timerSeconds = FOCUS_DURATION;
        title.textContent = '⏱️ Focus Timer';
        desc.textContent = 'Lock in for 25 minutes of deep focus. No distractions.';
        svg.classList.remove('ring-break');
        svg.classList.add('ring-focus');
    } else {
        breakBtn.className = 'btn btn-primary';
        focusBtn.className = 'btn btn-outline';
        timerSeconds = BREAK_DURATION;
        title.textContent = '☕ Break Timer';
        desc.textContent = 'Take a 5-minute break to recharge.';
        svg.classList.remove('ring-focus');
        svg.classList.add('ring-break');
    }

    document.getElementById('timerDone').classList.add('hidden');
    updateTimerDisplay();
    updateTimerRing();
}

function formatTime(secs) {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
}

function updateTimerDisplay() {
    document.getElementById('timerTime').textContent = formatTime(timerSeconds);
}

function updateTimerRing() {
    const totalDuration = currentTimerMode === 'focus' ? FOCUS_DURATION : BREAK_DURATION;
    const fraction = timerSeconds / totalDuration;
    const offset = RING_CIRCUMFERENCE * (1 - fraction);
    document.getElementById('timerRingProgress').style.strokeDashoffset = offset;
}

function timerToggle() {
    const btn = document.getElementById('timerStartBtn');
    const svg = document.querySelector('.timer-ring-svg');

    if (timerRunning) {
        clearInterval(timerInterval);
        timerRunning = false;
        btn.textContent = '▶ Resume';
        svg.classList.remove('ring-running');
    } else {
        document.getElementById('timerDone').classList.add('hidden');

        const totalDuration = currentTimerMode === 'focus' ? FOCUS_DURATION : BREAK_DURATION;
        if (timerSeconds <= 0) timerSeconds = totalDuration;

        timerRunning = true;
        btn.textContent = '⏸ Pause';
        svg.classList.add('ring-running');

        timerInterval = setInterval(() => {
            timerSeconds--;
            updateTimerDisplay();
            updateTimerRing();

            if (timerSeconds <= 0) {
                clearInterval(timerInterval);
                timerRunning = false;
                btn.textContent = '▶ Start';
                svg.classList.remove('ring-running');
                document.getElementById('timerDone').classList.remove('hidden');
                playBeep();

                // Count focus sessions only
                if (currentTimerMode === 'focus') {
                    sessionsToday++;
                    saveToStorage();
                    updateSessionDisplay();
                    showToast(`Session ${sessionsToday} complete! 🔥`);
                    triggerConfetti();
                }
            }
        }, 1000);
    }
}

function timerReset() {
    clearInterval(timerInterval);
    timerRunning = false;
    timerSeconds = currentTimerMode === 'focus' ? FOCUS_DURATION : BREAK_DURATION;

    document.querySelector('.timer-ring-svg').classList.remove('ring-running');
    updateTimerDisplay();
    updateTimerRing();

    document.getElementById('timerStartBtn').textContent = '▶ Start';
    document.getElementById('timerDone').classList.add('hidden');
}

function updateSessionDisplay() {
    const el = document.getElementById('sessionCount');
    if (el) el.textContent = sessionsToday;
}

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
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 1.0);
    } catch (_) { /* silent fallback */ }
}

//  CONFETTI
const CONFETTI_COLORS = [
    '#a78bfa', '#7c3aed', '#818cf8', '#34d399',
    '#fbbf24', '#f472b6', '#60a5fa', '#c4b5fd',
];

function triggerConfetti() {
    const container = document.getElementById('confettiContainer');
    if (!container) return;

    for (let i = 0; i < 60; i++) {
        const piece = document.createElement('div');
        piece.className = 'confetti-piece';

        const left = Math.random() * 100;
        const delay = Math.random() * 0.8;
        const duration = 1.8 + Math.random() * 1.2;
        const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
        const rotation = Math.random() > 0.5 ? 'rect' : 'circle';

        piece.style.cssText = `
            left: ${left}%;
            background: ${color};
            animation-duration: ${duration}s;
            animation-delay: ${delay}s;
            border-radius: ${rotation === 'circle' ? '50%' : '2px'};
            width: ${6 + Math.random() * 8}px;
            height: ${8 + Math.random() * 10}px;
        `;

        container.appendChild(piece);
        setTimeout(() => piece.remove(), (duration + delay + 0.1) * 1000);
    }
}

//  PARTICLE CANVAS
function initParticles() {
    const canvas = document.getElementById('particleCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let W = canvas.width = window.innerWidth;
    let H = canvas.height = window.innerHeight;

    const COLORS = ['rgba(167,139,250,', 'rgba(129,140,248,', 'rgba(196,181,253,'];

    const particles = Array.from({ length: 70 }, () => createParticle(W, H, COLORS));

    function createParticle(W, H, COLORS) {
        return {
            x: Math.random() * W,
            y: Math.random() * H,
            r: 1 + Math.random() * 2,
            dx: (Math.random() - 0.5) * 0.4,
            dy: (Math.random() - 0.5) * 0.4,
            alpha: 0.1 + Math.random() * 0.5,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
        };
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);
        particles.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = p.color + p.alpha + ')';
            ctx.fill();

            p.x += p.dx;
            p.y += p.dy;

            if (p.x < 0 || p.x > W) p.dx *= -1;
            if (p.y < 0 || p.y > H) p.dy *= -1;
        });
        requestAnimationFrame(draw);
    }

    draw();

    window.addEventListener('resize', () => {
        W = canvas.width = window.innerWidth;
        H = canvas.height = window.innerHeight;
    });
}

//  LOCAL STORAGE
function saveToStorage() {
    localStorage.setItem('mm_plan', JSON.stringify(studyPlan));
    localStorage.setItem('mm_mood', currentMood);
    localStorage.setItem('mm_progress', JSON.stringify(progress));
    localStorage.setItem('mm_milestones', JSON.stringify([...triggeredMilestones]));

    // Sessions reset daily
    const todayKey = new Date().toDateString();
    localStorage.setItem('mm_sessions_date', todayKey);
    localStorage.setItem('mm_sessions_count', sessionsToday);
}

function loadFromStorage() {
    const savedPlan = localStorage.getItem('mm_plan');
    const savedMood = localStorage.getItem('mm_mood');
    const savedProg = localStorage.getItem('mm_progress');
    const savedMS = localStorage.getItem('mm_milestones');

    // Session counter (daily reset)
    const todayKey = new Date().toDateString();
    const savedDate = localStorage.getItem('mm_sessions_date');
    const savedSessions = parseInt(localStorage.getItem('mm_sessions_count') || '0', 10);
    sessionsToday = (savedDate === todayKey) ? savedSessions : 0;

    if (savedPlan) {
        studyPlan = JSON.parse(savedPlan);
        currentMood = savedMood || 'normal';
        progress = savedProg ? JSON.parse(savedProg) : {};
        triggeredMilestones = savedMS ? new Set(JSON.parse(savedMS)) : new Set();

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

//  UTILITIES
function showError(id, msg) {
    document.getElementById(id).textContent = msg;
}

function clearErrors() {
    ['subjectsErr', 'dateErr', 'hoursErr'].forEach(id => {
        document.getElementById(id).textContent = '';
    });
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function showToast(msg) {
    let toast = document.getElementById('mm-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'mm-toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

//  INIT
init();
