import { JSDOM } from 'jsdom';
import { expect } from 'chai';

const { document } = (new JSDOM(`<!DOCTYPE html><html><body></body></html>`)).window;

describe('Quiz App Frontend Tests', () => {
    before(() => {
        // Let’s set up our quiz app with a warm welcome!
        document.body.innerHTML = `
            <h1>Welcome to the Quiz App</h1>
            <div>
                <p>What is your favorite color?</p>
                <button id="option1">Option 1</button>
                <button id="option2">Option 2</button>
                <button id="option3">Option 3</button>
                <button id="option4">Option 4</button>
            </div>
        `;
    });

    it('should show the main page with a cheerful greeting', () => {
        const header = document.querySelector('h1');
        expect(header).to.exist;
        expect(header.textContent).to.equal('Welcome to the Quiz App');
    });

    it('should display a question for the user', () => {
        const question = document.querySelector('p');
        expect(question).to.exist;
        expect(question.textContent).to.equal('What is your favorite color?');
    });

    // Add more tests as needed for user interactions, etc.
});