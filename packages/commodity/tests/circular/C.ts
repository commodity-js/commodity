import { market } from "./market"
import { serviceBSupplier } from "./B"

// @ts-expect-error - circular dependency
export const serviceCSupplier = market.offer("serviceC").asProduct({
    suppliers: [serviceBSupplier],
    factory: () => "serviceC"
})
