class SubmitStarError extends Error {
    constructor(message: string) {
        super(message);
        // see https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
        // & https://github.com/microsoft/TypeScript/issues/13965
        Object.setPrototypeOf(this, SubmitStarError.prototype);
    }
}

export default SubmitStarError;