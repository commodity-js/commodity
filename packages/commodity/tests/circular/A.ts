import { market } from "./market"
import { $$D, $$H } from "./D"

// @ts-expect-error - circular dependency
export const $$A = market.offer("A").asProduct({
    suppliers: [$$D],
    factory: () => "A"
})

export const $$E = market.offer("E").asProduct({
    assemblers: [],
    factory: () => "E"
})
