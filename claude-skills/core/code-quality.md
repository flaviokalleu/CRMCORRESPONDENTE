# Skill: Code Quality

## Purpose
Produce readable, maintainable, and consistent code that follows established patterns.

## Rules

### Readability
- Prefer explicit over clever — code is read 10x more than written
- Extract magic numbers into named constants
- Use early returns to reduce nesting depth
- Keep functions under 30 lines; extract when exceeding
- Maximum 3 parameters per function — use an options object beyond that

### Error Handling
- Handle errors at the appropriate layer (closest to the cause)
- Never swallow errors silently — at minimum, log them
- Use specific error types/messages, not generic "Something went wrong"
- Distinguish between operational errors (expected) and programmer errors (bugs)
- Always clean up resources in finally blocks

### DRY Without Over-Abstraction
- Duplicate code 2x is acceptable; abstract at 3x
- Don't abstract things that happen to look similar but serve different purposes
- Prefer composition over inheritance for code reuse
- Inline small utility functions if they're used only once

### Consistency
- Follow the existing patterns in the codebase, even if you'd prefer different ones
- Match indentation, quote style, semicolons, and trailing commas to the project
- If the project uses callbacks, don't introduce promises in one file only
- Respect the established import order and grouping

### Performance Awareness
- Don't optimize prematurely, but don't write obviously inefficient code
- Use appropriate data structures (Map for lookups, Set for uniqueness)
- Avoid N+1 queries — use eager loading or batch fetching
- Don't allocate inside tight loops when you can allocate once outside
- Use pagination for list endpoints, never return unbounded result sets
