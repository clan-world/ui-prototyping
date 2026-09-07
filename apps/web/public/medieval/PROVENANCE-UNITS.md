# Unit sprite provenance

- Generated on September 7, 2026 with the built-in `image_gen.imagegen` tool.
- The sprites are original generated bitmap art. No external sprite sheet is copied.
- Final assets are copied into this directory without raster modification.
- Each PNG is 1536 × 1024, RGBA, and contains 32 full-body sprites arranged in eight columns and four rows.
- `units-atlas.json` records measured source rectangles, approximate foot pivots, nominal person heights, and alpha validation.
- Source rectangles include a two-pixel margin around connected foreground components. The generated placement varies slightly across nominal 192 × 256 cells, so use the recorded rectangles.
- Scale each frame by `desiredPersonHeight / sourceBodyHeight`. Apply the same factor to its dimensions and pivot.
- The Elder has two northeast back-view rows. The recorded direction map mirrors row 2 for northwest movement.
- Walk rows are southeast, southwest, northwest, and northeast. Work rows are chopping, mining, log carrying, and building.
- Alpha and sprite count are measured from the original PNGs with Pillow and NumPy. These tools only inspect image pixels and write JSON metadata.

## Clansman walk prompt

```text
Use case: stylized-concept.
Asset type: production pixel-art sprite animation atlas for a medieval isometric real-time strategy game, used directly by canvas source-rectangle animation.
Create a single transparent PNG sprite sheet, exactly 1536 pixels wide and 1024 pixels high, with exactly 8 equal columns and exactly 4 equal rows, 32 frames total. Grid cells are 192 by 256 pixels. No drawn grid.
The SAME adult medieval clansman appears once in EACH cell, a human peasant with natural realistic 1:6 head-to-body proportions, brown hair, short beard, forest-green wool knee-length tunic, pale linen sleeves, a leather belt, brown fitted trousers, and brown boots. Full body always visible. Human anatomy and proportions like classic late-1990s Age of Empires units and early RuneScape, never cute or chibi.
True chunky, carefully hand-pixelled pixel art with crisp square pixel clusters, no antialiasing, no gradients, no painted texture, no 3D render. Each figure should feel designed at a logical resolution around 32 pixels wide and 50 pixels high, enlarged 3x or 4x using nearest-neighbor pixels. Limited earthy palette, highlights upper left.
Animation layout: ROW 1 the same person walking toward southeast (down-right); ROW 2 walking southwest (down-left); ROW 3 walking northwest (up-left, back three-quarter view); ROW 4 walking northeast (up-right, back three-quarter view). Columns 1 through 8 are the eight sequential poses of a complete smooth full walking cycle: contact, down, passing, up, opposite contact, down, passing, up. Arms and legs actually change pose, opposing arm and leg motion. These are animation frames, not eight different people.
CRITICAL REGISTRATION: Divide the full image into exact 8 by 4 equal cells. Feet have the SAME ground contact anchor at x=96 y=216 within every 192x256 cell. Identical body height and scale across all 32 frames. Keep the full figure and every limb contained within its own cell. About 170 pixels tall per person. Leave at least 20 pixels empty on left and right and 25 pixels above head and below feet. Baselines remain straight and stable. No weapons or objects.
Background must have genuine transparent alpha, absolutely no background color, no scenery, no baked floor or ground plane, no cast shadow, no labels, no text, no numbers, no captions, no watermark. Provide only the single complete sprite sheet image.
```

## Clansman work prompt

