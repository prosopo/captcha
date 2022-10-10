import json
import os
import sys
from argparse import ArgumentParser

# convert a directory in the following structure to a json file for generating captchas
# dir/
#     labelled/
#              cat/
#                  1.png
#                  2.png
#                  ...
#              dog/
#                  1.png
#                  2.png
#                  ...
#     unlabelled/
#                1.png
#                2.png
#                ...

if __name__ == '__main__':

    print(__file__)

    parser = ArgumentParser()
    parser.add_argument("--root", required=True, help="the root directory holding the labelled and unlabelled data")
    parser.add_argument("--output", default="data.json", help="the path to the output file")
    parser.add_argument("--type", default="data.json", help="the type of the resources", required=True)
    config = parser.parse_args()

    root = config.root
    labelled_dir = root + "/labelled"
    unlabelled_dir = root + "/unlabelled"

    items = []

    # for each label
    i = 0
    for label in os.listdir(labelled_dir):
        # for each labelled item
        for item in os.listdir(labelled_dir + "/" + label):
            # add item to the list
            items.append({"path": labelled_dir + "/" + label + "/" + item, "label": label, "type": config.type})
            i = i + 1
            print("added labelled item", i)

    # for each unlabelled item
    for item in os.listdir(unlabelled_dir):
        # add the unlabelled item
        items.append({"path": unlabelled_dir + "/" + item, "label": "", "type": config.type})
        i = i + 1
        print("added unlabelled item", i)

    # dump the data to json
    data = {"items": items}
    print("writing json")
    with open(config.output, 'w') as file:
        json.dump(data, file, indent=4)
