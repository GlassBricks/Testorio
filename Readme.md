# Testorio

Elegant testing framework for factorio mods.

```lua
describe("the factory", function()
  it("must grow", function()
    async()
    local old_factory_size = get_factory_size()
    expand_dah_factory()
    after_ticks(1000, function()
      assert.is_true(get_factory_size() > old_factory_size)
      done()
    end)
  end)
end)

```

Run automated and configurable tests. Test real setups in-game, no mocking testing necessary!

Features include:

- Modern test framework inspired by [busted](https://olivinelabs.com/busted/)
- Bundled [luassert](https://github.com/Olivine-Labs/luassert) for your assertions
- Create in-game setups in test scenarios
- Integration with [factorio debug adapter](https://github.com/justarandomgeek/vscode-factoriomod-debug), and [typed-factorio](https://github.com/GlassBricks/typed-factorio)

## Getting started

See the [Getting started](https://github.com/GlassBricks/Testorio/wiki/Getting-Started) wiki page for setup instructions.

---- 

Have any questions or comments? Feel free to start a [discussion on GitHub](https://github.com/GlassBricks/Testorio/discussions). Want to report a bug or request a feature? You can open an [issue on GitHub](https://github.com/GlassBricks/Testorio/issues).

