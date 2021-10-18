export function enableAll(
  surface: LuaSurface,
  area: BoundingBox | string,
): void {
  if (typeof area === "string") {
    area = surface.get_script_area(area).area
  }
  for (const entity of surface.find_entities(area)) {
    entity.active = true
  }
}

export function disableAll(
  surface: LuaSurface,
  area: BoundingBox | string,
): void {
  if (typeof area === "string") {
    area = surface.get_script_area(area).area
  }
  for (const entity of surface.find_entities(area)) {
    entity.active = false
  }
}

export function enableEntitiesForTest(
  surface: LuaSurface,
  area: BoundingBox | string,
): void {
  enableAll(surface, area)
  afterTest(() => {
    disableAll(surface, area)
  })
}

export function testArea(
  surfaceId: uint | string,
  areaId: number | string | BoundingBox,
): LuaMultiReturn<[surface: LuaSurface, area: BoundingBox]> {
  const surface =
    game.get_surface(surfaceId) ?? error(`No surface with id ${surfaceId}`)
  const area =
    typeof areaId === "string" || typeof areaId === "number"
      ? surface.get_script_area(areaId).area
      : areaId
  enableEntitiesForTest(surface, area)
  return $multi(surface, area)
}
