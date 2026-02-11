import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const originalFetch = window.fetch;
window.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  if (url.startsWith('/api')) {
    const token = localStorage.getItem('_sessionToken');
    if (token) {
      const headers = new Headers(init?.headers);
      if (!headers.has('X-Session-Token')) {
        headers.set('X-Session-Token', token);
      }
      init = { ...init, headers };
    }
  }
  return originalFetch.call(window, input, init);
};

createRoot(document.getElementById("root")!).render(<App />);
