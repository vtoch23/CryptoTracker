import { mount } from '@cypress/react'; 
import '@testing-library/cypress/add-commands';

Cypress.Commands.add('mount', mount);
