import { describe, it, expectTypeOf } from "vitest"
import { $$A } from "./A"
import { CircularDependencyError } from "#types"

describe("Circular Dependencies", () => {
    it("should detect circular dependencies", () => {
        expectTypeOf($$A).toExtend<CircularDependencyError>()
    })
})
