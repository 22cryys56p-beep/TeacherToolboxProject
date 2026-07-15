/**
 * @module icanspell/manifest
 * @description Static manifest for the iCanSpell application module.
 * The shell reads this without instantiating the module, so it must
 * have no side effects — pure data only.
 */

import type { AppManifest } from '@teacher-toolbox/types';

export const ICANSPELL_MANIFEST: AppManifest = {
  id:          'icanspell' as AppManifest['id'],
  name:        'iCanSpell',
  description: 'Handwriting & spelling worksheet generator',
  version:     '0.1.0',
  icon:        'spell',
  defaultRoute: '/',
  routes: [
    {
      path:        '/',
      title:       'Worksheet Editor',
      showInNav:   true,
      icon:        'editor',
    },
    {
      path:        '/templates',
      title:       'Templates',
      showInNav:   true,
      icon:        'templates',
    },
    {
      path:        '/words',
      title:       'Word Lists',
      showInNav:   true,
      icon:        'words',
    },
  ],
  capabilities: [
    'worksheet:create',
    'worksheet:print',
    'worksheet:pdf',
    'student:personalise',
    'template:use',
    'artwork:use',
  ],
  requiredServices: [
    'storage',
    'settings',
    'theme-engine',
    'font-manager',
    'worksheet-output',
    'template-manager',
  ],
};
