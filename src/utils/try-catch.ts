
export function tryCatch<T>(callbackFn: () => Promise<T>): Promise<[undefined, T] | [Error]>;
export function tryCatch<T>(callbackFn: () => T): [undefined, T] | [Error];

export function tryCatch<T>(callbackFn: () => T | Promise<T>): [undefined, T] | [Error] | Promise<[undefined, T] | [Error]> {
    try {
        const result = callbackFn();

        if (result instanceof Promise) {
            return result
                .then<[undefined, T]>(data => [undefined, data])
                .catch(err => [convertAnyToError(err)])
        }

        return [undefined, result];
    }
    catch (err) {
        return [convertAnyToError(err)];
    }
}

function convertAnyToError(error: any): Error {
    if (error instanceof Error) {
        return error
    }
    else if (error && typeof error === 'object' && 'message' in error && error.message) {
        return new Error(error.message.toString())
    }
    return new Error(error?.toString() ?? 'Unknown Error.')
}