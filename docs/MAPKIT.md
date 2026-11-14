# Apple Maps (MapKit JS) for the portal

The portal shows Google Maps until these are set. Then it switches to Apple Maps; Google is still used for
address search when adding sites.

## 1. Apple Developer (developer.apple.com → Certificates, Identifiers & Profiles)
1. **Identifiers → +** → choose **Maps IDs** → description "Wattle portal", identifier e.g. `maps.com.kezlahd.wattle`.
2. **Keys → +** → name "Wattle MapKit JS" → tick **MapKit JS** → Configure → pick the Maps ID from step 1 → Save →
   Continue → Register.
3. **Download** the `.p8` file (you can only download it once) and note the **Key ID** shown on that page.
4. Your **Team ID** is in the top-right of the developer site (Membership details).

## 2. Vercel (project → Settings → Environment Variables, Production and Preview)
| Name | Value |
|---|---|
| `MAPKIT_TEAM_ID` | your Team ID |
| `MAPKIT_KEY_ID` | the Key ID from step 1.3 |
| `MAPKIT_PRIVATE_KEY` | the whole contents of the `.p8` file, including the BEGIN/END lines |
| `NEXT_PUBLIC_MAP_PROVIDER` | `apple` |

The private key stays on the server: `/api/mapkit-token` signs a 30-minute token for each browser, tied to the page's
origin. Redeploy after adding the variables. To go back to Google, remove `NEXT_PUBLIC_MAP_PROVIDER`.
