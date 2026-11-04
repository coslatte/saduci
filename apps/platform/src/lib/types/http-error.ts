export class HttpError extends Error {
  readonly status: number;
  readonly fieldErrors?: Record<string, string | string[]>;

  constructor(
    status: number,
    message: string,
    fieldErrors?: Record<string, string | string[]>,
  ) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}
