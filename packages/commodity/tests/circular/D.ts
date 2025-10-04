import { market } from "./market"
import { serviceCSupplier } from "./C"

// @ts-expect-error - circular dependency
export const serviceDSupplier = market.offer("serviceD").asProduct({
    suppliers: [serviceCSupplier],
    factory: () => "serviceD"
})
