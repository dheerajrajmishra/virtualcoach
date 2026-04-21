/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY: string;
  // add any other variables you create in the future here
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}