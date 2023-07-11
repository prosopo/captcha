# datasets
Datasets for use with providers

## STL10

Workbook adapted from [kaggle notebook](https://www.kaggle.com/code/pratt3000/generate-stl10/notebook) to generate 10,000 unique CAPTCHA.

Download the [binary files here](http://ai.stanford.edu/~acoates/stl10/stl10_binary.tar.gz).


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
1. a json file with an array of labels which unlabelled data can be categorised into. If not specified will default to the same labels as seen in the labelled data.

Then build and run the cli, passing appropriate parameters:
`npm run build && node ./dist/js/cli.js generate --labelled /path/to/my/labelled/data.json --unlabelled /path/to/my/unlabelled/data.json --seed 0 --labels /path/to/my/labels.json --output /path/to/the/output/captchas.json`

Use `node ./dist/js/cli.ts --help` to inspect other parameters.

Commands:
1. `flatten` converts a hierarchical directory structure into a single directory with corresponding map file, e.g.
    ```
    data/
        dog/
            a.png
            ...
        cat/
            b.png
            ...
    ```
    into
    ```
    data/
        a.png
        b.png
        ...
    map.json
    ```
    where `map.json` looks like:
    ```
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
1. `generateDistinct` takes the 3 files described above and produces captcha challenges comprising 2 rounds, one labelled and one unlabelled.
1. `generateUnion` takes the 3 files described above and produces captcha challenges comprising one or more rounds, mixing labelled and unlabelled data into a single round.