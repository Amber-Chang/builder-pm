// journey store — persists journey_id → state mapping
const store = new Map<string, unknown>();

export function getJourney(journey_id: string): unknown {
  return store.get(journey_id);
}

export function setJourney(journey_id: string, state: unknown): void {
  store.set(journey_id, state);
}

export function deleteJourney(journey_id: string): boolean {
  return store.delete(journey_id);
}

export function hasJourney(journey_id: string): boolean {
  return store.has(journey_id);
}

export function listJourneyIds(): string[] {
  return [...store.keys()].sort();
}
