/** Application error carrying a stable code + HTTP status. */
export class AppError extends Error {
    constructor(
        public readonly code: string,
        message: string,
        public readonly statusCode = 400
    ) {
        super(message);
        this.name = "AppError";
    }
}

export interface ErrorEnvelope {
    error: { code: string; message: string };
}

export function toEnvelope(err: unknown): {
    status: number;
    body: ErrorEnvelope;
} {
    if (err instanceof AppError) {
        return {
            status: err.statusCode,
            body: { error: { code: err.code, message: err.message } },
        };
    }
    // Never leak stack traces or internal details.
    return {
        status: 500,
        body: {
            error: { code: "internal_error", message: "An unexpected error occurred." },
        },
    };
}
