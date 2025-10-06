import { market } from "@/market"
import type { Post, User } from "@/api"

export const ctx = {
    $$session: market
        .offer("session")
        .asResource<[User, (user: User) => void]>(),
    $$post: market.offer("post").asResource<Post>()
}
