/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SYNC_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
