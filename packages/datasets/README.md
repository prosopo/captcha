# datasets
Datasets for use with providers

## STL10

Workbook adapted from [kaggle notebook](https://www.kaggle.com/code/pratt3000/generate-stl10/notebook) to generate 10,000 unique CAPTCHA.

Download the [binary files here](http://ai.stanford.edu/~acoates/stl10/stl10_binary.tar.gz).


## How to produce captchas

To generate captchas with 0-9 target images, run:
```commandline
python3 src/python/generate_captchas.py --solved 2 --unsolved 2 --size 9 --min 0 --max 9 --output captchas.json --seed 0 --data data.json
```
or with 2-4 target images, run:
```commandline
python3 src/python/generate_captchas.py --solved 2 --unsolved 2 --size 9 --min 2 --max 4 --output captchas.json --seed 0 --data data.json
```

Unsure of how the captcha generation works?
```commandline
python3 generate_captchas.py -h
```