import { market } from "./market"
import { $$D } from "./D"

// @ts-expect-error - circular dependency
export const $$A = market.offer("A").asProduct({
    suppliers: [$$D],
    factory: () => "A"
})
