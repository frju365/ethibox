import jwt from 'jsonwebtoken';

describe('Login Page', () => {
    it('Check title page', () => {
        cy.visit('/');
        cy.title().should('eq', 'Ethibox - Host your websites effortlessly');
    });

    it('Sign in', () => {
        cy.server();
        const token = jwt.sign({ email: 'contact@ethibox.fr' }, 'mysecret', { expiresIn: '1d' });
        cy.route('POST', '**/api/login', { success: true, message: 'Login succeeded', token });
        cy.route('GET', '**/api/applications', { success: true, apps: [] });

        cy.visit('/login', { onBeforeLoad: (win) => { win.fetch = null; } });
        cy.get('input[name="email"]').type('contact@ethibox.fr');
        cy.get('input[name="password"]').type('myp@ssw0rd{enter}');
        cy.get('.sub.header').contains('Liste des applications');
    });

    it.skip('Bad password', () => {
        // TODO
    });

    it('Logout', () => {
        const token = jwt.sign({ email: 'contact@ethibox.fr' }, 'mysecret', { expiresIn: '1d' });
        cy.visit('/', { onBeforeLoad: (win) => { win.fetch = null; win.localStorage.setItem('token', token); } });
        cy.get('.sidebar a:last-child').click({ force: true });
        cy.get('.sub.header').contains('Host your websites effortlessly');
    });

    it('Bad token', () => {
        const token = jwt.sign({ email: 'contact@ethibox.fr' }, 'badsecret', { expiresIn: '1d' });
        cy.visit('/', { onBeforeLoad: (win) => { win.fetch = null; win.localStorage.setItem('token', token); } });
        cy.reload();
        cy.get('.sub.header').contains('Host your websites effortlessly');
    });

    it('Token expired', () => {
        const token = jwt.sign({ email: 'contact@ethibox.fr' }, 'mysecret', { expiresIn: 2 });
        cy.visit('/', { onBeforeLoad: (win) => { win.fetch = null; win.localStorage.setItem('token', token); } });
        cy.wait(3000);
        cy.visit('/', { onBeforeLoad: (win) => { win.fetch = null; win.localStorage.setItem('token', token); } });
        cy.get('.sub.header').contains('Host your websites effortlessly');
    });
});
