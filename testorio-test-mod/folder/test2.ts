import { test_area } from "__testorio__/testUtil/areas"

test("Area", () => {
  const id = game.get_surface(1)!.get_script_areas()[0].id
  const [surface, area] = test_area(1, id)
  assert.is_true(surface.count_entities_filtered({ area }) > 0)
})

let foo = 0
test("Reload", () => {
  foo = 1
}).after_mod_reload(() => {
  assert.equal(foo, 0)
})
