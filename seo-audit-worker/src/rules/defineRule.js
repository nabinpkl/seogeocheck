export function defineRule(definition) {
  return {
    relatedPacks: [],
    ...definition,
  };
}
