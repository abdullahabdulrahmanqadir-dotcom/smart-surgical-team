# The anatomy map on the Topics page

The Topics page flies a CSS camera over a single illustration. Selecting a
region magnifies that part of the plate and softens everything around it;
selecting another region tweens straight there, passing through the intermediate
scale, which gives the pull-back-and-push-in motion for free.

## One plate, on purpose

There is exactly one image: `public/anatomy-topics-model-v2.png`
(1122x1402, the lossless master used because the camera magnifies it).

An earlier version swapped in a separately drawn detail illustration for each
region. That was abandoned. Detail views have to be registered against the
master pixel for pixel — same camera, same crop, same subject scale — or they
visibly jump at the moment the camera arrives, and that registration proved
impossible to get reliably out of image generation. The generated plates came
back at different head angles and pre-cropped to different zoom levels, which no
amount of CSS can reconcile.

The master already shows all four regions: parotid and submandibular glands, the
full cervical node chain, the thyroid, and a skin lesion on the cheek. Magnifying
it and letting depth of field carry the focus gets the same effect with none of
the fragility.

## Changing the map

Everything lives in [`app/lib/anatomy-map.ts`](../../app/lib/anatomy-map.ts).

- `x`, `y` — the focus point as a percentage of the plate. Places both the
  camera and the region's hotspot, so they can never disagree.
- `zoom` — how far the camera pushes in.
- `radius` — how much stays sharp, in plate percent. The camera magnifies this
  by the zoom, so the mask scales with the view.

Two limits worth knowing before you change the numbers:

**Zoom is capped around 2.2.** The camera magnifies the master rather than
swapping in a higher-resolution image, so beyond roughly that point the plate is
upscaled more than it can bear and the region goes soft. Push higher only as far
as it still looks crisp.

**Focus points must not crowd each other.** Each pair needs to clear the others
by more than a touch target on at least one axis, or the hotspots overlap and
part of one stops being clickable. At the narrowest layout the stage is about
263x336px against a 46px target, so keep points at least 18% apart horizontally
or 14% vertically. This has already bitten once.

## If the plate is ever replaced

The plate is the coordinate space, so swapping it invalidates every number
above.

1. Keep a lossless master for the interactive map. A WebP derivative may still
   be used for non-zoomed previews, but compression artifacts become visible
   when the map camera magnifies the plate.
2. Update `ANATOMY_PLATE` with the new filename and intrinsic size — the stage
   is held at the plate's aspect ratio so that a focus point in plate percent
   lands on the right pixel.
3. Re-measure all four focus points, then check each region at a narrow viewport
   as well as a wide one, since a point near an edge crops differently there.
