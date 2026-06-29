// journey engine — orchestrates journey_id lifecycle
import { getJourney, setJourney, deleteJourney, hasJourney } from './store';

export interface JourneyEvent {
  journey_id: string;
  event_type: string;
  payload: unknown;
}

export function startJourney(journey_id: string): void {
  if (hasJourney(journey_id)) {
    throw new Error(`journey_id already active: ${journey_id}`);
  }
  setJourney(journey_id, { status: 'active', started_at: null });
}

export function advanceJourney(journey_id: string, event: JourneyEvent): void {
  const state = getJourney(journey_id);
  if (!state) throw new Error(`Unknown journey_id: ${journey_id}`);
  setJourney(journey_id, { ...state as object, last_event: event });
}

export function completeJourney(journey_id: string): void {
  if (!hasJourney(journey_id)) {
    throw new Error(`Cannot complete unknown journey_id: ${journey_id}`);
  }
  deleteJourney(journey_id);
}
