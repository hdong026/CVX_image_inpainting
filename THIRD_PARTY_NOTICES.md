# Third-party notices

`app/assets/chelsea.png`: Stefan van der Walt, CC0, from scikit-image v0.24.0 example data.

- https://scikit-image.org/docs/stable/api/skimage.data.html#skimage.data.chelsea
- https://raw.githubusercontent.com/scikit-image/scikit-image/v0.24.0/skimage/data/chelsea.png

Dependencies retain their respective licenses. The project license does not replace third-party licenses or cover lecture slides and user-uploaded images.

Additional examples (identical copies also appear in `docs/assets/`):

- `lena.jpg`: classic cropped test portrait from OpenCV 4.10.0, https://github.com/opencv/opencv/blob/4.10.0/samples/data/lena.jpg. This third-party photograph is not relicensed under this project's MIT license or described as CC0.
- `astronaut.png`: NASA photograph of Eileen Collins; public domain according to scikit-image.
- `camera.png`: Lav Varshney, CC0, via scikit-image v0.24.0.
- `coffee.png`: Rachel Michetti, CC0, courtesy of Pikolo Espresso Bar.

The latter three files are unmodified downloads from `https://raw.githubusercontent.com/scikit-image/scikit-image/v0.24.0/skimage/data/`. Descriptions and rights: https://scikit-image.org/docs/0.24.x/api/skimage.data.html.

## Additional comparison images (v1.6)

All are from scikit-image 0.24.0 via its public `skimage.data` functions, converted to 8-bit PNG without resizing. Copies in `docs/assets/` are identical.

- `checkerboard.png`: `data.checkerboard()`, standard calibration pattern (200 × 200).
- `phantom.png`: `data.shepp_logan_phantom()` (400 × 400), the Shepp–Logan tomography phantom. L. A. Shepp and B. F. Logan, “The Fourier reconstruction of a head section,” 1974, DOI: 10.1109/TNS.1974.6499235.
- `page.png`: `data.page()`, scanned printed text (384 × 191).
- `horse.png`: `data.horse()`, Andreas Preuss (marauder), Openclipart, CC0 (400 × 328).
- `brick.png`: `data.brick()`, CC0Textures Bricks25, CC0; perspective-corrected/cropped by scikit-image (512 × 512).

The upstream distribution lists BSD-3-Clause as its default; the first three have no separate image-specific license notice in their API entries. The full [upstream license](docs/SCIKIT_IMAGE_LICENSE.md) is retained. They are not asserted to be CC0. Per-image descriptions: https://scikit-image.org/docs/0.24.x/api/skimage.data.html. These samples are standard comparison material, not proof that one TV penalty is superior.
