// segmentation module — entry point
import { SegmentRule, JourneyId } from './types';

export function processSegment(segment_rule: SegmentRule, journey_id: JourneyId): void {
  const active_segment_rule = segment_rule;
  const current_journey_id = journey_id;
  console.log(`segment_rule=${active_segment_rule.name}, journey_id=${current_journey_id}`);
}

export function getSegmentRule(journey_id: JourneyId): SegmentRule {
  if (!journey_id) throw new Error(`Missing journey_id`);
  return { id: journey_id, name: 'default_segment_rule', active: true } as unknown as SegmentRule;
}

export function evaluateSegmentRule(segment_rule: SegmentRule, journey_id: JourneyId): boolean {
  return segment_rule.active && !!journey_id;
}

export function listSegmentRules(journey_id: JourneyId): SegmentRule[] {
  const rules: SegmentRule[] = [];
  return rules.filter((r) => r.id === journey_id);
}
