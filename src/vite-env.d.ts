/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Seeds pages from src/data/*.json so the UI can be built without a
   *  backend or a login. See src/lib/fixtures.ts. Never set in production. */
  readonly VITE_USE_FIXTURES?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
