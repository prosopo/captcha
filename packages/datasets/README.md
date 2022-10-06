# datasets
Datasets for use with providers

## STL10

Workbook adapted from [kaggle notebook](https://www.kaggle.com/code/pratt3000/generate-stl10/notebook) to generate 10,000 unique CAPTCHA.

Download the [binary files here](http://ai.stanford.edu/~acoates/stl10/stl10_binary.tar.gz).


## How to produce captchas

To generate unsolved captchas, run:
```commandline
python3 generate_captchas.py --count 10000 --size 9 --output captchas_unsolved.json --seed 0 --data data.json  --unsolved
```

To generate solved captchas, run:
```commandline
python3 generate_captchas.py --min 2 --max 4 --count 10000 --size 9 --output captchas_0-9_correct.json --seed 0 --data data.json 
```

Unsure of how the captcha generation works?
```commandline
python3 generate_captchas.py -h
```