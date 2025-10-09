import { market } from "./market"
import { $$B, $$F, $$J } from "./B"

// @ts-expect-error - circular dependency
export const $$C = market.offer("C").asProduct({
    suppliers: [$$B],
    factory: () => "C"
})

// @ts-expect-error - circular dependency
export const $$G = market.offer("G").asProduct({
    assemblers: [$$F],
    factory: () => "G"
})

// @ts-expect-error - circular dependency
export const $$K = market.offer("K").asProduct({
    suppliers: [$$J],
    factory: () => "K"
})
