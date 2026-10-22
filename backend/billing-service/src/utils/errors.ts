/** An error whose message is safe to show to the user. Anything else becomes a generic 500. */
export class AppError extends Error {
  constructor(public status: number, message: string, public code?: string, public extra?: Record<string, unknown>) {
    super(message);
  }
}
