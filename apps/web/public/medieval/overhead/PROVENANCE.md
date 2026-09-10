# Overhead world sprite provenance

- Generated with the built-in image generation tool on September 7, 2026.
- All PNG files are original generated art copied unchanged from the tool output.
- The image inspection uses the alpha channel to measure sprite bounds. It does not alter raster pixels.
- The selected art uses a raised orthogonal camera, horizontal front edges, warm timber, weathered stone, and autumn foliage.
- The old isometric sprite atlases remain available in the parent directory.

## Asset inventory

| File | Dimensions | Layout | Transparent pixels |
| --- | --- | --- | --- |
| `buildings.png` | 1448 x 1086 | Four columns, three rows | 45.20% |
| `props.png` | 1448 x 1086 | Four columns, three rows | 50.36% |
| `landmarks.png` | 1254 x 1254 | Two columns, two rows | 44.44% |

## Render the sprites

The generated sheets have uneven cell margins. `atlas.json` records explicit `source` and `trim` rectangles, measured with an alpha threshold of 32. Each `anchor` is the bottom-center of its sprite, relative to its assigned source region. The PNG files preserve the original alpha channel.

In plain words: the rectangle list selects each complete building or tree from its sheet. The map places its base on the walking grid.

## Building prompt

Use case: stylized-concept. Asset type: original production transparent medieval RPG building sprite atlas.
Generate an RGBA PNG with REAL TRANSPARENT ALPHA, twelve isolated buildings in exactly FOUR COLUMNS by THREE ROWS. Canvas 4:3 landscape. Each cell fully separated with at least 10% transparent margins. No visible grid. Entire object inside its cell.
Crucial camera: classic top-down 16-bit RPG raised orthographic camera, looking straight at each building's FRONT wall from above. The front facade is a horizontal rectangle. The roofs recede straight UP the image, the long roof ridges are strictly HORIZONTAL. Both front building corners are at the SAME Y coordinate. NO isometric angle, NO diagonal footprint, NO diagonally skewed front wall, NO diamond foundations, NO perspective convergence. Think original handcrafted medieval town sprites on a square RPG walking grid.
Art: substantial deliberate chunky pixel clusters, simple readable architecture, uniform effective 64-96-pixel wide buildings enlarged on sheet. Large blocks of shaded roof and wall, three shades per material, NO fine noise or single-pixel sparkling details. Warm subdued low saturation palette: worn rust/clay roofs, charcoal-brown oak beams, dusty sandstone and taupe plaster, aged ochre straw; no white highlights, no black outlines, no neon. Like lovingly handplaced 16-bit pixel game assets with deep cozy material shading, consistent modest afternoon light. Door and window scale consistent. Front wall only about lower one-third of sprite; roof is dominant top two-thirds. No groundplate or floor below any building. Silhouettes compact and orthogonal, roof overhangs allowed.
EXACT row-major order:
ROW 1: 1 clan hall, broad timber longhouse with weathered russet gabled roof, central double doorway, muted golden cloth above door. 2 small cottage, dusty plaster and exposed beams, aged straw roof, small stone chimney. 3 lumber yard, horizontal open timber shelter with plank roof, stacked logs under shelter, saw stump. 4 mine entrance, low taupe rocky face framing straight-on square timber entrance, small dark ore cart immediately beside door.
ROW 2: 5 farm shed, small straw-roofed timber shed and neat rectangular fenced wheat plot, no dirt backdrop. 6 watchtower, chunky narrow rough-stone base, timber upper watch platform with small horizontal-ridge cap roof, faded red pennant. 7 well, little round stone well with two vertical posts and a tiny horizontal-ridge wooden roof. 8 storehouse, broad plank barn with weathered slate-brown roof, large center doors, two crates beside it.
ROW 3: 9 tavern, cozy two-story timber and taupe plaster inn, warm terracotta roof, hanging blank wooden round sign, little canopy. 10 forge, dark stone workshop with chimney, front-facing open hearth and anvil, tiny dull amber coals. 11 market, two front-facing wooden stalls with aged ochre and brick red awnings, baskets. 12 chapel, small humble stone chapel, dark faded slate roof and narrow front belfry, arched wood doorway.
Constraints: All twelve have exact same raised orthogonal camera and same chunky pixel size. REAL empty alpha outside silhouettes, no painted checkerboard, no background color, no sky, no scenery, no letters or labels, no logo or UI, no people, no ground diamonds. No isometric buildings. Preserve complete uncropped tops and bottoms.

## Prop prompt

