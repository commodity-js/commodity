import { describe, it, assertType } from "vitest"
import { serviceASupplier } from "./A"

describe("Circular Dependencies", () => {
    it("should detect circular dependencies", () => {
        assertType<unknown>(serviceASupplier)
    })
})
