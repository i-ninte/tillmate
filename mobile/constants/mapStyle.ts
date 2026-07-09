/**
 * MapLibre style specs for TillMate.
 *
 * Two base maps:
 *   - `satellite` (default): ESRI World Imagery raster tiles. Free for non-
 *     commercial use; farmers use this to draw field boundaries over their
 *     actual crops.
 *   - `streets`: OpenStreetMap raster tiles as a labeled alternative. For
 *     production traffic beyond prototype, swap to a MapTiler or Stadia Maps
 *     free-tier key (change one URL in `TILE_URLS` below).
 *
 * A future Africa-optimised Atlas vector layer can be dropped in by adding
 * another entry to `TILE_URLS` and a matching style below — no React changes.
 */

export type BaseMap = 'satellite' | 'streets';

export const TILE_URLS = {
  satellite:
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  streets: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
};

export const ATTRIBUTIONS: Record<BaseMap, string> = {
  satellite: 'Tiles © Esri',
  streets: '© OpenStreetMap contributors',
};

function rasterStyle(url: string, attribution: string) {
  return {
    version: 8 as const,
    sources: {
      base: {
        type: 'raster' as const,
        tiles: [url],
        tileSize: 256,
        attribution,
        maxzoom: 19,
      },
    },
    layers: [
      {
        id: 'base-layer',
        type: 'raster' as const,
        source: 'base',
      },
    ],
  };
}

export function mapStyleFor(base: BaseMap) {
  return rasterStyle(TILE_URLS[base], ATTRIBUTIONS[base]);
}

/**
 * MapLibre expects a style URL or a JSON string; native and web both accept
 * the JSON string form. This helper returns it pre-serialised.
 */
export function mapStyleJSONFor(base: BaseMap): string {
  return JSON.stringify(mapStyleFor(base));
}
