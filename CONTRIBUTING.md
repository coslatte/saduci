# Contributing to SADECI-Core

Thank you for your interest in contributing to SADECI-Core! This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/sadeci-core.git`
3. Create a feature branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test your changes
6. Commit and push
7. Create a Pull Request

## Development Setup

### Prerequisites

- Docker and Docker Compose
- Python 3.11+
- Git

### Local Development

1. **Set up the environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

2. **Start services**
   ```bash
   docker compose up --build
   ```

3. **Run tests**
   ```bash
   ./test_api.sh
   ```

### Working on a Specific Service

To work on a specific service without Docker:

1. **Set up virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies**
   ```bash
   cd services/patient  # or any other service
   pip install -r requirements.txt
   ```

3. **Run the service**
   ```bash
   python main.py
   ```

## Code Style

### Python

- Follow PEP 8 style guide
- Use type hints where appropriate
- Keep functions focused and small
- Write docstrings for all public functions and classes

Example:
```python
def create_patient(patient: PatientCreate, db: Session) -> Patient:
    """
    Create a new patient in the database.
    
    Args:
        patient: Patient data from request
        db: Database session
        
    Returns:
        Created patient object
        
    Raises:
        HTTPException: If patient_id already exists
    """
    # Implementation
```

### Documentation

- Update README.md for major features
- Update API_DOCUMENTATION.md for API changes
- Add inline comments for complex logic
- Keep documentation in sync with code

## Testing

### Manual Testing

Use the provided test script:
```bash
./test_api.sh
```

### Adding Tests

When adding new features:

1. Add test cases to `test_api.sh`
2. Test all error cases
3. Verify health checks work
4. Test inter-service communication

## Database Migrations

When changing database models:

1. **Create a migration**
   ```bash
   cd services/patient
   alembic revision --autogenerate -m "Description of changes"
   ```

2. **Review the migration file**
   - Check in `alembic/versions/`
   - Verify upgrade and downgrade functions

3. **Test the migration**
   ```bash
   alembic upgrade head
   alembic downgrade -1
   alembic upgrade head
   ```

4. **Commit the migration file**

## Adding a New Service

To add a new microservice:

1. **Create service directory**
   ```bash
   mkdir -p services/new-service
   ```

2. **Create service files**
   - `main.py` - FastAPI application
   - `requirements.txt` - Dependencies
   - `Dockerfile` - Container configuration
   - `.env.example` - Environment variables

3. **Add to docker-compose.yml**
   - Add service definition
   - Add database if needed
   - Configure networking

4. **Update documentation**
   - Add to README.md
   - Add API docs

5. **Add health check**
   ```python
   @app.get("/health")
   async def health_check():
       return {"status": "healthy", "service": "new-service"}
   ```

## Adding New ML Models

To add a new prediction model:

1. **Update the model registry** in `services/prediction/main.py`
2. **Add model class** with `predict()` method
3. **Update API documentation**
4. **Add test cases**

## Commit Guidelines

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(patient): add CSV import functionality

Added endpoint to import patient data from CSV files.
Supports bulk upload with error handling.

Closes #123
```

```
fix(prediction): correct mortality risk calculation

The age coefficient was too high, causing overestimation.
Adjusted to match clinical guidelines.
```

## Pull Request Process

1. **Update documentation** if needed
2. **Add tests** for new functionality
3. **Run all tests** and ensure they pass
4. **Update CHANGELOG** if applicable
5. **Create PR** with clear description
6. **Link related issues**
7. **Wait for review**

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] All tests pass
- [ ] Added new tests
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
- [ ] Tests added/updated
```

## Code Review

All PRs require review before merging:

- Code must follow style guidelines
- Tests must pass
- Documentation must be updated
- No security vulnerabilities

## Security

### Reporting Security Issues

Do not open public issues for security vulnerabilities.
Email security concerns to the maintainers.

### Security Best Practices

- Never commit secrets or credentials
- Use environment variables for sensitive data
- Validate all user input
- Use parameterized queries
- Keep dependencies updated
- Follow OWASP guidelines

## Questions?

- Open an issue for questions
- Join our community discussions
- Check existing documentation

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.
