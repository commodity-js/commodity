import { describe, it, expectTypeOf, expect } from "vitest"
import { CircularDependencyError } from "#types"

describe("Circular Dependencies", () => {
    it("should detect circular dependencies", async () => {
        await expect(async () => {
            const { $$A } = await import("./A")
            expectTypeOf($$A).toExtend<CircularDependencyError>()
        }).rejects.toThrow()
    })
})
