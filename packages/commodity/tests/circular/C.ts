import { market } from "./market"
import { $$B } from "./B"

// @ts-expect-error - circular dependency
export const $$C = market.offer("C").asProduct({
    suppliers: [$$B],
    factory: () => "C"
})
