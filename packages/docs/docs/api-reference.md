# API Reference

A concise guide to the main functions and methods in Commodity.

## Core Functions

| Function                 | Description                                                              |
| ------------------------ | ------------------------------------------------------------------------ |
| **`createMarket()`**     | Creates a new dependency injection scope.                                |
| **`market.offer(name)`** | Starts the definition of a new named supplier.                           |
| **`index(...supplies)`** | A utility to convert a list of supplies into an object for `assemble()`. |

## Defining Suppliers

These methods are chained off `market.offer(name)`.

| Method                    | Description                                          |
| ------------------------- | ---------------------------------------------------- |
| **`.asResource<T>()`**    | Defines the supplier as a simple data container.     |
| **`.asProduct(options)`** | Defines the supplier as a service with dependencies. |

### asProduct Options

The `asProduct` method accepts an options object with the following keys:

| Key              | Description                                                                                                             |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **`suppliers`**  | An array of other suppliers this product depends on.                                                                    |
| **`assemblers`** | An array of suppliers that can be assembled later, on demand.                                                           |
| **`factory`**    | The function that creates the product instance. It receives `$` (supplies) and `$$` (assemblers) as arguments.          |
| **`lazy`**       | A boolean (`false` by default). If `true`, the product is lazy loaded on first access. Eager loading is the default.    |
| **`init`**       | A function `(value, $) => void` that runs immediately after the product is created, for side-effects or initialization. |

## Resource Supplier Methods

These methods are available on resource supplier instances.

| Method             | Description                                 |
| ------------------ | ------------------------------------------- |
| **`.pack(value)`** | Provides a concrete value for the resource. |

## Resource Methods

These methods are available on resource instances.

| Method             | Description                              |
| ------------------ | ---------------------------------------- |
| **`.pack(value)`** | Provides another value for the resource. |

## Product Supplier Methods

These methods are available on product supplier instances.

| Method                                          | Description                                                      |
| ----------------------------------------------- | ---------------------------------------------------------------- |
| **`.assemble(supplies)`**                       | Resolves all dependencies and creates a product instance.        |
| **`.unpack()`**                                 | Retrieves the final value from an assembled product.             |
| **`.prototype(options)`**                       | Creates an alternative implementation of a product supplier.     |
| **`.try(prototype1, prototype2)`**              | Swaps a product's dependency with a specified prototype.         |
| **`supplier1.with(supplier2, supplier3, ...)`** | Allows to assemble multiple suppliers' products at the same time |
| **`.pack(value)`**                              | Provides a concrete value to mock the product (for testing).     |

## Product Methods and Properties

These methods are available on assembled product instances.

| Method                         | Description                                                     |
| ------------------------------ | --------------------------------------------------------------- |
| **`.unpack()`**                | Retrieves the final value from an assembled product.            |
| **`.reassemble(newSupplies)`** | Creates a new product instance with different context/supplies. |
| **`.pack(value)`**             | Provides a concrete value to mock the product (for testing).    |
| **`.supplies`**                | Provides access to the supplies the product was built with.     |

## Factory Function (`factory`)

The factory function is where your service logic lives. It receives two arguments:

-   **`$` (Supplies)**: An object to access regular dependencies.
    -   `$(supplier)`: Unpacks the dependency's value directly.
    -   `$[supplier.name]`: Accesses the packed dependency instance, allowing you to call `.reassemble()` on it.
-   **`$$` (Assemblers)**: An object containing assemblers, which must be assembled manually.
