// API base URL. Resolution order:
//   1. window.__OMNIPOST_CONFIG__.apiUrl — injected at container start from
//      $VITE_API_URL (see docker/entrypoint.sh + public/config.js), so a
//      single built image can point at different APIs without a rebuild.
//   2. VITE_API_URL baked in at build time (see .env / .env.example) — used
//      by `npm run dev` / `npm run build` outside Docker.
//   3. localhost, so local dev keeps working with no config at all.
declare global {
  interface Window {
    __OMNIPOST_CONFIG__?: { apiUrl?: string };
  }
}

const conf = {
  api_url:
    window.__OMNIPOST_CONFIG__?.apiUrl ||
    import.meta.env.VITE_API_URL ||
    "http://localhost:8000",
};

export default conf;
