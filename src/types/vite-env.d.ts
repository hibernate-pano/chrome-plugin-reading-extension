/// <reference types="vite/client" />

// Vite ?inline CSS imports
declare module '*.css?inline' {
  const content: string;
  export default content;
}
