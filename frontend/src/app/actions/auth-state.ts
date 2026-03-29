export type AuthActionState = {
  code: string | null;
  error: string | null;
};

export const initialAuthActionState: AuthActionState = {
  code: null,
  error: null,
};
