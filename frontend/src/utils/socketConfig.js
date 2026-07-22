const trimTrailingSlash = (value = '') => value.replace(/\/+$/, '');

const toSocketOrigin = (value) => {
  if (!value) return null;

  const normalized = trimTrailingSlash(value);
  if (!normalized) return null;

  if (normalized.startsWith('ws://')) return normalized.replace(/^ws:/i, 'http:');
  if (normalized.startsWith('wss://')) return normalized.replace(/^wss:/i, 'https:');

  return normalized;
};

export const getSocketUrl = () => {
  const configuredUrl =
    import.meta.env.VITE_SOCKET_URL ||
    import.meta.env.VITE_WS_URL ||
    import.meta.env.VITE_API_URL;

  const resolvedConfiguredUrl = toSocketOrigin(configuredUrl);
  if (resolvedConfiguredUrl) {
    return resolvedConfiguredUrl.replace(/\/api$/i, '');
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return 'http://localhost:8000';
};
