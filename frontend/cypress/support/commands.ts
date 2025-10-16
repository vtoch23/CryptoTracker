Cypress.Commands.add('login', (email: string, password: string) => {
  cy.request('POST', '/auth/token', { username: email, password }).then((resp) => {
    window.localStorage.setItem('token', resp.body.access_token);
  });
});
