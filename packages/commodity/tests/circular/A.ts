import { market } from "./market"
import { serviceDSupplier } from "./D"

// @ts-expect-error - circular dependency
export const serviceASupplier = market.offer("serviceA").asProduct({
    suppliers: [serviceDSupplier],
    factory: () => "serviceA"
})
