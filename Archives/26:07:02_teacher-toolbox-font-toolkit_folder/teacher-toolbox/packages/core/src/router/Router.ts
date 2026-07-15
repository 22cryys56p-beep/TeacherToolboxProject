/**
 * @module Router
 * @description Hash-based client-side router. Uses URL hashes (#/app/path)
 * so the platform works from a static file server or even file:// with no
 * server configuration required.
 *
 * Path structure: /#/{appId}/{...path}
 * Examples:
 *   /#/spell/editor
 *   /#/spell/templates
 *   /#/settings
 *   /#/students
 */

import type { AppId } from '@teacher-toolbox/types';
import type { EventBus } from '../event-bus/EventBus.js';

export interface ParsedRoute {
  appId: AppId | null;
  path: string;
  params: Record<string, string>;
  hash: string;
}

export type RouteChangeHandler = (route: ParsedRoute) => void;

export class Router {
  private handlers: RouteChangeHandler[] = [];
  private currentRoute: ParsedRoute | null = null;

  constructor(private readonly bus: EventBus) {}

  /** Start listening to hash changes */
  start(): void {
    window.addEventListener('hashchange', this.handleHashChange);
    // Process the initial URL
    this.handleHashChange();
  }

  /** Stop listening (called on platform shutdown) */
  stop(): void {
    window.removeEventListener('hashchange', this.handleHashChange);
  }

  /** Navigate to a path, updating the URL hash */
  navigate(path: string): void {
    window.location.hash = path.startsWith('/') ? path : `/${path}`;
  }

  /** Navigate to an app's default route */
  navigateToApp(appId: AppId, subPath = ''): void {
    this.navigate(`/${appId}${subPath ? `/${subPath}` : ''}`);
  }

  /** Get the current route (null before start() is called) */
  getCurrentRoute(): ParsedRoute | null {
    return this.currentRoute;
  }

  /** Register a handler called on every route change */
  onChange(handler: RouteChangeHandler): () => void {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler);
    };
  }

  private readonly handleHashChange = (): void => {
    const route = this.parseCurrentHash();
    this.currentRoute = route;

    this.bus.emit({
      type: 'navigation:changed',
      payload: { appId: route.appId, path: route.path },
    });

    for (const handler of this.handlers) {
      try {
        handler(route);
      } catch (err) {
        console.error('[Router] Route handler error:', err);
      }
    }
  };

  private parseCurrentHash(): ParsedRoute {
    // hash is e.g. '#/spell/editor' or '' or '#/'
    const raw = window.location.hash.replace(/^#/, '') || '/';
    const segments = raw.split('/').filter(Boolean);

    const appId = (segments[0] ?? null) as AppId | null;
    const subPath = segments.length > 1 ? `/${segments.slice(1).join('/')}` : '/';

    return {
      appId,
      path: subPath,
      params: {},  // TODO v0.2: parse :param patterns from route definitions
      hash: raw,
    };
  }
}
