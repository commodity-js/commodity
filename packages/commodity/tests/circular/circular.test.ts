import { describe, it, assertType } from "vitest"
import { $$A } from "./A"

describe("Circular Dependencies", () => {
    it("should detect circular dependencies", () => {
        assertType<unknown>($$A)
    })
})
