import { describe, expectTypeOf, it } from "vitest"
import { serviceASupplier } from "./A"

describe("Circular Dependencies", () => {
    it("should detect circular dependencies", () => {
        expectTypeOf(serviceASupplier).toBeUnknown()
    })
})
