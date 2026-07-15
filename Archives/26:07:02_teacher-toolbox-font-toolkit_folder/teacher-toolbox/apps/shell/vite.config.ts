import { defineConfig } from 'vite';
import { svelte }       from '@sveltejs/vite-plugin-svelte';
import { resolve }      from 'path';

const r = (p: string) => resolve(__dirname, p);

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      '@teacher-toolbox/types':             r('../../packages/types/src/index.ts'),
      '@teacher-toolbox/core':              r('../../packages/core/src/index.ts'),
      '@teacher-toolbox/ui':                r('../../packages/ui/src/index.ts'),
      '@teacher-toolbox/storage':           r('../../packages/services/storage/src/index.ts'),
      '@teacher-toolbox/settings':          r('../../packages/services/settings/src/index.ts'),
      '@teacher-toolbox/theme-engine':      r('../../packages/services/theme-engine/src/index.ts'),
      '@teacher-toolbox/font-manager':      r('../../packages/services/font-manager/src/index.ts'),
      '@teacher-toolbox/worksheet-output':  r('../../packages/services/worksheet-output/src/index.ts'),
      '@teacher-toolbox/template-manager':  r('../../packages/services/template-manager/src/index.ts'),
      '@teacher-toolbox/ai-service':        r('../../packages/services/ai-service/src/index.ts'),
      '@teacher-toolbox/artwork':           r('../../packages/services/artwork/src/index.ts'),
      '@teacher-toolbox/error-reporter':    r('../../packages/services/error-reporter/src/index.ts'),
      '@teacher-toolbox/migration':         r('../../packages/services/migration/src/index.ts'),
      '@teacher-toolbox/feature-flags':     r('../../packages/services/feature-flags/src/index.ts'),
      '@teacher-toolbox/analytics':         r('../../packages/services/analytics/src/index.ts'),
      '@teacher-toolbox/identity':          r('../../packages/services/identity/src/index.ts'),
      '@teacher-toolbox/ad-service':        r('../../packages/services/ad-service/src/index.ts'),
      '@teacher-toolbox/cloud-coordinator': r('../../packages/services/cloud-coordinator/src/index.ts'),
      '@teacher-toolbox/icanspell':         r('../../apps/icanspell/src/index.ts'),
    },
  },
  server: { port: 5173, open: true },
});
