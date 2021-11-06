export function enable_all(surface: LuaSurface, area: BoundingBox | string): void {
  if (typeof area === "string") {
    area = surface.get_script_area(area).area
  }
  for (const entity of surface.find_entities(area)) {
    entity.active = true
  }
}

export function disable_all(surface: LuaSurface, area: BoundingBox | string): void {
  if (typeof area === "string") {
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
  enable_all(surface, area)
  after_test(() => {
    disable_all(surface, area)
  })
  return $multi(surface, area)
}
