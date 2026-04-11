# Skill: State Management

## Purpose
Manage application state predictably with clear data flow patterns.

## Rules

### State Categories
- **Local state**: Component-specific UI state (open/closed, form values) -> `useState`
- **Shared state**: State needed by sibling components -> lift to common parent
- **Global state**: App-wide state (auth, theme, notifications) -> Context
- **Server state**: Data from the API -> fetch on mount, cache, revalidate
- **URL state**: Filters, pagination, search -> query parameters

### Context Pattern
```jsx
// context/AuthContext.jsx
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = useCallback(async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    localStorage.setItem('authToken', response.data.token);
    setUser(response.data.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout }),
    [user, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

### Rules
- Split contexts by update frequency — auth and theme should not share a context
- Memoize context values to prevent unnecessary re-renders
- Custom hook wrapper for each context (provides better error messages)
- Don't store derived data in state — compute it during render
- Use `useReducer` when state transitions depend on previous state

### Data Fetching
- Fetch in `useEffect` on mount, with cleanup to prevent state updates on unmounted components
- Show loading skeleton during fetch, error state on failure
- Implement optimistic updates for better UX on mutations
- Debounce search/filter inputs before fetching (300ms)
- Cache API responses when data doesn't change frequently

### Form State
- Use controlled components for forms that need validation
- Validate on blur for individual fields, on submit for the whole form
- Disable submit button during submission
- Show inline error messages below the relevant field
- Reset form state after successful submission
