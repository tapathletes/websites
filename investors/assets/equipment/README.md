# Equipment `.glb` assets

Photo-realistic 3D models for facility equipment. Each piece replaces a
primitive-geometry placeholder in `facility-3d-sky.html`.

## Adding a new piece

1. Drop the `.glb` here, named with the equipment type and the SKU/source:
   - `squat-rack-rogue-r3.glb`
   - `mound-portamound-9x4.glb`
   - `kettlebell-set.glb`
   - `med-ball-rack-2lb.glb`
2. Verify the model's dimensions match the manufacturer spec — this is
   load-bearing for supplier orders (per `project_facility_layout.md`
   memory).
3. In `facility-3d-sky.html`, replace the primitive geometry block with:
   ```js
   loadEquipment('assets/equipment/<file>.glb', {
     x: <X>, y: <Y>, z: <Z>, rotY: <radians>, scale: <number>
   });
   ```
4. The loader auto-enables shadows and uses the scene's environment map
   for ambient/reflection contribution.

## Sourcing

- **Manufacturer 3D files** if they publish them (rare for fitness gear).
- **Sketchfab** — check the CC0 / CC-BY licenses before commercial use.
- **3D Warehouse** (SketchUp) — community models, free, convert to `.glb`.
- **Blender** — for canonical pieces where supplier-spec dimensions matter,
  modeling from scratch is the safest path.

## Naming convention

`<equipment-type>-<source-or-sku>.glb` — keeps it obvious what each file
represents at a glance.

## Attributions

CC BY 4.0 assets require credit. Keep this list current:

- **Dumbbell Rack** by [MH](https://sketchfab.com/MH...) — CC BY 4.0 — from
  Sketchfab: https://sketchfab.com/3d-models/dumbbell-rack-868439c605cf441e83d54a5fcfd64ab6
- **CC0 Kettlebell** by plaggy — CC0 1.0 Public Domain (no attribution
  required, included here for traceability) —
  https://sketchfab.com/3d-models/cc0-kettlebell-801a68fa3ed449258bac6ee023446c15
