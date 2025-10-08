import { market } from "./market"
import { $$A, $$E } from "./A"

// @ts-expect-error - circular dependency
export const $$B = market.offer("B").asProduct({
    suppliers: [$$A],
    factory: () => "B"
})

export const $$F = market.offer("F").asProduct({
    assemblers: [$$E],
    factory: () => "F"
})
