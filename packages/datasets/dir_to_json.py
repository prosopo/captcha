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
    config = parser.parse_args()

    root = config.root
    labelled_dir = root + "/labelled"
    unlabelled_dir = root + "/unlabelled"

    data = {}
    data["labelled"] = {}
    data["unlabelled"] = []

    # for each label
    i = 0
    for label in os.listdir(labelled_dir):
        # make an empty list to store the items
        items = []
        data["labelled"][label] = items
        # then get all items in the label's dir
        for item in os.listdir(labelled_dir + "/" + label):
            # and add them to the items list
            items.append({"url": labelled_dir + "/" + label + "/" + item})
            i = i + 1
            print("added labelled item", i)

    # for each unlabelled item
    i = 0
    for item in os.listdir(unlabelled_dir):
        # add the item to the unlabelled data
        data["unlabelled"].append({"url": unlabelled_dir + "/" + item})
        i = i + 1
        print("added labelled item", i)

    # dump the data to json
    print("writing json")
    with open(config.output, 'w') as file:
        json.dump(data, file, indent=4)
