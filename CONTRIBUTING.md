# Contributing Guide

Thank you for considering contributing to the InterSystems ObjectScript Class Diagram Viewer!

## Development Environment Setup

1. Fork the repository
   - Visit https://github.com/ORGANIZATION/intersystems-objectscript-class-diagram-view
   - Click the "Fork" button in the top right corner

2. Clone your fork
```bash
git clone https://github.com/YOUR-USERNAME/intersystems-objectscript-class-diagram-view
cd intersystems-objectscript-class-diagram-view
```

3. Add upstream remote
```bash
git remote add upstream https://github.com/cjy513203427/intersystems-objectscript-class-diagram-view
```

4. Install dependencies
```bash
npm install
```

5. Open VS Code
```bash
code .
```

## Development Workflow

1. Sync your fork with upstream
```bash
git checkout main
git fetch upstream
git merge upstream/main
git push origin main
```

2. Create a new branch
```bash
git checkout -b feature/your-feature-name
```

3. Make your changes and ensure:
   - Code follows the project's style guide
   - Appropriate tests are added
   - All tests pass
   - Documentation is updated

4. Commit your changes
```bash
git add .
git commit -m "feat: add new feature"
```

5. Push to your fork
```bash
git push origin feature/your-feature-name
```

6. Create Pull Request
   - Go to the original repository
   - Click "New Pull Request"
   - Select your fork and branch
   - Fill in the PR template with appropriate details

## Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification. Please ensure your commit messages follow this format:

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Changes that do not affect code meaning
- `refactor`: Code changes that neither fix a bug nor add a feature
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Changes to build process or auxiliary tools

Examples:
```
feat: add class diagram export functionality
fix: resolve class diagram rendering issue
docs: update installation instructions
```

## Reporting Issues

If you find a bug or have a feature request:

1. Check existing issues to avoid duplicates
2. Create a new issue with:
   - Clear title and description
   - Steps to reproduce (for bugs)
   - Expected vs actual behavior
   - Environment details (VS Code version, OS, etc.)

## Code Review Process

- All code changes require review
- Reviewers will check:
  - Code quality
  - Test coverage
  - Documentation completeness
- Please respond to review comments promptly

## License

By submitting code, you agree to license your contribution under the project's license terms. 