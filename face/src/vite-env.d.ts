/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_R2_PUBLIC_URL: string;
  readonly dev?: boolean;
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
