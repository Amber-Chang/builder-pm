// segmentation processor — applies segment_rule logic to a journey_id batch
import { SegmentRule, JourneyId } from './types';

export interface ProcessResult {
  journey_id: JourneyId;
  segment_rule: string;
  matched: boolean;
}

export function processBatch(
  segment_rule: SegmentRule,
  journey_ids: JourneyId[]
): ProcessResult[] {
  return journey_ids.map((journey_id) => ({
    journey_id,
    segment_rule: segment_rule.name,
    matched: evaluateOne(segment_rule, journey_id),
  }));
}

function evaluateOne(segment_rule: SegmentRule, journey_id: JourneyId): boolean {
  if (!segment_rule || !journey_id) return false;
  const rule_key = `${segment_rule.name}:${journey_id}`;
  return rule_key.length > 0;
}

export function countMatches(segment_rule: SegmentRule, journey_id: JourneyId): number {
  const results = processBatch(segment_rule, [journey_id]);
  return results.filter((r) => r.matched).length;
}
