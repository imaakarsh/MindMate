# 🧠 MindMate

**Live Demo:** [MindMate](https://imaakarsh.github.io/MindMate/)

MindMate is an **AI Study & Mental Wellness Assistant** built for students. It helps you build a personalized study plan, track your mood, maintain focus, and keep your wellbeing on track — all in one place.

---

## ✨ Features

- 📅 **Smart Planner:** Generate a personalized study timetable based on your subjects, exam date, and available hours.
- 😊 **Mood Tracker:** Log how you're feeling and dynamically adjust your daily study schedule based on your current mood.
- 🤖 **AI Mental Health Chat:** Talk to the MindMate AI companion whenever you're feeling stressed, unmotivated, or need study tips (powered by Google Gemini API).
- ✅ **Progress Bar:** Track your overall study progress at a glance.
- ⏱️ **Focus Timer:** Pomodoro-style timer with 25-minute focus and 5-minute break modes to lock in without distractions.

---

## 🛠️ Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Backend (AI Chat):** Node.js, Express.js
- **AI Integration:** Google Gemini API (`@google/generative-ai`)

---

## 🚀 Installation & Setup

If you want to run MindMate locally, especially to enable the AI Chat backend, follow these steps:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/imaakarsh/MindMate.git
   cd MindMate
   ```

2. **Install Backend Dependencies:**
   ```bash
   npm install
   ```

3. **Set Up Environment Variables:**
   Create a `.env` file in the root directory and add your Google Gemini API key (you can grab an API key from Google AI Studio):
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   PORT=3000
   ```

4. **Start the Backend Server:**
   ```bash
   npm start
   ```
   *The server will start processing AI chat requests on the configured port.*

5. **Open the App:**
   Simply open `index.html` in your web browser or serve it via an extension like Live Server in VS Code to view the frontend.

---

## 👥 Meet the Builders

- **[imaakarsh](https://github.com/imaakarsh)** (Full Stack Developer)
- **[iamsiddharthhh](https://github.com/iamsiddharthhh)** (Frontend Developer)

---

> *"For Students, By Students. Study Smarter, Stay Stress-Free."*
