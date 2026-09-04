import { useEffect, useRef, useState } from 'react';
import { Box, ToggleButton, ToggleButtonGroup, useTheme } from '@mui/material';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// The ঘটনাস্থল on a real map: সড়ক and স্যাটেলাইট (Esri World Imagery). OSM's iframe embed could
// do neither — one fixed layer, no switcher — which is why this pulls in Leaflet.
//
// সড়ক follows the page so a bright white rectangle does not sit in the middle of a dark case
// file. It stays on OpenStreetMap's own tiles in both themes, inverted by CSS for dark: the
// keyless dark basemaps either stamp "API KEY REQUIRED" across every tile (CARTO) or carry only
// Latin labels (Esri), and OSM is what labels Bangladeshi places in Bangla.
//
// ponytail: attribution controls are off at the client's request. Both tile sets require credit
// (OSM under ODbL, Esri under their terms); credit them somewhere before this ships publicly.

// Leaflet resolves its default marker images by relative URL, which breaks under a bundler; these
// are the bundled asset URLs instead.
const icon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  shadowSize: [41, 41],
});

// Google's Bangladesh POI coverage is far denser than OSM's, so it is used when a key is
// configured. The key is compiled into the bundle like any VITE_ var — it is public, and must be
// restricted in Google Cloud (HTTP referrers + Maps Embed API only). Without a key the map falls
// back to Leaflet/OSM, so dev machines and self-hosted upazilas need nothing.
const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined;

// Dark সড়ক: invert the light tiles, rotate the hue back so water stays blue rather than turning
// orange, then desaturate.
//
// Darkness comes from CONTRAST, not brightness. After the inversion the ground is already near
// black and the labels are near white; brightness dims both together, so pulling it down to
// darken the ground took the text with it. Contrast pushes the two apart instead — ground
// blacker, labels brighter.
const DARK_MAP_FILTER = 'invert(1) hue-rotate(180deg) brightness(0.95) contrast(1.3) saturate(0.6)';

export default function LocationMap({
  lat, lon, height = 240, zoom = 13, layers = false,
}: {
  lat: number;
  lon: number;
  height?: number | string;
  /** 13 pulls back to roughly the union around the pin, so the ঘটনাস্থল reads in context. */
  zoom?: number;
  /** The সড়ক/স্যাটেলাইট switcher. Off by default: on the 240px inline map it covers a quarter
   *  of the view, and there is no room to make use of what it switches to. */
  layers?: boolean;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const dark = useTheme().palette.mode === 'dark';
  const [satellite, setSatellite] = useState(false);

  useEffect(() => {
    // Leaflet is only built when Google is not in play.
    if (GOOGLE_KEY || !el.current || map.current) return;

    const road = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      className: dark ? 'map-tiles-dark' : undefined,
    });
    const satellite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 19 },
    );
    // Imagery alone has no names on it, so the OSM label layer rides on top of the satellite view.
    const labels = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 19 },
    );

    map.current = L.map(el.current, {
      center: [lat, lon],
      zoom,
      layers: [road],
      attributionControl: false,
      scrollWheelZoom: false, // a page scroll should scroll the page, not zoom the map
    });

    L.marker([lat, lon], { icon }).addTo(map.current);

    if (layers) {
      L.control
        .layers(
          { 'সড়ক': road, 'স্যাটেলাইট': L.layerGroup([satellite, labels]) },
          undefined,
          { position: 'topright' },
        )
        .addTo(map.current);
    }

    return () => {
      map.current?.remove();
      map.current = null;
    };
    // `dark` is a dependency: switching theme rebuilds the map on the matching basemap.
  }, [lat, lon, zoom, dark, layers]);

  if (GOOGLE_KEY) {
    const src = `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_KEY}`
      + `&q=${lat},${lon}&zoom=${zoom}&maptype=${satellite ? 'satellite' : 'roadmap'}`
      // Bangla labels, and Bangladesh as the region so names resolve the local way.
      + '&language=bn&region=BD';

    return (
      <Box sx={{ position: 'relative', height, width: '100%' }}>
        <Box
          component="iframe"
          title="ঘটনাস্থল"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          src={src}
          sx={{
            width: '100%',
            height: '100%',
            border: (t) => `1px solid ${t.palette.divider}`,
            borderRadius: '14px',
            display: 'block',
            // The Embed API has no dark theme, so it gets the same inversion — never on
            // satellite, which would come out as a photographic negative.
            filter: dark && !satellite ? DARK_MAP_FILTER : undefined,
          }}
        />
        {layers && (
          <ToggleButtonGroup
            size="small"
            exclusive
            value={satellite ? 'sat' : 'road'}
            onChange={(_, v) => v && setSatellite(v === 'sat')}
            sx={{ position: 'absolute', top: 10, right: 10, bgcolor: 'background.paper', borderRadius: '10px' }}
          >
            <ToggleButton value="road">সড়ক</ToggleButton>
            <ToggleButton value="sat">স্যাটেলাইট</ToggleButton>
          </ToggleButtonGroup>
        )}
      </Box>
    );
  }


  return (
    <Box
      ref={el}
      sx={{
        height,
        width: '100%',
        borderRadius: '14px',
        border: (t) => `1px solid ${t.palette.divider}`,
        // Leaflet's panes sit above everything by default and would punch through dialogs.
        '& .leaflet-pane, & .leaflet-control': { zIndex: 1 },
        '& .leaflet-container': { borderRadius: '14px', fontFamily: 'inherit' },
        // Only the road layer carries the class — inverting satellite imagery would turn it into
        // a photographic negative.
        '& .map-tiles-dark': { filter: DARK_MAP_FILTER },
      }}
    />
  );
}
