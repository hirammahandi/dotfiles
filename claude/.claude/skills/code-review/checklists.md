# Code Review Checklists

Reference checklists for review agents. Each agent should focus on its domain-specific checklist.

## 1. Code Quality

- [ ] Single responsibility per function/class
- [ ] Meaningful variable/function names
- [ ] No magic numbers/strings
- [ ] DRY (Don't Repeat Yourself)
- [ ] KISS (Keep It Simple, Stupid)
- [ ] YAGNI (You Aren't Gonna Need It)
- [ ] Cyclomatic complexity <= 10
- [ ] Function length <= 50 lines

## 2. Architecture & Design

- [ ] Appropriate design patterns used
- [ ] Clear domain boundaries
- [ ] Proper separation of concerns
- [ ] Consistent with codebase architecture
- [ ] No over-engineering
- [ ] Scalability considerations addressed

## 3. Testing

- [ ] All public APIs tested
- [ ] Edge cases covered
- [ ] Error scenarios tested
- [ ] Performance tests for critical paths
- [ ] Tests are readable and maintainable
- [ ] No test interdependencies
- [ ] Coverage >= 80%

## 4. Security

- [ ] All inputs sanitized/validated
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] Proper authentication/authorization
- [ ] No hardcoded credentials
- [ ] Secure session handling
- [ ] Principle of least privilege

## 5. Performance

- [ ] No N+1 queries
- [ ] Proper database indexing
- [ ] Efficient algorithms
- [ ] Appropriate caching strategies
- [ ] Memory leaks prevented
- [ ] Resources properly cleaned up
- [ ] No blocking operations
- [ ] Bundle size impact minimal

## 6. Documentation

- [ ] Public APIs documented (JSDoc/TSDoc)
- [ ] Complex logic explained
- [ ] Examples provided
- [ ] Edge cases noted
- [ ] README updated if needed
- [ ] Architecture diagrams current
- [ ] Breaking changes documented

## 7. User Experience (Frontend)

- [ ] Responsive design
- [ ] Accessibility (WCAG 2.1 AA)
- [ ] Loading states
- [ ] Error messages helpful
- [ ] Consistent styling
- [ ] Optimistic updates
- [ ] Smooth animations
- [ ] Progressive enhancement
