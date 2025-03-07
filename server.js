import express from 'express';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import bodyParser from 'body-parser';
import { randomBytes } from 'crypto';

const app = express();
const port = 3000;

// Custom error handler for more human-like responses
function humanError(message, code) {
  const error = new Error(message);
  error.statusCode = code;
  return error;
}

// Custom middleware for request logging
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${new Date().toLocaleString()}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
    });
    next();
});

app.use(bodyParser.json());
app.use(express.static('public'));

// Helper function to generate unique IDs
function generateId() {
    return randomBytes(8).toString('hex');
}

// Helper function to validate quiz data
function validateQuiz(quiz) {
    // Check for empty title
    if (!quiz.title || typeof quiz.title !== 'string' || quiz.title.trim().length === 0) {
        throw humanError('Quiz title cannot be empty. Please provide a meaningful title.', 400);
    }
    
    // Validate questions array
    if (!Array.isArray(quiz.questions) || quiz.questions.length === 0) {
        throw humanError('A quiz must contain at least one question. Please add some questions.', 400);
    }
    
    // Validate each question
    quiz.questions.forEach((question, index) => {
        if (!question.text || typeof question.text !== 'string' || question.text.trim().length === 0) {
            throw humanError(`Question ${index + 1} text cannot be empty. Please provide a question.`, 400);
        }
        
        if (!Array.isArray(question.options) || question.options.length < 2) {
            throw humanError(`Question ${index + 1} must have at least 2 options. Please add more options.`, 400);
        }
        
        if (typeof question.correctOption !== 'number' || 
            question.correctOption < 0 || 
            question.correctOption >= question.options.length) {
            throw humanError(`Invalid correct option for question ${index + 1}. Please select a valid option.`, 400);
        }
    });
}

// Read JSON file with retry mechanism
async function readJSON(filename, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const data = await readFile(join('data', filename), 'utf8');
            return JSON.parse(data);
        } catch (error) {
            if (i === retries - 1) {
                console.error(`Failed to read ${filename} after ${retries} attempts:`, error);
                return { quizzes: [], results: [] };
            }
            await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, i)));
        }
    }
}

// Write JSON file without backup
async function writeJSON(filename, data) {
    try {
        await writeFile(join('data', filename), JSON.stringify(data, null, 2));
    } catch (error) {
        console.error(`Error writing ${filename}:`, error);
        throw error;
    }
}

