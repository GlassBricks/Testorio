# Changelog

**NOTE**: changes to the _mod/library_ are in [src/Changelog.txt](src/changelog.txt). This changelog is for the NPM package.

## 1.6.0

- Updated types to match mod version 1.6.0
- Luassert is now optional, add `types: ["luassert-tstl"]` to your tsconfig.json if you use it.

## 1.5.0

- Updated types to match mod version 1.5.0

## 1.4.0

- Updated types to match mod version 1.4.0

## 1.1.0

- Updated to match mod version 1.1.0.

## 1.0.0

- Definitions have no changes since previous version. This release is only to match mod version.
- Dependency on `typed-factorio` has been increased to `^1.0.0`.

## 0.5.0

- Updated definitions to Testorio v0.5.0

## 0.4.3

- Type definitions: you can now pass readonly arrays to `each` test definitions.

## 0.4.1

- Fixed not having @noSelfInFile in test util module definitions.

## 0.4.0

- Updated definitions to Testorio 0.4.0

## 0.3.4

- Use peer dependencies on package instead of normal dependencies. This should hopefully help with package resolution issues.

## 0.3.0

- **BREAKING**: Moved factorio-mod-linker to separate npm package `testorio-tools` to reduce dependencies. The `testorio` npm package now only contains TypescriptToLua type definitions
- See [src/Changelog.txt](src/changelog.txt) for remaining changes.
- **NOTE**: Future changes will only be documented in [src/Changelog.txt](src/changelog.txt).

## 0.2.0

- Update to TypescriptToLua version 1.2.0. This itself brings minor performance improvements.

## 0.1.3

- Added more options for logging to config

## 0.1.0

- Initial release!
