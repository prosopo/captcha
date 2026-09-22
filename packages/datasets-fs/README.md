# @prosopo/datasets-fs

Tooling for building the image dataset that an `image` CAPTCHA serves from.

You need this only if you want image CAPTCHAs. `pow` needs no imagery, and `puzzle` generates its imagery
procedurally at request time. See the [self-hosting guide](https://docs.prosopo.io/en/self-hosting/) for the wider
context.

Build the CLI once, then run it from this package directory:

```bash
npm run -w @prosopo/datasets-fs build
node dist/cli.js --help
```

Commands: `flatten`, `labels`, `resize`, `relocate`, `get`, `generate-v1`, `generate-v2`. Every command takes
`--input`/`--in`, `--output`/`--out` and `--overwrite`; run `node dist/cli.js <command> --help` for the rest.

## The images must be publicly reachable

A dataset does not embed images. Each entry holds a **URL**, and the browser fetches it while the user solves the
challenge. So you host the images yourself — any static host or CDN — and the dataset points at them. `relocate`
exists to rewrite local paths into those public URLs once you know them.

## Building a dataset

Start from a directory with one subdirectory per label:

```
data/
    dog/
        a.png
        ...
    cat/
        b.png
        ...
```

### 1. Flatten

Collapses the tree into a single image directory plus a `data.json` mapping each image to its label. Images are
renamed to their content hash.

```bash
node dist/cli.js flatten --in ./data --out ./flat --overwrite
```

`./flat/data.json` looks like this — note the `items` wrapper, and that `data` is still a local path at this stage:

```json
{
    "items": [
        {
            "data": "/abs/path/flat/images/0x1640d689....png",
            "type": "image",
            "label": "bird",
            "hash": "0x1640d689..."
        }
    ]
}
```

### 2. Extract the labels

```bash
node dist/cli.js labels --in ./flat/data.json --out ./labels.json --overwrite
```

```json
{ "labels": ["bird", "bus", "car", "cat", "deer", "dog", "horse", "plane", "train"] }
```

### 3. Resize (optional)

```bash
node dist/cli.js resize --in ./flat/data.json --out ./resized --size 128 --square --overwrite
```

### 4. Point the entries at your host

Upload the images, then rewrite the local paths to the URLs they now live at:

```bash
node dist/cli.js relocate \
  --in ./flat/data.json \
  --out ./data-hosted.json \
  --from /abs/path/flat/images \
  --to https://img.example.com \
  --overwrite
```

Check every URL actually resolves before going further — `get` reports anything that 404s:

```bash
node dist/cli.js get --in ./data-hosted.json
```

### 5. Generate the captchas

`generate-v2` mixes labelled and unlabelled images into a single round:

```bash
node dist/cli.js generate-v2 \
  --out ./captchas.json \
  --labelled ./data-hosted.json \
  --unlabelled ./data-hosted.json \
  --labels ./labels.json \
  --seed 0 \
  --size 9 \
  --count 100 \
  --minCorrect 1 \
  --minIncorrect 1 \
  --minLabelled 2 \
  --maxLabelled 7 \
  --allowDuplicates \
  --overwrite
```

**`--count` is not optional in practice.** It defaults to zero, and without it the command exits successfully having
written a dataset containing no captchas at all. If your `captchas.json` has an empty `captchas` array, this is why.

`generate-v1` is the older two-round format (one labelled round, one unlabelled). It takes `--solved` and `--unsolved`
counts instead of `--count`.

## Loading it into a provider

```bash
docker compose cp ./captchas.json provider:/usr/src/app/captchas.json
docker compose exec provider npx provider provider_set_data_set --file /usr/src/app/captchas.json
docker compose restart provider
```

**The restart is required.** The provider resolves its default dataset once, when the environment initialises, so a
dataset uploaded into a running provider is stored but not served — image challenges keep failing with
`No dataset available. Please upload a dataset first.` until the process restarts.

Then register your site key for image captchas:

```bash
docker compose exec provider npx provider site_key_register <sitekey> enterprise \
  --captcha_type image --domains example.com \
  --pow_difficulty 4 --frictionless_threshold 0.5 --image_threshold 0.8
```

## Regenerating the test fixtures

The fixtures under `src/tests/data` were produced with:

```bash
node dist/cli.js flatten --in ./src/tests/data/hierarchical --out ./src/tests/data/flat --overwrite
node dist/cli.js resize --square --size 128 --in ./src/tests/data/flat/data.json --out ./src/tests/data/flat_resized --overwrite
node dist/cli.js labels --in ./src/tests/data/flat_resized/data.json --out ./src/tests/data/flat_resized/labels.json --overwrite
node dist/cli.js relocate --from '${repo}' --to newwebsite.com --in ./src/tests/data/flat_resized/data.json --out ./src/tests/data/flat_resized/relocated_data.json --overwrite
```
