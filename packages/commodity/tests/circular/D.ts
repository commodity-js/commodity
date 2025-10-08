import { market } from "./market"
import { $$C, $$G } from "./C"

// @ts-expect-error - circular dependency
export const $$D = market.offer("D").asProduct({
    suppliers: [$$C],
    factory: () => "D"
})

export const $$H = market.offer("H").asProduct({
    assemblers: [$$G],
    factory: () => "H"
})
