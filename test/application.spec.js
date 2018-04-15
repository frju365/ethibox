import jwt from 'jsonwebtoken';

describe('Applications Page', () => {
    it('List charts', () => {
        cy.server();
        cy.route('GET', '**/api/applications', { success: true, apps: [] });

        const token = jwt.sign({ email: 'contact@ethibox.fr' }, 'mysecret', { expiresIn: '1d' });
        cy.visit('/', { onBeforeLoad: (win) => { win.fetch = null; win.localStorage.setItem('token', token); } });
        cy.get('.cards .card:first-child .header').contains('etherpad');
    });

    it('List user applications', () => {
        cy.server();
        cy.route('GET', '**/api/applications', {
            success: true,
            apps: [{ name: 'etherpad', releaseName: 'myapp', category: 'Editor', email: '33df40b4ea16ce871e5e00b990bb75ea049b78cb', port: 30346, state: 'running' }],
        }).as('GetApps');

        const token = jwt.sign({ email: 'contact@ethibox.fr' }, 'mysecret', { expiresIn: '1d' });
        cy.visit('/', { onBeforeLoad: (win) => { win.fetch = null; win.localStorage.setItem('token', token); } });
        cy.wait('@GetApps');
        cy.get('.dimmer').not('.active');
        cy.get('.cards .card:first-child .header').contains('myapp');
    });

    it('Install application', () => {
        cy.server();
        cy.route('POST', '**/api/applications', { success: true, message: 'Application installed' });
        cy.route('GET', '**/api/applications', { success: true, apps: [] });

        const token = jwt.sign({ email: 'contact@ethibox.fr' }, 'mysecret', { expiresIn: '1d' });
        cy.visit('/', { onBeforeLoad: (win) => { win.fetch = null; win.localStorage.setItem('token', token); } });
        cy.get('.cards .card:first-child .buttons').click();
        cy.get('.cards .card:first-child input').type('myapp{enter}');
    });

    it('Uninstall application', () => {
        cy.server();
        cy.route('GET', '**/api/applications', {
            success: true,
            apps: [{ name: 'etherpad', releaseName: 'myapp', category: 'Editor', email: '33df40b4ea16ce871e5e00b990bb75ea049b78cb', port: 30346, state: 'running' }],
        }).as('GetApps');
        cy.route('DELETE', '**/api/applications/myapp', { success: true, message: 'Application installed' });

        const token = jwt.sign({ email: 'contact@ethibox.fr' }, 'mysecret', { expiresIn: '1d' });
        cy.visit('/', { onBeforeLoad: (win) => { win.fetch = null; win.localStorage.setItem('token', token); } });
        cy.wait('@GetApps');
        cy.get('.dimmer').not('.active');
        cy.get('.cards .card:first-child .header').contains('myapp');
        cy.get('.cards .card:first-child .buttons .button:first-child').click();
        cy.get('.modal .button:nth-child(2)').click();
    });

    it('Edit domain', () => {
        cy.server();
        cy.route('GET', '**/api/applications', {
            success: true,
            apps: [{ name: 'etherpad', releaseName: 'myapp', category: 'Editor', email: '33df40b4ea16ce871e5e00b990bb75ea049b78cb', port: 30346, state: 'running' }],
        }).as('GetApps');
        cy.route('PUT', '**/api/applications/myapp', { success: true, message: 'Application edited' });

        const token = jwt.sign({ email: 'contact@ethibox.fr' }, 'mysecret', { expiresIn: '1d' });
        cy.visit('/', { onBeforeLoad: (win) => { win.fetch = null; win.localStorage.setItem('token', token); } });
        cy.get('.cards .card:first-child .buttons .button.dropdown').click();
        cy.get('.cards .card:first-child .menu .item').click();
        cy.get('.cards .card:first-child input').type('domain.fr{enter}');
    });
});
