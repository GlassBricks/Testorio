import { test_area } from "__testorio__/testUtil/areas"

test("Area", () => {
  const [surface, area] = test_area(1, "1")
  assert.is_true(surface.count_entities_filtered({ area }) > 0)
})
