# Skill: React Patterns

## Purpose
Write maintainable, performant React components following modern best practices.

## Rules

### Component Design
- Use functional components with hooks exclusively — no class components
- One component per file, named same as the file
- Keep components under 200 lines — extract sub-components when exceeding
- Separate container (logic) from presentational (UI) concerns
- Define sub-components outside the parent render function to prevent remounting

### Hooks
- Call hooks at the top level only — never inside conditions or loops
- Custom hooks for reusable logic: `useAuth`, `usePagination`, `useDebounce`
- Use `useCallback` for functions passed as props to child components
- Use `useMemo` for expensive computations, not for simple values
- Use `useRef` for values that shouldn't trigger re-renders (timers, previous values)
- Clean up effects: return a cleanup function from `useEffect`

### State Management
- Keep state as close as possible to where it's used
- Lift state up only when siblings need to share it
- Use Context for truly global state (auth, theme, locale)
- Don't put everything in Context — it causes full subtree re-renders
- Use `useReducer` for complex state with multiple related values

### Props
- Destructure props in the function signature
- Use default values in destructuring, not defaultProps
- Prefer specific props over passing entire objects
- Boolean props: `<Modal open />` not `<Modal open={true} />`
- Limit prop drilling to 2 levels — beyond that, use Context or composition

### Conditional Rendering
```jsx
// Short-circuit for simple show/hide
{isLoading && <Spinner />}

// Ternary for two states
{error ? <ErrorDisplay error={error} /> : <DataTable data={data} />}

// Early return for guard clauses
if (!user) return <LoginPrompt />;
```

### Lists
- Always provide a stable, unique `key` prop — never use array index
- Extract list items into their own component for readability
- Use virtualization (react-window) for lists over 100 items

### Effects
- Each effect should have a single responsibility
- Include all dependencies in the dependency array
- Use refs instead of adding functions like `navigate` or `logout` to dep arrays
- Avoid effects for data transformation — compute during render instead
- Use effects only for synchronization with external systems
