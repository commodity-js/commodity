/**
 * Runtime validation utilities for the typearch package.
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
        hiredSuppliers?: unknown
        hiredAssemblers?: unknown
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
    const hiredSuppliers = config.hiredSuppliers ?? []
    const hiredAssemblers = config.hiredAssemblers ?? []

    assertSuppliers(name, suppliers)
    assertResourceSuppliers(name, optionals)
    assertProductSuppliers(name, assemblers)
    assertSuppliers(name, hiredSuppliers, true)
    assertProductSuppliers(name, hiredAssemblers, true)

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
    assertHasProperty(name, supplier, "_")
    assertHasProperty(name, supplier._, "resource")
    assertHasProperty(name, supplier, "name")
    assertString(name, supplier.name)
}

export function assertProductSupplier(
    name: string,
    supplier: unknown,
    allowMocks: boolean = false
): asserts supplier is ProductSupplier {
    assertHasProperty(name, supplier, "_")
    assertHasProperty(name, supplier._, "product")
    assertHasProperty(name, supplier._, "isMock")
    assertHasProperty(name, supplier, "name")
    assertString(name, supplier.name)

    if (
        !allowMocks &&
        "hiredSuppliers" in supplier &&
        Array.isArray(supplier.hiredSuppliers) &&
        supplier.hiredSuppliers.length > 0
    ) {
        throw new TypeError(
            `Cannot depend on ${supplier.name} composite supplier`
        )
    }

    if (
        !allowMocks &&
        "hiredAssemblers" in supplier &&
        Array.isArray(supplier.hiredAssemblers) &&
        supplier.hiredAssemblers.length > 0
    ) {
        throw new TypeError(
            `Cannot depend on ${supplier.name} composite supplier`
        )
    }

    if (!allowMocks && supplier._.isMock) {
        throw new TypeError(`Cannot depend on ${supplier.name} mock supplier`)
    }
}

/**
 * Validates that all items in an array are valid suppliers.
 * @param name - The parameter name for error messages
 * @param suppliers - The suppliers array to validate
 * @param allowMocks - Whether to allow mocks
 * @internal
 * @throws TypeError if any supplier is invalid
 */
export function assertSuppliers(
    name: string,
    suppliers: unknown,
    allowMocks: boolean = false
): asserts suppliers is Supplier[] {
    if (!Array.isArray(suppliers)) {
        throw new TypeError(`${name} must be an array`)
    }

    suppliers.forEach((supplier) => {
        try {
            assertResourceSupplier(name, supplier)
            return
        } catch (e) {
            assertProductSupplier(name, supplier, allowMocks)
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
    allowMocks: boolean = false
): asserts suppliers is ProductSupplier[] {
    if (!Array.isArray(suppliers)) {
        throw new TypeError(`${name} must be an array`)
    }
    suppliers.forEach((supplier) => {
        assertProductSupplier(name, supplier, allowMocks)
    })
}
