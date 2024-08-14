# README

## How to produce captchas

You need 3 files:

1. a json file containing labelled data in the form:

    ```json
    [
        {
            "label": "dog",
            "data": "http://example.com/a.png"
        },
        {
            "label": "cat",
            "data": "http://example.com/b.png"
        },
        ...
    ]
    ```

1. a json file containing unlabelled data in the form:

    ```json
    [
        {
            "data": "http://example.com/c.png"
        },
        {
            "data": "http://example.com/d.png"
        },
        ...
    ]
    ```

1. (optional) a json file with an array of labels which unlabelled data can be categorised into. If not specified will default to the same labels as seen in the labelled data.

Then build and run the cli, passing appropriate parameters:
`npm run build && node ./dist/js/cli.js generate --labelled /path/to/my/labelled/data.json --unlabelled /path/to/my/unlabelled/data.json --seed 0 --labels /path/to/my/labels.json --output /path/to/the/output/captchas.json`

Use `node ./dist/js/cli.ts --help` to inspect other parameters.

Commands:

1. `flatten` converts a hierarchical directory structure into a single directory with corresponding map file, e.g.

    ```json
    data/
        dog/
            a.png
            ...
        cat/
            b.png
            ...
    ```

    into

    ```json
    data/
        a.png
        b.png
        ...
    map.json
    ```

    where `map.json` looks like:

    ```json
    [
        {
            "label": "dog",
            "data": "http://example.com/a.png"
        },
        {
            "label": "cat",
            "data": "http://example.com/b.png"
        },
        ...
    ]
    ```

    e.g. `npm run -w @prosopo/datasets-fs build && node packages/datasets-fs/dist/cli.js flatten --in ~/bench/test/data --out ~/bench/test/flat --overwrite`
1. `generateDistinct` takes the 3 files described above and produces captcha challenges comprising 2 rounds, one labelled and one unlabelled.
   e.g. `npm run -w @prosopo/datasets-fs build && node packages/datasets-fs/dist/cli.js generate distinct --out ~/bench/test/captchas.json --labelled ~/bench/test/flat/data.json --unlabelled ~/bench/test/flat/data.json --seed 0 --size 9 --allow-duplicates --solved 1 --unsolved 1 --overwrite --labels ~/bench/test/flat/labels.json`
1. `generateUnion` takes the 3 files described above and produces captcha challenges comprising one or more rounds, mixing labelled and unlabelled data into a single round.
   e.g. `npm run -w @prosopo/datasets-fs build && node packages/datasets-fs/dist/cli.js generate union --out ~/bench/test/captchas-union.json --labelled ~/bench/test/flat/data.json --unlabelled ~/bench/test/flat/data.json --seed 0 --size 9 --allow-duplicates --count 2 --overwrite --labels ~/bench/test/flat/labels.json`
1. 'labels' gets all labels from a data json.
   e.g. `npm run -w @prosopo/datasets-fs build && node packages/datasets-fs/dist/cli.js labels --data ~/bench/test/flat/data2.json`
1. 'get' fetches all images using a GET request, displaying errors for any images which hit 404 or not OK.
   e.g. `npm run -w @prosopo/datasets-fs build && node packages/datasets-fs/dist/cli.js get --data ~/bench/test/flat/data2.json`
1. 'relocate' rewrites the url of images in a json file.
   e.g. `npm run -w @prosopo/datasets-fs build && node packages/datasets-fs/dist/cli.js relocate --from example.com --to web.site --data ~/bench/test/flat/data2.json`
1. 'scale' rescales images in a flat directory structure to a given size.
   e.g. `npm run -w @prosopo/datasets-fs build && node packages/datasets-fs/dist/cli.js scale --data ~/bench/test/flat/data.json --out ~/bench/test/flat/images2 --overwrite --size 128`

## Generating test data

The test data was generated using:

```bash
cli generate-v1 --min-correct 1 --max-correct 6 --labelled $PWD/src/tests/data/flat_resized/data.json --unlabelled $PWD/src/tests/data/flat_resized/data.json --out $PWD/src/tests/data/flat_resized/captchas_v1.json --solved 50 --unsolved 50 --seed 0 --allowDuplicates --seed 0

cli generate-v2 --count 100 --min-correct 1 --min-incorrect 1 --min-labelled 2 --max-labelled 7 --labelled $PWD/src/tests/data/flat_resized/data.json --unlabelled $PWD/src/tests/data/flat_resized/data.json --out $PWD/src/tests/data/flat_resized/captchas_v2.json --seed 0 --allowDuplicates --seed 0

cli relocate --from '${repo}' --to newwebsite.com --input $PWD/src/tests/data/flat_resized/data.json --output $PWD/src/tests/data/flat_resized/relocated_data.json --overwrite

cli labels --input $PWD/src/tests/data/flat_resized/data.json --output $PWD/src/tests/data/flat_resized/labels.json --overwrite

cli flatten --in $PWD/src/tests/data/hierarchical --out $PWD/src/tests/data/flat --overwrite

cli resize --square --size 128 --in $PWD/src/tests/data/flat/data.json --out $PWD/src/tests/data/flat_resized --overwrite
```

`cli` is an alias to `npm run build && npm run cli --`
