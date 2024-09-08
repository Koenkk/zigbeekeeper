export interface Logger {
    isEnabled: (level: string, namespace: string) => boolean;
    debug: (messageOrLambda: string | (() => string), namespace: string) => void;
    info: (messageOrLambda: string | (() => string), namespace: string) => void;
    warning: (messageOrLambda: string | (() => string), namespace: string) => void;
    error: (messageOrLambda: string | (() => string), namespace: string) => void;
}

export let logger: Logger = {
    isEnabled: () => true,
    debug: (messageOrLambda, namespace) =>
        console.debug(`${namespace}: ${typeof messageOrLambda === 'function' ? messageOrLambda() : messageOrLambda}`),
    info: (messageOrLambda, namespace) => console.info(`${namespace}: ${typeof messageOrLambda === 'string' ? messageOrLambda : messageOrLambda()}`),
    warning: (messageOrLambda, namespace) =>
        console.warn(`${namespace}: ${typeof messageOrLambda === 'function' ? messageOrLambda() : messageOrLambda}`),
    error: (messageOrLambda, namespace) =>
        console.error(`${namespace}: ${typeof messageOrLambda === 'function' ? messageOrLambda() : messageOrLambda}`),
};

export function setLogger(l: Logger): void {
    logger = l;
}
