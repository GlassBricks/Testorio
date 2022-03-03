# Changelog

**NOTE**: changes on the _mod/library_ past version 0.3.0 will be documented only in [src/Changelog.txt](src/Changelog.txt). This changelog will only be for the NPM package(s).

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
- See [src/Changelog.txt](src/Changelog.txt) for remaining changes.
- **NOTE**: Future changes will only be documented in [src/Changelog.txt](src/Changelog.txt).

## 0.2.0

- Update to TypescriptToLua version 1.2.0. This itself brings minor performance improvements.

## 0.1.3

- Added more options for logging to config

## 0.1.0

- Initial release!
