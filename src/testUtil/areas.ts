export function enable_all(surface: LuaSurface, area: BoundingBox | string | number): void {
  if (typeof area === "string" || typeof area === "number") {
    area = surface.get_script_area(area).area
  }
  for (const entity of surface.find_entities(area)) {
    if (!entity.active) {
      error("Entity was already active before test run")
    }
    entity.active = true
  }
}

export function disable_all(surface: LuaSurface, area: BoundingBox | string | number): void {
  if (typeof area === "string" || typeof area === "number") {
    area = surface.get_script_area(area).area
  }
  for (const entity of surface.find_entities(area)) {
    entity.active = false
  }
}

export function test_area(
  surfaceId: uint | string,
  areaId: number | string | BoundingBox,
): LuaMultiReturn<[surface: LuaSurface, area: BoundingBox]> {
  const surface = game.get_surface(surfaceId) ?? error(`No surface with id ${surfaceId}`)
  let area: BoundingBox
  if (typeof areaId === "string" || typeof areaId === "number") {
    area = surface.get_script_area(areaId)?.area
  } else {
    area = areaId
  }
  if (!area) {
    error(`No area with name/id ${areaId} on surface "${surface.name}"`)
  }
  after_test(() => {
    disable_all(surface, area)
  })
  for (const entity of surface.find_entities(area)) {
    if (entity.active) {
      rendering.draw_circle({
        color: { r: 255, g: 40, b: 40 },
        radius: 0.5,
        target: entity,
        surface,
        filled: false,
      })
      error(
        "Not all entities were inactive in area before test run.\n" +
          "This may cause inconsistent behavior if other tests are also running.\n" +
          "You can use the enabler tool in-game to deactivate all entities in the area.",
      )
    }
    entity.active = true
  }
  return $multi(surface, area)
}
