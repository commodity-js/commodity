import memo from "memoize"

// Core utility types
type Merge<U> = (U extends any ? (k: U) => void : never) extends (
    k: infer I
) => void
    ? I
    : never

type Resource<ID extends string, VALUE> = {
    id: ID
    value: VALUE
}

type ResourceActions<ID extends string, VALUE> = {
    put: (value: VALUE) => Resource<ID, VALUE> & ResourceActions<ID, VALUE>
}

type ResourceRegistration<ID extends string, VALUE> = {
    id: ID
    isResource: true
    put: (value: VALUE) => Resource<ID, VALUE> & ResourceActions<ID, VALUE>
}

type Service<
    ID extends string,
    VALUE,
    TOSUPPLY extends Record<never, never>,
    RESUPPLY extends boolean = false
> = Resource<ID, VALUE> & ServiceActions<ID, TOSUPPLY, VALUE, RESUPPLY>

type SupplyAction<
    ID extends string,
    VALUE,
    TOSUPPLY extends Record<never, never>
> = (toSupply: TOSUPPLY) => Service<ID, VALUE, TOSUPPLY, true>

type ServiceActions<
    ID extends string,
    TOSUPPLY extends Record<never, never>,
    VALUE,
    RESUPPLY extends boolean = false
> = (RESUPPLY extends true
    ? {
          resupply: SupplyAction<ID, VALUE, TOSUPPLY>
      }
    : {
          supply: SupplyAction<ID, VALUE, TOSUPPLY>
      }) & {
    put: (
        value: VALUE
    ) => Resource<ID, VALUE> & ServiceActions<ID, TOSUPPLY, VALUE, true>
}
type ServiceRegistration<
    ID extends string,
    TOSUPPLY extends Record<never, never>,
    VALUE
> = {
    id: ID
    isService: true
    preload: boolean
    hire: (...team: any[]) => ServiceActions<ID, any, VALUE>
} & ServiceActions<ID, TOSUPPLY, VALUE>

type Registration<
    ID extends string,
    TOSUPPLY extends Record<never, never>,
    VALUE
> = ServiceRegistration<ID, TOSUPPLY, VALUE> | ResourceRegistration<ID, VALUE>

type SupplyMapFromResources<RESOURCES extends Resource<any, any>[]> =
    RESOURCES extends []
        ? Record<never, never>
        : Merge<
              {
                  [K in keyof RESOURCES]: {
                      [ID in RESOURCES[K]["id"]]: RESOURCES[K]
                  }
              }[number]
          >

type SupplyMapFromRegistrations<
    REGISTRY extends Registration<string, any, any>[]
> = {
    [REGISTRATION in REGISTRY[number] as REGISTRATION["id"]]: REGISTRATION extends ServiceRegistration<
        string,
        any,
        any
    >
        ? ReturnType<REGISTRATION["supply"]>
        : REGISTRATION extends ResourceRegistration<string, any>
        ? ReturnType<REGISTRATION["put"]>
        : never
}

type Supplies<REGISTRY extends Registration<string, any, any>[]> = (<
    ID extends keyof SupplyMapFromRegistrations<REGISTRY>
>(
    id: ID
) => SupplyMapFromRegistrations<REGISTRY>[ID] extends { value: infer VALUE }
    ? VALUE
    : never) &
    SupplyMapFromRegistrations<REGISTRY>

export type $<REGISTRY extends Registration<string, any, any>[]> =
    Supplies<REGISTRY>

export type ToSupply<TEAM extends ServiceRegistration<string, any, any>[]> =
    Merge<
        {
            [I in keyof TEAM]: TEAM[I] extends ServiceRegistration<
                string,
                infer TOSUPPLY,
                any
            >
                ? TOSUPPLY
                : never
        }[number]
    >

