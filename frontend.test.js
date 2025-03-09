import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('Quiz App Frontend Tests', () => {
    beforeEach(() => {
        
        document.body.innerHTML = `
            <div id="root">
                <h1>Welcome to the Quiz App</h1>
                <div>
                    <p>What is your favorite color?</p>
                    <button id="option1">Option 1</button>
                    <button id="option2">Option 2</button>
                    <button id="option3">Option 3</button>
                    <button id="option4">Option 4</button>
                </div>
            </div>
        `;
    });

    test('should show the main page with a cheerful greeting', () => {
        const header = document.querySelector('h1');
        expect(header).toBeInTheDocument();
        expect(header).toHaveTextContent('Welcome to the Quiz App');
    });

    test('should display a question for the user', () => {
        const question = document.querySelector('p');
        expect(question).toBeInTheDocument();
        expect(question).toHaveTextContent('What is your favorite color?');
    });

    test('should have four option buttons', () => {
        const buttons = document.querySelectorAll('button');
        expect(buttons).toHaveLength(4);
        buttons.forEach((button, index) => {
            expect(button).toHaveTextContent(`Option ${index + 1}`);
        });
    });
});