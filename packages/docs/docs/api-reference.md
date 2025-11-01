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
        // $$ = assemblers and optionals (if any)
        return serviceImplementation
    }
})
```

### `$$supplier.pack(value) or $resource.pack(), $product.pack()`

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

Creates a new product instance built with some supplies overwritten.

```ts
const $newProduct = $existingProduct.reassemble(newSuppliesObject)
```

### `$$supplier.mock(options)`

Creates an alternative implementation.

```ts
const $$alternative = $$originalSupplier.mock({
    suppliers: [$$differentDeps],
    factory: ($) => alternativeImplementation
})
```

### `$$supplier.hire([...hiredSuppliers], [...hiredAssemblers]?)`

`Composition root` method to wire additionnal suppliers and assemblers. Mocks will replace originals
with the same name across the entire dependency chain.

```ts
const $$modified = $$originalSupplier.hire([$$prototypeSupplier])
```

You can also pass originals to hiredSuppliers to batch assemble multiple products together. You access other products via `$product.$($$otherSupplier)`

```ts
const $A = $$A.hire([$$B, $$C]).assemble({})
// All assembled products will be available in $A's supplies() (see below)
const $B = $A.$($$B)
const $C = $A.$($$C)
```

### `$product.$()`

Access a `$product`'s supplies, but from outside a factory. See example above in `$$supplier.hire()` section. Typescript only displays supplies it is sure the product has, which is often `unknown` in factories since the supplier from which the product has been created may have been swapped with a mock with unknown supplies. But hired suppliers will always be available in supplies to enable batch assemble as seen in `$$supplier.hire()` section.

### `index(...$supplies)`

Utility to convert supply array to indexed object.

```ts
const suppliesObject = index($supply1, $supply2, $supply3)
// Equivalent to: { [$supply1.supplier.name]: $supply1, [$supply2.supplier.name]: $supply2, ... }
```

## Factory Function (`factory`)

The factory function is where your service logic lives. It receives two arguments:

-   **`$` (Supplies)**: A function to access regular dependencies.
-   **`$$` (Optionals or Assemblers)**: A function to access optional or assembler suppliers in a factory.