```text
Use case: stylized-concept.
Asset type: production pixel-art sprite animation atlas for a medieval isometric real-time strategy game, used directly by canvas source-rectangle animation.
Create a single transparent PNG sprite sheet, exactly 1536 pixels wide and 1024 pixels high, with exactly 8 equal columns and exactly 4 equal rows, 32 frames total. Grid cells are 192 by 256 pixels. No drawn grid.
The SAME adult medieval clansman appears once in EACH cell, a human peasant with natural realistic 1:6 head-to-body proportions, brown hair, short beard, forest-green wool knee-length tunic, pale linen sleeves, a leather belt, brown fitted trousers, and brown boots. Full body always visible. Human anatomy and proportions like classic late-1990s Age of Empires units and early RuneScape, never cute or chibi.
True chunky, carefully hand-pixelled pixel art with crisp square pixel clusters, no antialiasing, no gradients, no painted texture, no 3D render. Each figure should feel designed at a logical resolution around 32 pixels wide and 50 pixels high, enlarged 3x or 4x using nearest-neighbor pixels. Limited earthy palette, highlights upper left.
Animation layout: ROW 1 the same person chopping with a steel woodcutting axe toward southeast; ROW 2 mining with a steel pickaxe toward southeast; ROW 3 walking toward southeast while carrying a short brown log in both arms; ROW 4 building toward southeast with a wooden mallet. In EVERY ROW, columns 1 through 8 are eight chronological animation poses. For the axe, pickaxe, and mallet actions: ready, lifting, overhead, forward swing, low impact, low followthrough, recovery, ready. For carrying, show a full natural walk cycle. The tools move with the arms and remain contained within every cell, same person clothing and scale in all frames. These are animation frames, not eight different people.
CRITICAL REGISTRATION: Divide the full image into exact 8 by 4 equal cells. Feet have the SAME ground contact anchor at x=96 y=216 within every 192x256 cell. Identical body height and scale across all 32 frames. Keep the full figure and every limb contained within its own cell. About 170 pixels tall per person. Leave at least 20 pixels empty on left and right and 25 pixels above head and below feet. Baselines remain straight and stable. No resource trees, rocks, or building targets. Only the person and their carried tool or log. Compact tools that fit the sprite cells.
Background must have genuine transparent alpha, absolutely no background color, no scenery, no baked floor or ground plane, no cast shadow, no labels, no text, no numbers, no captions, no watermark. Provide only the single complete sprite sheet image.
```

## Elder prompt

```text
Use case: stylized-concept.
Asset type: production pixel-art sprite animation atlas for a medieval isometric real-time strategy game, used directly by canvas source-rectangle animation.
Create a single transparent PNG sprite sheet, exactly 1536 pixels wide and 1024 pixels high, with exactly 8 equal columns and exactly 4 equal rows, 32 frames total. Grid cells are 192 by 256 pixels. No drawn grid.
The SAME senior medieval village Elder appears once in EACH cell, a 65-year-old human man with natural realistic 1:6 head-to-body proportions, gray hair, long gray beard, burgundy wool ankle-length robe, tan wool shoulder cloak, leather belt, brown boots, and a plain wooden walking staff. Full body always visible. Human anatomy and proportions like classic late-1990s Age of Empires units and early RuneScape, never cute or chibi.
True chunky, carefully hand-pixelled pixel art with crisp square pixel clusters, no antialiasing, no gradients, no painted texture, no 3D render. Each figure should feel designed at a logical resolution around 32 pixels wide and 50 pixels high, enlarged 3x or 4x using nearest-neighbor pixels. Limited earthy palette, highlights upper left.
Animation layout: ROW 1 the same person walking toward southeast (down-right); ROW 2 walking southwest (down-left); ROW 3 walking northwest (up-left, back three-quarter view); ROW 4 walking northeast (up-right, back three-quarter view). Columns 1 through 8 are the eight sequential poses of a complete smooth full walking cycle: contact, down, passing, up, opposite contact, down, passing, up. Arms and legs actually change pose, opposing arm and leg motion. These are animation frames, not eight different people.
CRITICAL REGISTRATION: Divide the full image into exact 8 by 4 equal cells. Feet have the SAME ground contact anchor at x=96 y=216 within every 192x256 cell. Identical body height and scale across all 32 frames. Keep the full figure and every limb contained within its own cell. About 170 pixels tall per person. Leave at least 20 pixels empty on left and right and 25 pixels above head and below feet. Baselines remain straight and stable. The Elder holds his wood walking staff in his right hand. No other objects.
Background must have genuine transparent alpha, absolutely no background color, no scenery, no baked floor or ground plane, no cast shadow, no labels, no text, no numbers, no captions, no watermark. Provide only the single complete sprite sheet image.
```
