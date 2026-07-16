// Minimal Node.js type shims for the font toolkit.
// @types/node is not available in this environment.
// These declarations cover exactly what the toolkit uses — nothing more.
// Remove this file and add @types/node when a proper package install is available.

declare module 'fs' {
  export function readFileSync(path: string, encoding: BufferEncoding): string;
  export function writeFileSync(path: string, data: string, encoding: BufferEncoding): void;
  export function mkdirSync(path: string, options?: { recursive?: boolean }): void;
  export function existsSync(path: string): boolean;
  export function readdirSync(path: string, options: { withFileTypes: true }): Array<{
    name: string;
    isDirectory(): boolean;
    isFile(): boolean;
  }>;
}

declare module 'path' {
  export function join(...segments: string[]): string;
  export function basename(path: string, ext?: string): string;
  export function extname(path: string): string;
  export function dirname(path: string): string;
  export function resolve(...segments: string[]): string;
}

declare const process: {
  argv: string[];
  exit(code?: number): never;
};
