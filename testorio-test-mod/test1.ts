test("Pass", () => {
  assert.are_equal(2, 2)
})
test.skip("Skip", () => {
  error("Uh oh")
})
test.todo("TODO")
test.each([1, 2], "each %d", (v) => {
  assert.are_equal(v, 2)
})
test("In world", () => {
  assert.is_true(game.surfaces[1].count_entities_filtered({}) > 0)
})
