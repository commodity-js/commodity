import { describe, it, expect } from "vitest"
import { register } from "#index"

describe("Caching System", () => {
    it("should cache unchanged services and resupply observed services", () => {
        // Service A - will be overridden
        const serviceA = register("serviceA").asService({
            factory: () => ({
                message: "Hello from Service A",
                timestamp: Date.now()
            })
        })

        // Service B - observes serviceA, so it will be automatically resupplied when serviceA changes
        const serviceB = register("serviceB").asService({
            factory: (supplies: $<[typeof serviceA]>) => {
                const a = supplies.serviceA()
                return {
                    message: `Service B using: ${a.message}`,
                    timestamp: Date.now(),
                    dependencyTimestamp: a.timestamp
                }
            },
            team: [serviceA],
            observe: ["serviceA"] // This service observes serviceA
        })

        // Service C - doesn't observe anything, so it will be cached
        const serviceC = register("serviceC").asService({
            factory: () => ({
                message: "Service C is cached",
                timestamp: Date.now()
            })
        })

        // Service D - observes serviceB, so it will be resupplied when serviceB changes
        const serviceD = register("serviceD").asService({
            factory: (supplies: $<[typeof serviceB]>) => {
                const b = supplies.serviceB()
                return {
                    message: `Service D using: ${b.message}`,
                    timestamp: Date.now(),
                    dependencyTimestamp: b.timestamp
                }
            },
            team: [serviceB],
            observe: ["serviceB"] // This service observes serviceB
        })

        // Create a main service that includes all services in its team for testing
        const mainService = register("main").asService({
            factory: (
                supplies: $<
                    [
                        typeof serviceA,
                        typeof serviceB,
                        typeof serviceC,
                        typeof serviceD
                    ]
                >
            ) => {
                return {
                    serviceA: supplies[serviceA.id](),
                    serviceB: supplies[serviceB.id](),
                    serviceC: supplies[serviceC.id](),
                    serviceD: supplies[serviceD.id]()
                }
            },
            team: [serviceA, serviceB, serviceC, serviceD]
        })

        // Create the initial supplies
        const initialSupplies = mainService.supply({})

        const initialA = initialSupplies.value.serviceA
        const initialB = initialSupplies.value.serviceB
        const initialC = initialSupplies.value.serviceC
        const initialD = initialSupplies.value.serviceD

        // Wait a bit to ensure timestamps are different
        setTimeout(() => {
            // Override serviceA - this should trigger resupply of serviceB and serviceD
            // but serviceC should remain cached
            const newSupplies = initialSupplies.resupply({
                serviceA: {
                    message: "Hello from Service A (UPDATED)",
                    timestamp: Date.now()
                }
            })

            const newA = newSupplies.value.serviceA
            const newB = newSupplies.value.serviceB
            const newC = newSupplies.value.serviceC
            const newD = newSupplies.value.serviceD

            // Service A should be updated
            expect(newA.message).toBe("Hello from Service A (UPDATED)")
            expect(newA.timestamp).not.toBe(initialA.timestamp)

            // Service B should be resupplied (because it observes serviceA)
            expect(newB.message).toContain("UPDATED")
            expect(newB.timestamp).not.toBe(initialB.timestamp)
            expect(newB.dependencyTimestamp).toBe(newA.timestamp)

            // Service C should be cached (same timestamp)
            expect(newC.timestamp).toBe(initialC.timestamp)

            // Service D should be resupplied (because it observes serviceB)
            expect(newD.timestamp).not.toBe(initialD.timestamp)
            expect(newD.dependencyTimestamp).toBe(newB.timestamp)

            // Verify caching behavior
            expect(newC.timestamp).toBe(initialC.timestamp) // Cached
            expect(newB.timestamp).not.toBe(initialB.timestamp) // Resupplied
            expect(newD.timestamp).not.toBe(initialD.timestamp) // Resupplied
        }, 100)
    })

    it("should handle recursive dependency chains correctly", () => {
        const serviceA = register("serviceA").asService({
            factory: () => ({ value: "A", timestamp: Date.now() })
        })

        const serviceB = register("serviceB").asService({
            factory: (supplies: $<[typeof serviceA]>) => {
                const a = supplies.serviceA()
                return { value: `B(${a.value})`, timestamp: Date.now() }
            },
            team: [serviceA],
            observe: ["serviceA"]
        })

        const serviceC = register("serviceC").asService({
            factory: (supplies: $<[typeof serviceB]>) => {
                const b = supplies.serviceB()
                return { value: `C(${b.value})`, timestamp: Date.now() }
            },
            team: [serviceB],
            observe: ["serviceB"]
        })

        const serviceD = register("serviceD").asService({
            factory: (supplies: $<[typeof serviceC]>) => {
                const c = supplies.serviceC()
                return { value: `D(${c.value})`, timestamp: Date.now() }
            },
            team: [serviceC],
            observe: ["serviceC"]
        })

        // Create a main service that includes all services for testing
        const mainService = register("main").asService({
            factory: (
                supplies: $<
                    [
                        typeof serviceA,
                        typeof serviceB,
                        typeof serviceC,
                        typeof serviceD
                    ]
                >
            ) => {
                return {
                    serviceA: supplies[serviceA.id](),
                    serviceB: supplies[serviceB.id](),
                    serviceC: supplies[serviceC.id](),
                    serviceD: supplies[serviceD.id]()
                }
            },
            team: [serviceA, serviceB, serviceC, serviceD]
        })

        const supplies = mainService.supply({})
        const initialA = supplies.value.serviceA
        const initialD = supplies.value.serviceD

        // Override serviceA - this should cascade through B, C, and D
        const newSupplies = supplies.resupply({
            serviceA: { value: "A_NEW", timestamp: Date.now() }
        })

        const newA = newSupplies.value.serviceA
        const newD = newSupplies.value.serviceD

        // Verify the cascade worked
        expect(newA.value).toBe("A_NEW")
        expect(newD.value).toBe("D(C(B(A_NEW)))")
        expect(newA.timestamp).not.toBe(initialA.timestamp)
        expect(newD.timestamp).not.toBe(initialD.timestamp)
    })

    it("should not resupply services that don't observe changed services", () => {
        const serviceA = register("serviceA").asService({
            factory: () => ({ value: "A", timestamp: Date.now() })
        })

        const serviceB = register("serviceB").asService({
            factory: () => ({ value: "B", timestamp: Date.now() })
            // No observe array - independent service
        })

        const serviceC = register("serviceC").asService({
            factory: (supplies: $<[typeof serviceA, typeof serviceB]>) => {
                const a = supplies.serviceA()
                const b = supplies.serviceB()
                return {
                    value: `C(${a.value},${b.value})`,
                    timestamp: Date.now()
                }
            },
            team: [serviceA, serviceB],
            observe: ["serviceA"] // Only observes serviceA
        })

        // Create a main service that includes all services for testing
        const mainService = register("main").asService({
            factory: (
                supplies: $<[typeof serviceA, typeof serviceB, typeof serviceC]>
            ) => {
                return {
                    serviceA: supplies[serviceA.id](),
                    serviceB: supplies[serviceB.id](),
                    serviceC: supplies[serviceC.id]()
                }
            },
            team: [serviceA, serviceB, serviceC]
        })

        const supplies = mainService.supply({})
        const initialA = supplies.value.serviceA
        const initialB = supplies.value.serviceB
        const initialC = supplies.value.serviceC

        // Override serviceB - serviceC should NOT be resupplied since it doesn't observe serviceB
        const newSupplies = supplies.resupply({
            serviceB: { value: "B_NEW", timestamp: Date.now() }
        })

        const newA = newSupplies.value.serviceA
        const newB = newSupplies.value.serviceB
        const newC = newSupplies.value.serviceC

        // Service A should be cached (not observed)
        expect(newA.timestamp).toBe(initialA.timestamp)

        // Service B should be updated
        expect(newB.value).toBe("B_NEW")
        expect(newB.timestamp).not.toBe(initialB.timestamp)

        // Service C should be cached (doesn't observe serviceB)
        expect(newC.timestamp).toBe(initialC.timestamp)
    })
})
