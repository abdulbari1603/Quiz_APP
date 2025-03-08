import * as chai from 'chai';
import chaiHttp from 'chai-http';
import request from 'supertest';
import app from './server.js';  
import fs from 'fs'; 

chai.use(chaiHttp);

describe('Quiz API Tests', () => {
    beforeEach(async () => {
        // Reset quiz state before each test
        await request(app).post('/api/reset');
    });

    it('GET /api/questions/current should return current question', async () => {
        const res = await request(app).get('/api/questions/current');
        chai.expect(res.status).to.equal(200);
        chai.expect(res.body).to.have.property('question');
        chai.expect(res.body).to.have.property('options');
    });

    it('POST /api/questions/answer should validate answer', async () => {
        const questionRes = await request(app).get('/api/questions/current');
        const correctOption = questionRes.body.correctOption; // Ensure this is correctly defined
        const answerRes = await request(app)
            .post('/api/questions/answer')
            .send({ selectedOption: correctOption }); // Use the correct option
    
        chai.expect(answerRes.status).to.equal(200);
        chai.expect(answerRes.body).to.have.property('correct', true);
    });

    it('POST /api/quizzes should create a new quiz', async () => {
        const newQuiz = { title: 'New Quiz', questions: [{ text: 'What is your favorite color?', options: ['Red', 'Blue', 'Green', 'Yellow'], correctOption: 1 }] };
        const response = await request(app)
            .post('/api/quizzes')
            .send(newQuiz);
        chai.expect(response.status).to.equal(201);
        chai.expect(response.body).to.have.property('id');
    });

    it('GET /api/quizzes/:quizId should retrieve the quiz', async () => {
        const newQuiz = { title: 'New Quiz', questions: [{ text: 'What is your favorite color?', options: ['Red', 'Blue', 'Green', 'Yellow'], correctOption: 1 }] };
        const response = await request(app)
            .post('/api/quizzes')
            .send(newQuiz);
        const quizId = response.body.id; // Ensure the quiz is created successfully
        const getResponse = await request(app)
            .get(`/api/quizzes/${quizId}`);
        chai.expect(getResponse.status).to.equal(200);
        chai.expect(getResponse.body).to.have.property('id', quizId);
    });

    it('PUT /api/quizzes/:quizId should update the quiz', async () => {
        const newQuiz = { title: 'New Quiz', questions: [{ text: 'What is your favorite color?', options: ['Red', 'Blue', 'Green', 'Yellow'], correctOption: 1 }] };
        const response = await request(app)
            .post('/api/quizzes')
            .send(newQuiz);
        const quizId = response.body.id;
        const updatedQuiz = { title: 'Updated Quiz', questions: [{ text: 'Updated Question?', options: ['Option 1', 'Option 2'], correctOption: 0 }] };
        const updateResponse = await request(app)
            .put(`/api/quizzes/${quizId}`)
            .send(updatedQuiz);
        chai.expect(updateResponse.status).to.equal(200);
        chai.expect(updateResponse.body.title).to.equal('Updated Quiz');
    });

    it('DELETE /api/quizzes/:quizId should delete the quiz', async () => {
        const newQuiz = { title: 'New Quiz', questions: [{ text: 'What is your favorite color?', options: ['Red', 'Blue', 'Green', 'Yellow'], correctOption: 1 }] };
        const response = await request(app)
            .post('/api/quizzes')
            .send(newQuiz);
        const quizId = response.body.id;
        const deleteResponse = await request(app)
            .delete(`/api/quizzes/${quizId}`);
        chai.expect(deleteResponse.status).to.equal(200);
        chai.expect(deleteResponse.body.message).to.equal('Quiz deleted successfully');
    });
});