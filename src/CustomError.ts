export default class CustomError extends Error {
    status: number;

    constructor(options: { status: number; message: string }) {
        super();
        this.status = options.status;
        this.message = options.message;
    }
}
