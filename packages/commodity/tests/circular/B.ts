import { market } from "./market"
import { serviceASupplier } from "./A"

// @ts-expect-error - circular dependency
export const serviceBSupplier = market.offer("serviceB").asProduct({
    suppliers: [serviceASupplier],
    factory: () => "serviceB"
})
