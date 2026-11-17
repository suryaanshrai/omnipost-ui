// API base URL. Resolution order:
//   1. window.__OMNIPOST_CONFIG__.apiUrl — injected at container start from
//      $VITE_API_URL (see docker/entrypoint.sh + public/config.js), so a
//      single built image can point at different APIs without a rebuild.
//   2. VITE_API_URL baked in at build time (see .env / .env.example) — used
//      by `npm run dev` / `npm run build` outside Docker.
//   3. localhost, so local dev keeps working with no config at all.
declare global {
  interface Window {
    __OMNIPOST_CONFIG__?: { apiUrl?: string; sourceUrl?: string };
  }
}

const conf = {
  api_url:
    window.__OMNIPOST_CONFIG__?.apiUrl ||
    import.meta.env.VITE_API_URL ||
    "http://localhost:8000",
  // Where this server's source code is (AGPL §13: people using a modified
  // OmniPost over the network can get its source). Set SOURCE_URL when you
  // run a modified copy.
  source_url:
    window.__OMNIPOST_CONFIG__?.sourceUrl ||
    import.meta.env.VITE_SOURCE_URL ||
    "https://github.com/suryaanshrai/omnipost",
};

export default conf;
