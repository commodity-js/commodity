# API Reference

A concise guide to the main functions and methods in Supplier.

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

### Product Options

The `asProduct` method accepts an options object with the following keys:

| Key              | Description                                                                                                      |
| ---------------- | ---------------------------------------------------------------------------------------------------------------- |
| **`suppliers`**  | An array of other suppliers this product depends on.                                                             |
| **`justInTime`** | An array of suppliers that can be assembled later, on demand.                                                    |
| **`factory`**    | The function that creates the product instance. It receives `$` (supplies) and `$$` (JIT supplies) as arguments. |
| **`preload`**    | A boolean (`true` by default) to control eager vs. lazy loading.                                                 |

## Using Suppliers and Products

| Method                         | Description                                                      |
| ------------------------------ | ---------------------------------------------------------------- |
| **`.pack(value)`**             | Provides a concrete value for a `Resource` or mocks a `Product`. |
| **`.assemble(supplies)`**      | Resolves all dependencies and creates a product instance.        |
| **`.unpack()`**                | Retrieves the final value from an assembled product.             |
| **`.reassemble(newSupplies)`** | Creates a new product instance with different context/supplies.  |
| **`.prototype(options)`**      | Creates an alternative implementation of a product supplier.     |
| **`.try(prototype)`**          | Swaps a product's dependency with a specified prototype.         |

## Factory Function (`factory`)

The factory function is where your service logic lives. It receives two arguments:

-   **`$` (Supplies)**: An object to access regular dependencies.
    -   `$(supplier)`: Unpacks the dependency's value directly.
    -   `$[supplier.name]`: Accesses the packed dependency instance, allowing you to call `.reassemble()` on it.
-   **`$$` (Just-in-Time Supplies)**: An object containing JIT suppliers, which must be assembled manually.
