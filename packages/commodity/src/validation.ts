/**
 * Runtime validation utilities for the commodity package.
 * These validators help catch common errors for users who don't use TypeScript.
 * @internal
 */

import { Supplier } from "#types"
import { transitiveSuppliers } from "#utils"

/**
 * Validates that a value is a non-empty string.
 * @param value - The value to validate
 * @param paramName - The parameter name for error messages
 * @internal
 * @throws TypeError if the value is not a non-empty string
 */
export function validateString(value: unknown, paramName: string) {
    if (typeof value !== "string") {
        throw new TypeError(
            `${paramName} must be a string, got ${typeof value}`
        )
    }
}

/**
 * Validates that a value is a plain object (not null, array, or other special object).
 * @param value - The value to validate
 * @param paramName - The parameter name for error messages
 * @internal
 * @throws TypeError if the value is not a plain object
 */
export function validatePlainObject(value: unknown, paramName: string) {
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
 * @internal
 * @throws TypeError if the value is null or undefined
 */
export function validateDefined<T>(value: T, paramName: string) {
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
 * @internal
 * @throws TypeError if the value is not a function
 */
export function validateFunction(value: unknown, paramName: string) {
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
 * @internal
 * @throws TypeError if the value is not an array
 */
export function validateArray(value: unknown, paramName: string) {
    if (!Array.isArray(value)) {
        throw new TypeError(
            `${paramName} must be an array, got ${typeof value}`
        )
    }
}

/**
 * Validates the configuration object for product supplier.
 * @param config - The configuration object to validate
 * @internal
 * @throws TypeError if the configuration is invalid
 */
export function validateProductConfig(name: string, config: unknown) {
    validatePlainObject(config, "config")

    const cfg = config

    if (typeof cfg !== "object" || cfg === null) {
        throw new TypeError("config must be an object")
    }

    if (!("factory" in cfg)) {
        throw new TypeError("config.factory is required")
    }

    validateFunction(cfg.factory, "config.factory")

    if ("suppliers" in cfg) {
        validateSuppliers(
            cfg.suppliers,
            "config.suppliers",
            "_allowPrototypes" in cfg ? (cfg._allowPrototypes as any) : false
        )

        transitiveSuppliers({ name, suppliers: cfg.suppliers as any })
    }

    if ("optionals" in cfg && Array.isArray(cfg.optionals)) {
        const suppliers = validateSuppliers(
            cfg.optionals,
            "config.optionals",
            "_allowPrototypes" in cfg ? (cfg._allowPrototypes as any) : false
        )
        if (
            !suppliers.every(
                (supplier) => "_resource" in supplier && supplier._resource
            )
        ) {
            throw new TypeError("config.optionals must be resource suppliers")
        }
    }

    if ("assemblers" in cfg && Array.isArray(cfg.assemblers)) {
        const assemblers = validateSuppliers(
            cfg.assemblers,
            "config.assemblers",
            "_allowPrototypes" in cfg ? (cfg._allowPrototypes as any) : false
        )

        if (
            !assemblers.every(
                (assembler) => "_product" in assembler && assembler._product
            )
        ) {
            throw new TypeError("config.assemblers must be product suppliers")
        }
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
 * @internal
 * @throws TypeError if any supplier is invalid
 */
export function validateSuppliers(
    suppliers: unknown,
    paramName: string,
    allowPrototypes: boolean = false
) {
    if (!Array.isArray(suppliers)) {
        throw new TypeError(`${paramName} must be an array`)
    }
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

        if ("_isComposite" in supplier && supplier?._isComposite) {
            throw new TypeError(
                `Cannot depend on ${supplier.name} composite supplier`
            )
        }

        if (
            !allowPrototypes &&
            "_isPrototype" in supplier &&
            supplier?._isPrototype
        ) {
            throw new TypeError(
                `Cannot depend on ${supplier.name} prototype supplier here`
            )
        }
    }

    return suppliers as Supplier[]
}
