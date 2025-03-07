import express from 'express';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import bodyParser from 'body-parser';

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static('public'));

// Read JSON file
async function readJSON(filename) {
    try {
        const data = await readFile(join('data', filename), 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return { quizzes: [], results: [] };
    }
}

// Write JSON file
async function writeJSON(filename, data) {
    await writeFile(join('data', filename), JSON.stringify(data, null, 2));
}

// Get all quizzes
app.get('/api/quizzes', async (req, res) => {
    const data = await readJSON('quizzes.json');
    res.json(data.quizzes);
});

// Create new quiz
app.post('/api/quizzes', async (req, res) => {
    const data = await readJSON('quizzes.json');
    const newQuiz = {
        id: Date.now().toString(),
        ...req.body,
        createdAt: new Date().toISOString()
    };
    
    data.quizzes.push(newQuiz);
    await writeJSON('quizzes.json', data);
    res.json(newQuiz);
});

// Delete quiz by ID
app.delete('/api/quizzes/:quizId', async (req, res) => {
    const { quizId } = req.params;
    const data = await readJSON('quizzes.json');
    
    const quizIndex = data.quizzes.findIndex(quiz => quiz.id === quizId);
    if (quizIndex === -1) {
        return res.status(404).json({ error: 'Quiz not found' });
    }

    data.quizzes.splice(quizIndex, 1);
    await writeJSON('quizzes.json', data);
    
    // Also delete associated results
    const resultsData = await readJSON('results.json');
    resultsData.results = resultsData.results.filter(result => result.quizId !== quizId);
    await writeJSON('results.json', resultsData);
    
    res.json({ message: 'Quiz and associated results deleted successfully' });
});

// Update quiz by ID
app.put('/api/quizzes/:quizId', async (req, res) => {
    const { quizId } = req.params;
    const updatedQuiz = req.body;
    
    const data = await readJSON('quizzes.json');
    const quizIndex = data.quizzes.findIndex(quiz => quiz.id === quizId);
    if (quizIndex === -1) {
        return res.status(404).json({ error: 'Quiz not found' });
    }

    data.quizzes[quizIndex] = {
        ...data.quizzes[quizIndex],
        ...updatedQuiz,
        updatedAt: new Date().toISOString()
    };

    await writeJSON('quizzes.json', data);
    res.json(data.quizzes[quizIndex]);
});

// Submit quiz attempt
app.post('/api/submit/:quizId', async (req, res) => {
    const { quizId } = req.params;
    const { studentName, answers } = req.body;
    
    const quizData = await readJSON('quizzes.json');
    const quiz = quizData.quizzes.find(q => q.id === quizId);
    
    if (!quiz) {
        return res.status(404).json({ error: 'Quiz not found' });
    }
    
    let score = 0;
    quiz.questions.forEach((question, index) => {
        if (answers[index] === question.correctOption) {
            score++;
        }
    });
    
    const result = {
        id: Date.now().toString(),
        quizId,
        studentName,
        score,
        totalQuestions: quiz.questions.length,
        submittedAt: new Date().toISOString()
    };
    
    const resultsData = await readJSON('results.json');
    resultsData.results.push(result);
    await writeJSON('results.json', resultsData);
    
    res.json(result);
});

// Get quiz results
app.get('/api/results/:quizId', async (req, res) => {
    const { quizId } = req.params;
    const data = await readJSON('results.json');
    const quizResults = data.results.filter(r => r.quizId === quizId);
    res.json(quizResults);
});

// Delete result by ID
app.delete('/api/results/:resultId', async (req, res) => {
    const { resultId } = req.params;
    const data = await readJSON('results.json');
    
    const resultIndex = data.results.findIndex(result => result.id === resultId);
    if (resultIndex === -1) {
        return res.status(404).json({ error: 'Result not found' });
    }

    data.results.splice(resultIndex, 1);
    await writeJSON('results.json', data);
    res.json({ message: 'Result deleted successfully' });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});