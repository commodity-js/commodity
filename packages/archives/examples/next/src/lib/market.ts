import { createMarket } from "supplier"
import memo, { memoizeClear } from "memoize"

export const market = createMarket({
    memoFn: ({ unpack }) => memo(unpack),
    recallFn: (product) => {
        memoizeClear(product.unpack)
    }
})
