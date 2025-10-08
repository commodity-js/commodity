import { describe, it, expectTypeOf } from "vitest"
import { $$A } from "./A"

describe("Circular Dependencies", () => {
    it("should detect circular dependencies", () => {
        expectTypeOf($$A).not.toBeObject()
    })
})
