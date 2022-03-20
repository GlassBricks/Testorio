// noinspection JSUnusedGlobalSymbols

export function get_area(
  surface: SurfaceIdentification,
  area: number | string | BoundingBox,
): LuaMultiReturn<[surface: LuaSurface, area: BoundingBox]> {
  if (typeof surface === "string" || typeof surface === "number") {
    surface = game.get_surface(surface) ?? error(`Surface with id/name ${surface} not found`)
  }
  if (typeof area === "string" || typeof area === "number") {
    area = surface.get_script_area(area)?.area ?? error(`Area with id/name ${area} not found`)
  }
  return $multi(surface, area)
}

export function enable_all(
  surface: SurfaceIdentification,
  area: BoundingBox | string | number,
): LuaMultiReturn<[surface: LuaSurface, area: BoundingBox]> {
  ;[surface, area] = get_area(surface, area)
  for (const entity of surface.find_entities(area)) {
    if (!entity.active) {
      error("Entity was already active before test run")
    }
    entity.active = true
  }
  return $multi(surface, area)
}

export function disable_all(
  surface: SurfaceIdentification,
  area: BoundingBox | string | number,
): LuaMultiReturn<[surface: LuaSurface, area: BoundingBox]> {
  ;[surface, area] = get_area(surface, area)
  for (const entity of surface.find_entities(area)) {
    entity.active = false
  }
  return $multi(surface, area)
}

export function test_area(
  surface: SurfaceIdentification,
  area: number | string | BoundingBox,
): LuaMultiReturn<[surface: LuaSurface, area: BoundingBox]> {
  ;[surface, area] = get_area(surface, area)
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
          "This may cause inconsistent behavior if other tests run before this one.\n" +
          "You can use the enabler tool in-game to deactivate all entities in the area.",
      )
    }
    entity.active = true
  }
  return $multi(surface, area)
}
