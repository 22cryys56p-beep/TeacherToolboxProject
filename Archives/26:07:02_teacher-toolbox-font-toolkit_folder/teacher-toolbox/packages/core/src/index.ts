/**
 * @package @teacher-toolbox/core
 * @description Platform core infrastructure.
 *
 * - EventBus:      typed pub/sub for inter-module communication
 * - PluginManager: app module lifecycle management
 * - Router:        hash-based client-side navigation
 * - generateId:    UUID v4 factory — use for ALL entity ID creation
 */

export { EventBus }                       from './event-bus/EventBus.js';
export type { Unsubscribe }               from './event-bus/EventBus.js';

export { PluginManager }                  from './plugin-manager/PluginManager.js';

export { Router }                         from './router/Router.js';
export type { ParsedRoute, RouteChangeHandler } from './router/Router.js';

export { generateId }                     from './id/index.js';
