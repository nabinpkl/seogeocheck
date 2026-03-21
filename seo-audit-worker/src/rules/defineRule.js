export function defineRule(definition) {
  return {
    relatedPacks: [],
    problemFamily: definition.id,
    ...definition,
  };
}
