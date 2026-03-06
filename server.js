require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Default to catching all other GET requests to serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Setup Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const systemInstruction = `You are MindMate, an AI assistant designed to help students with study stress, focus issues, exam anxiety, and productivity. Provide supportive, practical, and short advice. If a student seems stressed, suggest simple techniques like breathing exercises, time management, or study methods.
            
Your response MUST be a valid JSON object matching this structure:
{
  "reply": "Your response text directly talking to the user.",
  "mood": "Stress, Anxiety, Confusion, Motivation, or Normal",
  "action": "A short suggested action (e.g. 'Pomodoro technique', 'Breathing exercise', 'Take a 5 min break') or null if not applicable"
}`;

const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: systemInstruction,
    generationConfig: {
        responseMimeType: "application/json",
    }
});

// Chat API Endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { messages } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Invalid messages format' });
        }

        // Convert messages to Gemini format (history)
        const history = messages.slice(0, -1).map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));

        const currentMessage = messages[messages.length - 1].content;

        const chat = model.startChat({
            history: history
        });

        const response = await chat.sendMessage(currentMessage);
        const replyContent = response.response.text();
        const parsedReply = JSON.parse(replyContent);

        res.json(parsedReply);
    } catch (error) {
        console.error("Gemini API error:", error);
        res.status(500).json({ error: 'Failed to process chat request. Please check your API key and try again.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
    console.log(`Press Ctrl+C to stop.`);
});
