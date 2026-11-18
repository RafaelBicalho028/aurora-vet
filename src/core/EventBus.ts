/** Barramento de eventos simples e tipado de forma leve, independente do Phaser. */
type Handler = (payload?: any) => void;

export class EventBus {
  private handlers = new Map<string, Set<Handler>>();

  on(event: string, handler: Handler): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
    return () => this.off(event, handler);
  }

  off(event: string, handler: Handler): void {
    this.handlers.get(event)?.delete(handler);
  }

  emit(event: string, payload?: unknown): void {
    this.handlers.get(event)?.forEach((h) => {
      try {
        h(payload);
      } catch (err) {
        console.error(`[EventBus] erro no handler de "${event}"`, err);
      }
    });
  }
}

export const bus = new EventBus();

/** Nomes de eventos usados entre sistemas. */
export const Events = {
  StateChanged: 'state:changed',
  XpGained: 'xp:gained',
  LevelUp: 'xp:levelup',
  QuestUpdated: 'quest:updated',
  QuestCompleted: 'quest:completed',
  DexUnlocked: 'dex:unlocked',
  ItemGained: 'item:gained',
  Toast: 'ui:toast',
  UiModalChanged: 'ui:modal',
  WarpRequest: 'world:warp',
  Saved: 'save:done',
  WorldRefresh: 'world:refresh',
} as const;
