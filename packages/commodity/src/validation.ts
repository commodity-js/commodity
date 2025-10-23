/**
 * Runtime validation utilities for the commodity package.
 * These validators help catch common errors for users who don't use TypeScript.
 * @internal
 */

import { ProductSupplier, ResourceSupplier, Supplier } from "#types"

/**
 * Validates that a value is a non-empty string.
 * @param name - The parameter name for error messages
 * @param value - The value to validate
 * @internal
 * @throws TypeError if the value is not a string
 */
export function assertString(
    name: string,
    value: unknown
): asserts value is string {
    if (typeof value !== "string") {
        throw new TypeError(`${name} must be a string, got ${typeof value}`)
    }
}

/**
 * Validates that a value is a plain object (not null, array, or other special object).
 * @param name - The parameter name for error messages
 * @param value - The value to validate
 * @internal
 * @throws TypeError if the value is not a plain object
 */
export function assertPlainObject(
    name: string,
    value: unknown
): asserts value is object {
    if (value === null || typeof value !== "object") {
        throw new TypeError(
            `${name} must be an object, got ${
                value === null ? "null" : typeof value
            }`
        )
    }
    if (Array.isArray(value)) {
        throw new TypeError(`${name} must be an object, not an array`)
    }
}

export function assertHasProperty<K extends string>(
    name: string,
    value: unknown,
    property: K
): asserts value is { [key in K]: unknown } {
    if (!Object.prototype.hasOwnProperty.call(value, property)) {
        throw new TypeError(`${name} must have a '${property}' property`)
    }
}

/**
 * Validates that a value is a function.
 * @param name - The parameter name for error messages
 * @param value - The value to validate
 * @internal
 * @throws TypeError if the value is not a function
 */
export function assertFunction(
    name: string,
    value: unknown
): asserts value is (...args: unknown[]) => unknown {
    if (typeof value !== "function") {
        throw new TypeError(`${name} must be a function, got ${typeof value}`)
    }
}

/**
 * Validates the configuration object for product supplier.
 * @param config - The configuration object to validate
 * @internal
 * @throws TypeError if the configuration is invalid
 */
export function assertProductConfig(
    name: string,
    config: {
        suppliers?: unknown
        optionals?: unknown
        assemblers?: unknown
        withSuppliers?: unknown
        withAssemblers?: unknown
        init?: unknown
        lazy?: unknown
    }
) {
    assertPlainObject(name, config)
    assertHasProperty(name, config, "factory")
    assertFunction(name, config.factory)

    const suppliers = config.suppliers ?? []
    const optionals = config.optionals ?? []
    const assemblers = config.assemblers ?? []
    const withSuppliers = config.withSuppliers ?? []
    const withAssemblers = config.withAssemblers ?? []

    assertSuppliers(name, suppliers)
    assertResourceSuppliers(name, optionals)
    assertProductSuppliers(name, assemblers)
    assertSuppliers(name, withSuppliers, true)
    assertProductSuppliers(name, withAssemblers, true)

    if (config.init !== undefined) {
        assertFunction(name, config.init)
    }

    if (config.lazy !== undefined && typeof config.lazy !== "boolean") {
        throw new TypeError(
            `${name}.lazy must be a boolean, got ${typeof config.lazy}`
        )
    }
}

export function assertResourceSupplier(
    name: string,
    supplier: unknown
): asserts supplier is ProductSupplier {
    assertHasProperty(name, supplier, "_resource")
    assertHasProperty(name, supplier, "name")
    assertString(name, supplier.name)
}

export function assertProductSupplier(
    name: string,
    supplier: unknown,
    allowPrototypes: boolean = false
): asserts supplier is ProductSupplier {
    assertHasProperty(name, supplier, "_product")
    assertHasProperty(name, supplier, "_isPrototype")
    assertHasProperty(name, supplier, "name")
    assertString(name, supplier.name)

    if (
        !allowPrototypes &&
        "withSuppliers" in supplier &&
        Array.isArray(supplier.withSuppliers) &&
        supplier.withSuppliers.length > 0
    ) {
        throw new TypeError(
            `Cannot depend on ${supplier.name} composite supplier`
        )
    }

    if (
        !allowPrototypes &&
        "withAssemblers" in supplier &&
        Array.isArray(supplier.withAssemblers) &&
        supplier.withAssemblers.length > 0
    ) {
        throw new TypeError(
            `Cannot depend on ${supplier.name} composite supplier`
        )
    }

    if (!allowPrototypes && supplier?._isPrototype) {
        throw new TypeError(
            `Cannot depend on ${supplier.name} prototype supplier`
        )
    }
}

/**
 * Validates that all items in an array are valid suppliers.
 * @param name - The parameter name for error messages
 * @param suppliers - The suppliers array to validate
 * @param allowPrototypes - Whether to allow prototypes
 * @internal
 * @throws TypeError if any supplier is invalid
 */
export function assertSuppliers(
    name: string,
    suppliers: unknown,
    allowPrototypes: boolean = false
): asserts suppliers is Supplier[] {
    if (!Array.isArray(suppliers)) {
        throw new TypeError(`${name} must be an array`)
    }

    suppliers.forEach((supplier) => {
        try {
            assertResourceSupplier(name, supplier)
            return
        } catch (e) {
            assertProductSupplier(name, supplier, allowPrototypes)
        }
    })
}

export function assertResourceSuppliers(
    name: string,
    suppliers: unknown
): asserts suppliers is ResourceSupplier[] {
    if (!Array.isArray(suppliers)) {
        throw new TypeError(`${name} must be an array`)
    }
    suppliers.forEach((supplier) => {
        assertResourceSupplier(name, supplier)
    })
}

export function assertProductSuppliers(
    name: string,
    suppliers: unknown,
    allowPrototypes: boolean = false
): asserts suppliers is ProductSupplier[] {
    if (!Array.isArray(suppliers)) {
        throw new TypeError(`${name} must be an array`)
    }
    suppliers.forEach((supplier) => {
        assertProductSupplier(name, supplier, allowPrototypes)
    })
}
