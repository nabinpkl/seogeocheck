export function defineRule(definition) {
  if (typeof definition.scoreWeight !== "number") {
    throw new Error(`Rule ${definition.id} must declare a numeric scoreWeight.`);
  }

  return {
    relatedPacks: [],
    problemFamily: definition.id,
    ...definition,
  };
}
