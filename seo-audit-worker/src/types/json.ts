export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonInput = JsonValue | undefined;
export type JsonObject = { [key: string]: JsonInput };
