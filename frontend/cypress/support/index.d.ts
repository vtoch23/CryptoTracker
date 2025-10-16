/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable<Subject = any> {
    mount: typeof import('@cypress/react').mount;
    login(email: string, password: string): Chainable<void>;
  }
}
