import { market } from "./market"
import { $$A } from "./A"

// @ts-expect-error - circular dependency
export const $$B = market.offer("B").asProduct({
    suppliers: [$$A],
    factory: () => "B"
})
