# Marine Nav — GitHub Pages

A static, mobile-first marine GPS web app with a satellite basemap, optional OpenSeaMap seamark overlay, iPhone GPS/compass, waypoints, route sketching, track recording, and GPX export.

## Included features
- Satellite imagery base layer (Esri World Imagery) and OpenStreetMap street layer
- Optional OpenSeaMap seamark symbols overlay
- iPhone geolocation and device-orientation compass (browser/device support required)
- Speed in knots and course over ground when the GPS device provides them
- Waypoints, rename/delete, simple route sketching and distance in nautical miles
- Track recording and GPX export
- Local storage for waypoints and tracks
- Service worker caches the app shell for limited offline launch

## Important chart and safety limits
**This is not a certified chartplotter and is not a replacement for official nautical charts.** The OpenSeaMap overlay displays seamark information; it does not automatically provide depth contours, soundings, reef boundaries, or guaranteed hazard coverage. Do not assume safe water based on satellite imagery.

The app uses Esri World Imagery tiles and OpenStreetMap tiles. Their availability, terms, attribution requirements, and permitted use may change. This project does not cache third-party map tiles for offline use. The service worker caches only the app files. To add offline charts, use a chart provider whose licence explicitly permits offline storage and use its approved tile/download mechanism.

## Deploy to your existing GitHub repository
1. Download and unzip `marine-nav-github-pages.zip`.
2. Open your existing Marine Nav repository on GitHub.
3. Make a backup of the current files, especially `index.html`, `app.js`, and `style.css`.
4. Upload the files and folders from this package to the repository root (not the enclosing ZIP folder). Replace same-named files when prompted.
5. Commit the changes to your published branch, normally `main`.
6. Open **Settings → Pages** and confirm the source is **Deploy from a branch**, branch **main**, folder **/(root)**. Save if GitHub asks.
7. Wait for the Pages deployment to complete. Open the site URL shown under Settings → Pages.
8. On iPhone, open the site in Safari and allow Location access. For compass heading, tap **Start GPS** and allow motion/orientation access if prompted.
9. Optional: Safari Share → **Add to Home Screen**.

If your current Pages site uses a `/docs` folder or a different branch, upload the files to that configured location instead.

## How to use
- Tap **Start GPS**. A GPS fix can take time and needs location permission.
- Tap the map to add a waypoint, or press **＋** to add one at the current boat location/map center.
- Tap a waypoint's **Route** button to add it to the route. Use the route icon in the map controls to turn route mode on, then tap map points to sketch a route.
- Press **Record track** while moving. Press **Stop recording** when finished, then **Export GPX**.
- Use the layers button to switch satellite/street maps and toggle seamark markers.

## Technical notes
- Static HTML/CSS/JS; no server-side component or API key required for the current satellite source.
- Leaflet is loaded from a CDN. The app shell may open offline after it has been cached, but the map may be blank without internet because third-party tiles and the Leaflet CDN are not bundled.
- iPhone heading readings depend on device/browser permissions and may be unavailable or inaccurate. GPS speed/course may be absent at low speeds; the app shows 0.0 knots if GPS speed is not provided.
- Never use this app as the sole source for navigation decisions.
