import { market } from "./market"
import { $$C } from "./C"

// @ts-expect-error - circular dependency
export const $$D = market.offer("D").asProduct({
    suppliers: [$$C],
    factory: () => "D"
})
