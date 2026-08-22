# Contributing to pixiball.js

Thank you for your interest in contributing to our project! This guide will help you get started with the development process.

## Development Setup

### Prerequisites

- Node.js 22.18 or newer
- npm

### Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/pixiball/pixiball.js.git`
3. Navigate to the project directory: `cd pixiball.js`
4. Install dependencies: `npm install`
5. Start development: `npm run dev`

## Project Layout

- `src/runtime.ts` - the Node.js environment the headless host runs in (WebSocket, WebRTC, proxy, and the browser globals the host page expects)
- `src/types.ts` - the typings of the Headless Host API
- `src/generated/headless.ts` - the PixiBall headless host bundle, wrapped so it can be evaluated in Node.js
- `scripts/update-headless.ts` - regenerates the file above from https://www.pixiball.com/headless-min.js

Never edit `src/generated/headless.ts` by hand, run `npm run update:headless` instead. Point
`PIXIBALL_HEADLESS_URL` at another URL (a `file:` URL works too) to generate it from your own
PixiBall deployment.

## Development Workflow

1. Create a new branch: `git checkout -b feature/your-feature-name`
2. Make your changes
3. Check and fix code style and formatting issues: `npm run lint:fix`
4. Run tests: `npm test`
5. Build the project: `npm run build`
6. Commit your changes using the conventions below
7. Push your branch to your fork
8. Open a pull request

Tests that open a real room need a room token from https://www.pixiball.com/headlesstoken in
`TEST_PB_HEADLESS_TOKEN` (a `.env` file works), they are skipped without one.

## Commit Message Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/) for clear and structured commit messages:

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code changes that neither fix bugs nor add features
- `perf:` Performance improvements
- `test:` Adding or updating tests
- `chore:` Maintenance tasks, dependencies, etc.

## Pull Request Guidelines

1. Update documentation if needed
2. Ensure all tests pass
3. Address any feedback from code reviews
4. Once approved, your PR will be merged

## Code of Conduct

Please be respectful and constructive in all interactions within our community.

## Questions?

If you have any questions, please [open an issue](https://github.com/pixiball/pixiball.js/issues/new) for discussion.

Thank you for contributing to pixiball.js!
