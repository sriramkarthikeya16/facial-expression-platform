/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_WS_BASE_URL: string;
  readonly VITE_APP_ENV: string;
  readonly VITE_SPOTIFY_CLIENT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
