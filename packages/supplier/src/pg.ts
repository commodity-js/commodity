type Test<T, U> = T extends U ? T[] : U[]
type a = Test<"c", "a" | "b">
