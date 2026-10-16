# Code Review Decision Matrix

Use this matrix to determine the final recommendation after synthesizing all agent findings.

## Decision Criteria

### APPROVE if:
- Zero Critical issues (confidence >= 90)
- Zero High security issues
- Test coverage adequate (>80%)
- No blocking architectural concerns
- All findings are Medium/Low priority only

### REQUEST CHANGES if:
- Any Critical issues present (confidence >= 90)
- High security vulnerabilities found
- Significant test coverage gaps (<60%)
- Major architectural violations
- Silent failure patterns detected

### COMMENT ONLY if:
- Only Medium/Low issues found
- Recommendations for improvement (not blocking)
- Optional optimizations suggested
- Minor documentation gaps
