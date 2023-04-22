# THIS PROJECT HAS MOVED TO [Factorio Test](https://github.com/GlassBricks/FactorioTest)

# Testorio

Testing framework for factorio mods.

```lua
describe("the factory", function()
    it("must grow", function()
        assert.is_true(get_factory_size() > old_factory_size)
    end)
end)

```

- Modern test framework inspired by [busted](https://olivinelabs.com/busted/)
- Bundled [luassert](https://github.com/Olivine-Labs/luassert) for assertions
- Test scenarios for in-game setups and automatic test runs
- Integration with [factorio debug adapter](https://github.com/justarandomgeek/vscode-factoriomod-debug), and [typed-factorio](https://github.com/GlassBricks/typed-factorio)

## Getting started

See the [Getting started](https://github.com/GlassBricks/Testorio/wiki/Getting-Started) wiki page for a quick start.

---

Have any questions or comments? Feel free to start a [discussion on GitHub](https://github.com/GlassBricks/Testorio/discussions). Want to report a bug or request a feature? You can open an [issue](https://github.com/GlassBricks/Testorio/issues).
