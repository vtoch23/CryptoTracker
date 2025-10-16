# CryptoTracker Frontend

This is the React frontend for CryptoTracker, using:

- **React 18**
- **Vite**
- **TypeScript**
- **Zustand** for state management
- **React Router v6**
- **Storybook** for component development
- **Cypress** for E2E and component testing

---

## Running the App Locally

### 1. Start the backend

Make sure backend, Celery, RabbitMQ (port `5433`) and database are running in Docker.

cd ../backend
docker compose up -d  # or your existing command

## 2. Start the frontend

cd frontend
npm install
npm run dev


## 3. Start Storybook

Start Storybook (for components):
npm run storybook


Build Storybook for deployment:
npm run build-storybook

Storybook runs on http://localhost:6006

## 4. Start Cypress
Open Cypress Test Runner (E2E)
npx cypress open


Use the e2e folder for integration tests.

Use the component folder for React component testing.

Run all Cypress tests headlessly
npx cypress run