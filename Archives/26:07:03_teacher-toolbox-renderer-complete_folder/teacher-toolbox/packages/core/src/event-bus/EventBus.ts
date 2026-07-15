/**
 * @module EventBus
 * @description Typed publish/subscribe system for loose coupling between
 * platform services and app modules.
 *
 * Accepts both PlatformEvent and AppEvent (via AnyEvent). App modules
 * extend AppEventMap via declaration merging to add their own typed events.
 *
 * Usage:
 *   bus.emit({ type: 'student:selected', payload: { studentId: '...' } });
 *   bus.emit({ type: 'icanspell:wordlist:updated', payload: { wordListId: '...' } });
 *
 *   const unsub = bus.on('student:selected', (e) => {
 *     console.log(e.payload.studentId); // fully typed
 *   });
 *   unsub();
 */

import type { AnyEvent, PlatformEvent } from '@teacher-toolbox/types';

export type Unsubscribe = () => void;

type EventOfType<E extends { type: string }, T extends E['type']> = Extract<E, { type: T }>;

export class EventBus {
  private readonly handlers = new Map<string, Set<(event: AnyEvent) => void>>();

  /**
   * Subscribe to a platform event type. Fully typed — the handler receives
   * the correct payload shape inferred from the event type string.
   */
  on<T extends PlatformEvent['type']>(
    eventType: T,
    handler: (event: EventOfType<PlatformEvent, T>) => void,
  ): Unsubscribe {
    return this.addHandler(eventType, handler as (event: AnyEvent) => void);
  }

  /**
   * Subscribe to an app-module event type registered via AppEventMap declaration merging.
   * Use this overload from within app modules for their own event types.
   */
  onApp(eventType: string, handler: (event: AnyEvent) => void): Unsubscribe {
    return this.addHandler(eventType, handler);
  }

  /** Subscribe once then auto-unsubscribe after first emission. */
  once<T extends PlatformEvent['type']>(
    eventType: T,
    handler: (event: EventOfType<PlatformEvent, T>) => void,
  ): Unsubscribe {
    const unsub = this.on(eventType, (event) => {
      handler(event);
      unsub();
    });
    return unsub;
  }

  /**
   * Emit an event to all registered handlers.
   * Handlers are called synchronously in registration order.
   * Errors in individual handlers are caught and logged — a bad handler
   * never prevents other handlers from running.
   */
  emit(event: AnyEvent): void {
    const handlers = this.handlers.get(event.type);
    if (!handlers || handlers.size === 0) return;

    for (const handler of handlers) {
      try {
        handler(event);
      } catch (err) {
        console.error(`[EventBus] Handler threw for event "${event.type}":`, err);
      }
    }
  }

  removeAllListeners(eventType?: string): void {
    if (eventType) {
      this.handlers.delete(eventType);
    } else {
      this.handlers.clear();
    }
  }

  handlerCount(eventType: string): number {
    return this.handlers.get(eventType)?.size ?? 0;
  }

  private addHandler(type: string, handler: (event: AnyEvent) => void): Unsubscribe {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
    return () => { this.handlers.get(type)?.delete(handler); };
  }
}
