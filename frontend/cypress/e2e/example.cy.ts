describe('Example Test', () => {
  it('Visits the app', () => {
    cy.visit('/');
    cy.contains('CryptoTracker');
  });
});
