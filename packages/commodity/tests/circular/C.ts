import { market } from "./market"
import { $$B, $$F } from "./B"

// @ts-expect-error - circular dependency
export const $$C = market.offer("C").asProduct({
    suppliers: [$$B],
    factory: () => "C"
})

export const $$G = market.offer("G").asProduct({
    assemblers: [$$F],
    factory: () => "G"
})
