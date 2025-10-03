import { market } from "@/market"
import type { Post, User } from "@/api"

export const ctx = {
    sessionSupplier: market
        .offer("session")
        .asResource<[User, (user: User) => void]>(),
    postSupplier: market.offer("post").asResource<Post>()
}