export const register = <ID extends string>(id: ID) => {
    return {
        asResource: <CONSTRAINT>() => {
            const resource = {
                id,
                isResource: true as const,
                put: <VALUE extends CONSTRAINT>(value: VALUE) => {
                    return {
                        id,
                        value,
                        put: resource.put
                    }
                },
                _constraint: null as unknown as CONSTRAINT
            }
            return resource
        },
        asService: <
            SUPPLIES extends Record<never, never>,
            VALUE,
            TEAM extends ServiceRegistration<string, any, any>[] = []
        >({
            factory,
            team = [] as unknown as TEAM,
            preload = false
        }: {
            factory: (supplies: SUPPLIES) => VALUE
            team?: TEAM
            preload?: boolean
        }) => {
            const actions = {
                put: (value: VALUE) => {
                    return {
                        id,
                        value,
                        resupply: actions.supply(team),
                        put: actions.put
                    }
                },
                supply:
                    <FINALTEAM extends ServiceRegistration<string, any, any>[]>(
                        team: FINALTEAM
                    ) =>
                    (
                        toSupply: Omit<
                            SUPPLIES,
                            keyof SupplyMapFromRegistrations<FINALTEAM>
                        > &
                            ToSupply<FINALTEAM>
                    ) => {
                        const value = factory(
                            /**
                             * A type assertion that tells TypeScript to trust us that the resulting
                             * supplies is compatible with the generic type `SUPPLIES`. This is a necessary
                             * type hole because TypeScript's static analysis can't remember that when you Omit properties
                             * and put them back, you end up with the original type. Here toSupply is type guarded to be SUPPLIES - Services<team>,
                             * and hire merges toSupply and team services together, so the result must extend SUPPLIES. But TS cannot guarantee it.
                             */
                            hire(team).supply(
                                toSupply ?? {}
                            ) as unknown as SUPPLIES
                        )
                        return {
                            id,
                            value,
                            resupply: actions.supply(team),
                            put: actions.put
                        }
                    }
            }

            const service = {
                id,
                isService: true as const,
                preload,
                put: actions.put,
                supply: actions.supply(team),
                hire: <
                    const HIRED_TEAM extends readonly ServiceRegistration<
                        string,
                        any,
                        any
                    >[]
                >(
                    ...hiredTeam: HIRED_TEAM
                ) => {
                    return {
                        supply: actions.supply([...team, ...hiredTeam]),
                        put: actions.put
                    }
                }
            }

            return service
        }
    }
}

function hire(services: ServiceRegistration<string, any, any>[]) {
    return {
        supply: (supplied: Record<string, any>) => {
            const supplies: any = (id: string) => {
                const resource = supplies[id]
                if (!resource?.value) {
                    throw new Error(`Unsatisfied dependency: ${id}`)
                }
                return resource.value
            }

            Object.defineProperties(
                supplies,
                Object.getOwnPropertyDescriptors(supplied)
            )

            for (const service of services) {
                if (
                    Object.prototype.hasOwnProperty.call(supplied, service.id)
                ) {
                    continue
                }

                Object.defineProperty(supplies, service.id, {
                    get: memo(() => service.supply(supplies)),
                    enumerable: true,
                    configurable: true
                })
            }

            // Preload services that have preload: true
            const preloadPromises = services
                .filter(
                    (service) =>
                        service.preload &&
                        !Object.prototype.hasOwnProperty.call(
                            supplied,
                            service.id
                        )
                )
                .map((service) => {
                    // Access the getter to trigger memoization
                    try {
                        return Promise.resolve(supplies[service.id])
                    } catch (error) {
                        // If preloading fails, we don't want to break the entire supply chain
                        // The error will be thrown again when the dependency is actually needed
                        return Promise.resolve(null)
                    }
                })

            // Execute preloading in parallel (non-blocking)
            if (preloadPromises.length > 0) {
                Promise.all(preloadPromises).catch(() => {
                    // Silently ignore preload errors - they'll be thrown when actually accessed
                })
            }

            return supplies
        }
    }
}

export function index<RESOURCES extends Resource<any, any>[]>(
    ...resources: RESOURCES
) {
    return resources.reduce(
        (acc, r) => ({ ...acc, [r.id]: r }),
        {}
    ) as SupplyMapFromResources<RESOURCES>
}

export type Narrow<
    RESOURCEREGISTRATION extends {
        id: string
        _constraint: any
    },
    VALUE extends RESOURCEREGISTRATION["_constraint"]
> = ResourceRegistration<RESOURCEREGISTRATION["id"], VALUE>
