/**
 * Runtime validation utilities for the commodity package.
 * These validators help catch common errors for users who don't use TypeScript.
 * @internal
 */

/**
 * Validates that a value is a non-empty string.
 * @param value - The value to validate
 * @param paramName - The parameter name for error messages
 * @throws TypeError if the value is not a non-empty string
 */
export function validateNonEmptyString(
    value: unknown,
    paramName: string
): asserts value is string {
    if (typeof value !== "string") {
        throw new TypeError(
            `${paramName} must be a string, got ${typeof value}`
        )
    }
    if (value.length === 0) {
        throw new TypeError(`${paramName} cannot be an empty string`)
    }
}

/**
 * Validates that a value is a plain object (not null, array, or other special object).
 * @param value - The value to validate
 * @param paramName - The parameter name for error messages
 * @throws TypeError if the value is not a plain object
 */
export function validatePlainObject(
    value: unknown,
    paramName: string
): asserts value is Record<string, any> {
    if (value === null || typeof value !== "object") {
        throw new TypeError(
            `${paramName} must be an object, got ${
                value === null ? "null" : typeof value
            }`
        )
    }
    if (Array.isArray(value)) {
        throw new TypeError(`${paramName} must be an object, not an array`)
    }
}

/**
 * Validates that a value is defined (not null or undefined).
 * @param value - The value to validate
 * @param paramName - The parameter name for error messages
 * @throws TypeError if the value is null or undefined
 */
export function validateDefined<T>(
    value: T,
    paramName: string
): asserts value is NonNullable<T> {
    if (value === null || value === undefined) {
        throw new TypeError(
            `${paramName} is required, got ${
                value === null ? "null" : "undefined"
            }`
        )
    }
}

/**
 * Validates that a value is a function.
 * @param value - The value to validate
 * @param paramName - The parameter name for error messages
 * @throws TypeError if the value is not a function
 */
export function validateFunction(
    value: unknown,
    paramName: string
): asserts value is (...args: any) => any {
    if (typeof value !== "function") {
        throw new TypeError(
            `${paramName} must be a function, got ${typeof value}`
        )
    }
}

/**
 * Validates that a value is an array.
 * @param value - The value to validate
 * @param paramName - The parameter name for error messages
 * @throws TypeError if the value is not an array
 */
export function validateArray(
    value: unknown,
    paramName: string
): asserts value is any[] {
    if (!Array.isArray(value)) {
        throw new TypeError(
            `${paramName} must be an array, got ${typeof value}`
        )
    }
}

/**
 * Validates the configuration object for asProduct.
 * @param config - The configuration object to validate
 * @throws TypeError if the configuration is invalid
 */
export function validateProductConfig(config: unknown): asserts config is {
    factory: (...args: any) => any
    suppliers?: any[]
    justInTime?: any[]
    init?: (...args: any) => any
    lazy?: boolean
    isPrototype?: boolean
} {
    validatePlainObject(config, "config")

    const cfg = config as Record<string, any>

    if (!("factory" in cfg)) {
        throw new TypeError("config.factory is required")
    }
    validateFunction(cfg.factory, "config.factory")

    if ("suppliers" in cfg && cfg.suppliers !== undefined) {
        validateArray(cfg.suppliers, "config.suppliers")
    }

    if ("justInTime" in cfg && cfg.justInTime !== undefined) {
        validateArray(cfg.justInTime, "config.justInTime")
    }

    if ("init" in cfg && cfg.init !== undefined) {
        validateFunction(cfg.init, "config.init")
    }

    if (
        "lazy" in cfg &&
        cfg.lazy !== undefined &&
        typeof cfg.lazy !== "boolean"
    ) {
        throw new TypeError(
            `config.lazy must be a boolean, got ${typeof cfg.lazy}`
        )
    }

    if (
        "isPrototype" in cfg &&
        cfg.isPrototype !== undefined &&
        typeof cfg.isPrototype !== "boolean"
    ) {
        throw new TypeError(
            `config.isPrototype must be a boolean, got ${typeof cfg.isPrototype}`
        )
    }
}

/**
 * Validates the configuration object for prototype.
 * @param config - The configuration object to validate
 * @throws TypeError if the configuration is invalid
 */
export function validatePrototypeConfig(config: unknown): asserts config is {
    factory: (...args: any) => any
    suppliers?: any[]
    justInTime?: any[]
    init?: (...args: any) => any
    lazy?: boolean
} {
    validatePlainObject(config, "config")

    const cfg = config as Record<string, any>

    if (!("factory" in cfg)) {
        throw new TypeError("config.factory is required")
    }
    validateFunction(cfg.factory, "config.factory")

    if ("suppliers" in cfg && cfg.suppliers !== undefined) {
        validateArray(cfg.suppliers, "config.suppliers")
    }

    if ("justInTime" in cfg && cfg.justInTime !== undefined) {
        validateArray(cfg.justInTime, "config.justInTime")
    }

    if ("init" in cfg && cfg.init !== undefined) {
        validateFunction(cfg.init, "config.init")
    }

    if (
        "lazy" in cfg &&
        cfg.lazy !== undefined &&
        typeof cfg.lazy !== "boolean"
    ) {
        throw new TypeError(
            `config.lazy must be a boolean, got ${typeof cfg.lazy}`
        )
    }
}

/**
 * Validates that all items in an array are valid suppliers.
 * @param suppliers - The suppliers array to validate
 * @param paramName - The parameter name for error messages
 * @throws TypeError if any supplier is invalid
 */
export function validateSuppliers(
    suppliers: unknown[],
    paramName: string
): void {
    for (let i = 0; i < suppliers.length; i++) {
        const supplier = suppliers[i]
        if (supplier === null || typeof supplier !== "object") {
            throw new TypeError(
                `${paramName}[${i}] must be a supplier object, got ${
                    supplier === null ? "null" : typeof supplier
                }`
            )
        }
        if (
            !("name" in supplier) ||
            typeof (supplier as any).name !== "string"
        ) {
            throw new TypeError(
                `${paramName}[${i}] must have a 'name' property of type string`
            )
        }
    }
}
