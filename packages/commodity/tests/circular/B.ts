import { market } from "./market"
import { $$A, $$E, $$I } from "./A"

// @ts-expect-error - circular dependency
export const $$B = market.offer("B").asProduct({
    suppliers: [$$A],
    factory: () => "B"
})

// @ts-expect-error - circular dependency
export const $$F = market.offer("F").asProduct({
    assemblers: [$$E],
    factory: () => "F"
})

// @ts-expect-error - circular dependency
export const $$J = market.offer("J").asProduct({
    assemblers: [$$I],
    factory: () => "J"
})
