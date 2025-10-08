import { market } from "./market"
import { $$C, $$G, $$K } from "./C"

// @ts-expect-error - circular dependency
export const $$D = market.offer("D").asProduct({
    suppliers: [$$C],
    factory: () => "D"
})

// @ts-expect-error - circular dependency
export const $$H = market.offer("H").asProduct({
    assemblers: [$$G],
    factory: () => "H"
})

// @ts-expect-error - circular dependency
export const $$L = market.offer("L").asProduct({
    assemblers: [$$K],
    factory: () => "L"
})
