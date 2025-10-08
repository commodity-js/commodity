import { market } from "./market"
import { $$D, $$H, $$L } from "./D"

// @ts-expect-error - circular dependency
export const $$A = market.offer("A").asProduct({
    suppliers: [$$D],
    factory: () => "A"
})

// @ts-expect-error - circular dependency
export const $$E = market.offer("E").asProduct({
    assemblers: [$$H],
    factory: () => "E"
})

// @ts-expect-error - circular dependency
export const $$I = market.offer("I").asProduct({
    suppliers: [$$L],
    factory: () => "I"
})
