const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Enable CORS for your frontend
app.use(cors({
  origin: 'http://localhost:5173' // Your Vite frontend URL
}));

app.use(express.json());

// Proxy endpoint for Gemini API
app.post('/api/generate-quiz', async (req, res) => {
  try {
    const { apiKey, contents } = req.body;
    
    // Initialize the Gemini AI with the provided API key
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash"
    });

    // Extract the prompt from the contents
    const prompt = contents[0].parts[0].text;

    // Generate content
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({
      candidates: [{
        content: {
          parts: [{
            text: text
          }]
        }
      }]
    });
  } catch (error) {
    console.error('Error calling Gemini API:', error.message);
    res.status(500).json({
      error: {
        message: error.message || 'Failed to generate quiz'
      }
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 