# Troubleshooting and FAQ

### I get the following Typescript error: "The inferred type of this node exceeds the maximum length the compiler will serialize. An explicit type annotation is needed TS(7056)"

This is unfortunately expected if you have declaration: true in your tsconfig.json. Commodity heavily relies on recursive types which cannot be serialized to a declaration file when your dependency graph becomes too deep. If your app is not a library depended upon by other users, you should turn declarations off, and this error will go away. Otherwise, you need to follow what the error message says: Provide some explicit type annotations to break the recursive chain. You should type some of your ProductSuppliers explicitely by importing the ProductSupplier type utility from "commodity" and providing the generic types required.

### Can I use Commodity with vanilla Javascript

Commodity has been designed with a Typescript-first mindset, but nothing stops you from using it without Typescript, but you'd lose on a lot of Commodity's power. Some basic runtime validations of API inputs have been added for this scenario.

### I'm getting runtime circular dependencies errors

Typescript detects circular dependencies automatically by setting the type of vars stuck in the dependency loop to any. This will not show as an error however unless you specify noImplicitAny: true in your tsconfig.json.

### My Typescript development experience (e.g. ts linter, ts IntelliSense, etc.) becomes incredibly slow or unresponsive

Commodity's recursive type are complex, but they should not have a heavy impact on Typescript's performance because they are designed to be lazily evaluated by Typescript's compiler. However, some VSCode Typescript extensions might try to evaluate some types early to provide more detailed Type IntelliSence, which will get them stuck in a deep recursive loop. I had this issue using the VSCode extension ["Prettify TypeScript: Better Type Previews"](https://open-vsx.org/extension/MylesMurphy/prettify-ts), which expands types one level deep by default (just set max-depth to 0 in settings should fix the issue).

The popular ["Pretty TypeScript Errors"](https://open-vsx.org/extension/yoavbls/pretty-ts-errors) extension doesn't have this issue by default, but may have a setting to expand types that may trigger the issue.
