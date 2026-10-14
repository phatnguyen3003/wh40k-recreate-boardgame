// =========================================================================
// ⚙️ MODULE CONFIGURATION & CONSTANTS
// =========================================================================
export const EVENT_BUS_CONFIG = {
  MAX_LISTENERS_PER_EVENT: 100,
} as const;

// =========================================================================
// 📦 MODULE IMPLEMENTATION
// =========================================================================
export type EventHandler<T = unknown> = (payload: T) => void;

interface EventEntry {
  handler: EventHandler;
  once: boolean;
}

export class EventBus {
  private listeners: Map<string, Set<EventEntry>> = new Map();
  private maxListeners: number;

  constructor(maxListeners: number = EVENT_BUS_CONFIG.MAX_LISTENERS_PER_EVENT) {
    this.maxListeners = maxListeners;
  }

  on<T = unknown>(event: string, handler: EventHandler<T>): () => void {
    return this.addListener(event, handler, false);
  }

  once<T = unknown>(event: string, handler: EventHandler<T>): () => void {
    return this.addListener(event, handler, true);
  }

  private addListener<T>(event: string, handler: EventHandler<T>, once: boolean): () => void {
    let entries = this.listeners.get(event);
    if (!entries) {
      entries = new Set();
      this.listeners.set(event, entries);
    }

    if (entries.size >= this.maxListeners) {
      console.warn(
        `EventBus: event "${event}" has reached the maximum of ${this.maxListeners} listeners. Possible memory leak.`,
      );
    }

    const entry: EventEntry = { handler: handler as EventHandler, once };
    entries.add(entry);

    return () => this.off(event, handler);
  }

  off<T = unknown>(event: string, handler: EventHandler<T>): void {
    const entries = this.listeners.get(event);
    if (!entries) return;

    for (const entry of entries) {
      if (entry.handler === handler) {
        entries.delete(entry);
        break;
      }
    }

    if (entries.size === 0) {
      this.listeners.delete(event);
    }
  }

  emit<T = unknown>(event: string, payload?: T): void {
    const entries = this.listeners.get(event);
    if (!entries || entries.size === 0) return;

    const snapshot = Array.from(entries);

    for (const entry of snapshot) {
      try {
        entry.handler(payload as T);
      } catch (err) {
        console.error(`EventBus: error in handler for event "${event}":`, err);
      }

      if (entry.once) {
        entries.delete(entry);
      }
    }

    if (entries.size === 0) {
      this.listeners.delete(event);
    }
  }

  listenerCount(event: string): number {
    const entries = this.listeners.get(event);
    return entries ? entries.size : 0;
  }

  eventNames(): string[] {
    return Array.from(this.listeners.keys());
  }

  clear(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

export const globalEventBus = new EventBus();
