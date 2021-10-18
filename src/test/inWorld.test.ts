import { testArea } from "../scenarioTools/areas"

test("inWorld", () => {
  const [surface, area] = testArea(1, "Test1")
  const chest = surface.find_entities_filtered({
    area,
    name: "steel-chest",
  })[0]
  assert.equal(
    0,
    chest.get_inventory(defines.inventory.chest)!.get_item_count("iron-plate"),
  )
  async()
  afterTicks(150, () => {
    assert.equal(
      5,
      chest
        .get_inventory(defines.inventory.chest)!
        .get_item_count("iron-plate"),
    )
    done()
  })
})
