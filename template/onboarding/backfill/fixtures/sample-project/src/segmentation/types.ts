// segmentation domain types
export type JourneyId = string;

export interface SegmentRule {
  id: JourneyId;
  name: string;
  active: boolean;
  segment_rule_version?: number;
}

export interface SegmentRuleConfig {
  default_segment_rule: SegmentRule;
  fallback_journey_id: JourneyId;
  max_segment_rule_depth: number;
}

export function makeSegmentRule(journey_id: JourneyId, name: string): SegmentRule {
  return { id: journey_id, name, active: true };
}
