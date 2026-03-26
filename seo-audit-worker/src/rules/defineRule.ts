import type { CheckResult } from "./utils.js";

type DynamicRecord = Record<string, ReturnType<typeof JSON.parse>>;

type RuleDefinition = {
  id: string;
  label: string;
  packId: string;
  scoreWeight: number;
  priority: number;
  problemFamily?: string;
  relatedPacks?: string[];
  check: (...args: DynamicRecord[]) => CheckResult;
};

type Rule = RuleDefinition & {
  relatedPacks: string[];
  problemFamily: string;
};

export function defineRule(definition: RuleDefinition): Rule {
  if (typeof definition.scoreWeight !== "number") {
    throw new Error(`Rule ${definition.id} must declare a numeric scoreWeight.`);
  }

  return {
    relatedPacks: [],
    problemFamily: definition.id,
    ...definition,
  };
}