// Get all quizzes with optional search and sorting
app.get('/api/quizzes', async (req, res) => {
    try {
        const { search, sort } = req.query;
        const data = await readJSON('quizzes.json');
        let quizzes = data.quizzes;

        // Apply search filter
        if (search) {
            const searchLower = search.toLowerCase();
            quizzes = quizzes.filter(quiz => 
                quiz.title.toLowerCase().includes(searchLower) ||
                quiz.questions.some(q => q.text.toLowerCase().includes(searchLower))
            );
        }

        // Apply sorting
        if (sort) {
            switch (sort) {
                case 'title':
                    quizzes.sort((a, b) => a.title.localeCompare(b.title));
                    break;
                case 'date':
                    quizzes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                    break;
                case 'questions':
                    quizzes.sort((a, b) => b.questions.length - a.questions.length);
                    break;
            }
        }

        res.json(quizzes);
    } catch (error) {
        console.error('Error fetching quizzes:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create new quiz with validation
app.post('/api/quizzes', async (req, res) => {
    try {
        validateQuiz(req.body);
        const data = await readJSON('quizzes.json');
        const newQuiz = {
            id: generateId(),
            ...req.body,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        data.quizzes.push(newQuiz);
        await writeJSON('quizzes.json', data);
        res.status(201).json(newQuiz);
    } catch (error) {
        if (error.statusCode) {
            res.status(error.statusCode).json({ error: error.message });
        } else {
            console.error('Error creating quiz:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

// Delete quiz by ID with cascade delete
app.delete('/api/quizzes/:quizId', async (req, res) => {
    try {
        const { quizId } = req.params;
        const data = await readJSON('quizzes.json');
        
        const quizIndex = data.quizzes.findIndex(quiz => quiz.id === quizId);
        if (quizIndex === -1) {
            throw humanError('Quiz not found', 404);
        }

        // Remove quiz
        const deletedQuiz = data.quizzes.splice(quizIndex, 1)[0];
        await writeJSON('quizzes.json', data);
        
        // Remove associated results
        const resultsData = await readJSON('results.json');
        const initialResultsCount = resultsData.results.length;
        resultsData.results = resultsData.results.filter(result => result.quizId !== quizId);
        const deletedResults = initialResultsCount - resultsData.results.length;
        await writeJSON('results.json', resultsData);
        
        res.json({ 
            message: 'Quiz deleted successfully',
            deletedQuiz,
            deletedResults
        });
    } catch (error) {
        if (error.statusCode) {
            res.status(error.statusCode).json({ error: error.message });
        } else {
            console.error('Error deleting quiz:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

// Update quiz by ID with validation
app.put('/api/quizzes/:quizId', async (req, res) => {
    try {
        const { quizId } = req.params;
        validateQuiz(req.body);
        
        const data = await readJSON('quizzes.json');
        const quizIndex = data.quizzes.findIndex(quiz => quiz.id === quizId);
        if (quizIndex === -1) {
            throw humanError('Quiz not found', 404);
        }

        const updatedQuiz = {
            ...data.quizzes[quizIndex],
            ...req.body,
            id: quizId, // Prevent ID from being changed
            createdAt: data.quizzes[quizIndex].createdAt, // Preserve creation date
            updatedAt: new Date().toISOString()
        };

        data.quizzes[quizIndex] = updatedQuiz;
        await writeJSON('quizzes.json', data);
        res.json(updatedQuiz);
    } catch (error) {
        if (error.statusCode) {
            res.status(error.statusCode).json({ error: error.message });
        } else {
            console.error('Error updating quiz:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

// Submit quiz attempt with detailed feedback
app.post('/api/submit/:quizId', async (req, res) => {
    try {
        const { quizId } = req.params;
        const { studentName, answers } = req.body;
        
        if (!studentName || typeof studentName !== 'string' || studentName.trim().length === 0) {
            throw humanError('Student name is required', 400);
        }
        
        if (!Array.isArray(answers)) {
            throw humanError('Answers must be an array', 400);
        }
        
        const quizData = await readJSON('quizzes.json');
        const quiz = quizData.quizzes.find(q => q.id === quizId);
        
        if (!quiz) {
            throw humanError('Quiz not found', 404);
        }
        
        if (answers.length !== quiz.questions.length) {
            throw humanError('Number of answers does not match number of questions', 400);
        }
        
        let score = 0;
        const questionResults = quiz.questions.map((question, index) => {
            const isCorrect = answers[index] === question.correctOption;
            if (isCorrect) score++;
            return {
                questionText: question.text,
                userAnswer: question.options[answers[index]],
                correctAnswer: question.options[question.correctOption],
                isCorrect
            };
        });
        
        const result = {
            id: generateId(),
            quizId,
            quizTitle: quiz.title,
            studentName,
            score,
            totalQuestions: quiz.questions.length,
            percentage: (score / quiz.questions.length) * 100,
            questionResults,
            submittedAt: new Date().toISOString()
        };
        
        const resultsData = await readJSON('results.json');
        resultsData.results.push(result);
        await writeJSON('results.json', resultsData);
        
        res.json(result);
    } catch (error) {
        if (error.statusCode) {
            res.status(error.statusCode).json({ error: error.message });
        } else {
            console.error('Error submitting quiz:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

// Get quiz results with statistics
app.get('/api/results/:quizId', async (req, res) => {
    try {
        const { quizId } = req.params;
        const data = await readJSON('results.json');
        const quizResults = data.results.filter(r => r.quizId === quizId);
        
        if (quizResults.length === 0) {
            return res.json({
                results: [],
                stats: {
                    totalAttempts: 0,
                    averageScore: 0,
                    highestScore: 0,
                    lowestScore: 0
                }
            });
        }

        const stats = {
            totalAttempts: quizResults.length,
            averageScore: quizResults.reduce((acc, r) => acc + r.percentage, 0) / quizResults.length,
            highestScore: Math.max(...quizResults.map(r => r.percentage)),
            lowestScore: Math.min(...quizResults.map(r => r.percentage))
        };

        res.json({
            results: quizResults,
            stats
        });
    } catch (error) {
        console.error('Error fetching results:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete result by ID
app.delete('/api/results/:resultId', async (req, res) => {
    try {
        const { resultId } = req.params;
        const data = await readJSON('results.json');
        
        const resultIndex = data.results.findIndex(result => result.id === resultId);
        if (resultIndex === -1) {
            throw humanError('Result not found', 404);
        }

        const deletedResult = data.results.splice(resultIndex, 1)[0];
        await writeJSON('results.json', data);
        res.json({ 
            message: 'Result deleted successfully',
            deletedResult
        });
    } catch (error) {
        if (error.statusCode) {
            res.status(error.statusCode).json({ error: error.message });
        } else {
            console.error('Error deleting result:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`API Documentation available at http://localhost:${port}/docs`);
});