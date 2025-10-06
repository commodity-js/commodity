# API Reference

## API Reference

### `createMarket()`

Creates a new dependency injection scope.

```ts
const market = createMarket()
```

### `market.offer(name)`

Creates a new supplier with the given name.

```ts
const $$supplier = market.offer("name")
```

### `offer.asResource<T>()`

Creates a resource supplier for data/configuration.

```ts
const $resource = market.offer("config").asResource<Config>()
```

### `offer.asProduct(options)`

Creates a product supplier.

```ts
const $$product = market.offer("product").asProduct({
    suppliers: [$$supplier1, $$supplier3], // Suppliers
    assemblers: [$$assembler1, $$assembler2], // Assemblers
    lazy: boolean, // Eager (false) or lazy (true)
    init: (value, $)=>void // Run a function right after construction
    factory: ($, $$) => {
        // Factory function
        // $ = regular supplies
        // $$ = assemblers (if any)
        return serviceImplementation
    }
})
```

### `$$supplier.pack(value) or $resource.pack() $product.pack()`

Provides a concrete value for a resource or product, bypassing the factory in the case of products.

```ts
const $resource = $$resource.pack(value)
const $mock = $$product.pack(mockValue) // For testing
const $newResource = $resource.pack(newValue)
const $newMock = $mock.pack(newMockValue)
```

### `$$supplier.assemble(supplies)`

Resolves all dependencies and creates the product.

```ts
const $product = $$product.assemble(suppliesObject)
const value = $product.unpack()
```

### `$product.reassemble(newSupplies)`

Creates a new context with different supplies.

```ts
const $newProduct = $existingProduct.reassemble(newSuppliesObject)
```

### `$$supplier.prototype(options)`

Creates an alternative implementation.

```ts
const $$alternative = $$originalSupplier.prototype({
    suppliers: [$$differentDeps],
    factory: ($) => alternativeImplementation
})
```

### `$$supplier.try(...$$prototypes)`

Use a prototype instead of the original when resolving a product's suppliers or assemblers.

```ts
const $$modified = $$originalSupplier.try($$prototypeSupplier)
```

### `$$supplier.with(...$$suppliers)`

Allows to assemble() multiple $$suppliers at the same time in a performant manner.

```ts
const $A = $$A.with($$B, $$C).assemble({})
// All assembled products will be available in $A's supplies() (see below)
const $B = $A.supplies($$B)
const $C = $A.supplies($$C)
```

```ts
const $$modified = $$originalSupplier.try($$prototypeSupplier)
```

### `$product.supplies()`

Access a `$product`'s supplies (`$`to factory) but from outside a factory. See example above in`.with()` section.

### `index(...$supplies)`

Utility to convert supply array to indexed object.

```ts
const suppliesObject = index($supply1, $supply2, $supply3)
// Equivalent to: { [$supply1.name]: $supply1, [$supply2.name]: $supply2, ... }
```

## Factory Function (`factory`)

The factory function is where your service logic lives. It receives two arguments:

-   **`$` (Supplies)**: An object to access regular dependencies.
    -   `$(supplier)`: Unpacks the dependency's value directly.
    -   `$[supplier.name]`: Accesses the packed dependency instance, allowing you to call `.reassemble()` on it.
-   **`$$` (Assemblers)**: An object containing assemblers, which must be assembled manually.
