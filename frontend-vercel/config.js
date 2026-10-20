// Public local fallback. The Vercel build replaces this with PUBLIC_API_URL.
window.__API_URL__ = window.__API_URL__ || (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? 'http://localhost:3000' : 'https://best-cda1.onrender.com');