Use case: stylized-concept. Asset type: production original medieval RPG environment PROP atlas, transparent PNG.
Generate twelve separate silhouettes in a FOUR COLUMN by THREE ROW regular grid. Canvas landscape 4:3. Every sprite centered in its own cell with generous empty transparent margins, bottom at 85% cell height. All exterior pixels and internal gaps are GENUINE TRANSPARENT ALPHA, no fake checkerboard. No ground plates or shadows beyond silhouette.
Camera and medium: classic 16-bit RPG raised orthogonal camera, looking straight at the front while seeing top surfaces. Horizontal front edges, depth goes straight upward, NEVER diagonal or isometric, never diamond footprints. Strict chunky pixel-art appearance: intentional square pixel clusters, the effective object sprite is 32-64 pixels wide enlarged to the sheet; broad clusters of 3-4 colors per material, no fine speckles, no painting, no smooth outlines. Compact storybook medieval shapes with chunky proportions. Warm dusty subdued autumn palette, dark ochre bark, russet/umber/maple and muted khaki leaves, gray-taupe stones. Overall contrast soft and grounded with no white or black extremes, no luminous vegetation. Light from upper-left, simple shaded material volumes.
Exact row-major order:
ROW 1: 1 mature broad OAK TREE with muted warm olive-brown crown and short sturdy visible trunk, clumps of leaves as substantial broad pixel shapes; 2 BIRCH TREE with pale warm beige trunk and muted golden autumn crown; 3 PINE TREE compact tapered layered branches, desaturated dark olive and brown trunk; 4 APPLE TREE with muted ochre-olive crown and a few dull dark red apples, short trunk.
ROW 2: 5 GRANITE cluster of three large rough taupe-gray stones with three broad shading planes; 6 IRON ORE chunk, dusky gray stones with simple gray embedded veins, no glow; 7 COPPER ORE chunky brown-gray rock with restrained dull russet ore fragments; 8 BERRY BUSH low round warm olive leaves and sparse dull burgundy berries.
ROW 3: 9 LOG STACK, six horizontal timber cylinders in a neat pile, tan cut ends at front, brown bark; 10 WOOD CRATE, simple upright square crate with horizontal front edge, broad weathered oak planks and diagonal wooden brace, top face visible with depth upward; 11 WOOD CART, front-facing empty oak handcart on two side wheels with handles extending towards bottom, rectangular flat bed, no diagonal slant; 12 RUNE STONE, short broad upright weathered sandstone monolith with angular shallow carved rune, no letters or magical glow.
Avoid: isometric angles, ground diamonds, painted checkerboard, backgrounds, scenes, grass discs, object overlap, cropped tops, text, labels, borders, logos, high-detail noisiness, white glints. Real RGBA transparency.


## Landmark prompt

Use case: stylized-concept. Asset type: original medieval 16-bit RPG LANDMARK sprite atlas with real transparent alpha.
Create a square canvas with EXACT TWO COLUMNS by TWO ROWS, four isolated objects, same generous clear 10% empty margins for each. No overlap or edge clipping. Real transparent alpha everywhere around silhouettes, no background or checkerboard.

Raised ORTHOGONAL camera, looking straight at the front and seeing upper surfaces. Front edges perfectly HORIZONTAL, depth recedes straight UP. NO isometric diamonds, NO diagonal foundations. Match classic warm weathered medieval pixel game art: compact simple readable forms, tactile material planes, deliberate visible square pixel clusters, hard stepped edges. Warm low saturation taupe-gray granite, dusty sandstone, faded umber, dark earth brown, muted ochre. No pure black or pure white outlines, no neon. Broad shaded planes with a few readable fissures, no tiny speckled noisy high-frequency detail, no smooth painting or glossy 3D. Diffuse upper-left light. Each sprite designed for display approximately 128 to 180 pixels wide.

EXACT row-major order:
TOP LEFT index0: a broad rugged GRANITE RIDGE CLUSTER, connected rocky mountain formation of three irregular peaks, central peak tallest, steep layered rock faces and jagged cliff edges. Deep warm taupe shadows and muted stone-grey upper planes, sparse dull olive moss. Organic irregular silhouette, clear separate ridgeline forms. Ground base flat and horizontal, rough rocky feet, no floating ground plate.
TOP RIGHT index1: a matching larger SNOWY GRANITE RIDGE CLUSTER, three rocky peaks, central highest, aged ivory snow patches lying on upper planes, gray-taupe rock faces and crevices below. Snow shading muted and not glowing. Same camera and material palette as left. No floor tile.
BOTTOM LEFT index2: a complete ancient RUNE MONUMENT COURT on a rectangular horizontal stone foundation. Three broad shallow stair tiers form a symmetrical stepped rectangular pyramid. Tall ancient weathered sandstone monolith stands at center on a low plinth. Central monolith has one shallow geometric carved rune with dull amber fill, no glow. Four short chunky stone columns at the four corners of the court, a small bowl brazier atop front two corner pillars, only tiny faded orange embers. Terraced stair FRONT EDGE must be horizontal, both front corners same Y, depth recedes vertically, absolutely no diamond/isometric platform. Original humble northern medieval sacred place, neither Greco-Roman nor extravagant. Worn warm stone with a few dark joints, cracks, and muted moss. Compact cohesive sprite; all steps and corners fully visible; no lettering.
BOTTOM RIGHT index3: small STONE RUIN, broken low sandstone walls in rectangular U shape facing camera, central entrance gap in front, rear wall with a broken arched window and two crumbled corners. Several loose blocks directly by walls. Same camera and chunky warm stone.
Constraints: original game assets; RGBA transparency; all four complete silhouettes inside their own cells; no background scenery; no labels, text, interface, borders, logos, people, unit sprites, painted checkerboards, or large ground shadow plates.

