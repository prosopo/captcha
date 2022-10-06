import copy
import random
from argparse import ArgumentParser
import json
from pathlib import Path

import bcrypt as bcrypt


def choices_without_replacement(options, n, rng):
    """
    Choose n items from options without replacement.
    :param options: the options to pick from.
    :param n: the number of choices to make.
    :param rng: the rng.
    :return: n randomly chosen options without duplicates.
    """

    if len(options) < n:
        raise ValueError("too few options to choose from")

    chosen = set()
    while len(chosen) < n:
        i = rng.choice(range(len(options)))
        chosen.add(i)
    chosen = list(chosen)
    # sort the chosen indices. This ensures the choices are stable, as set is unordered and often implementation
    # dependent. Sorting makes this process portable.
    chosen.sort()
    # convert the indices to options
    chosen = [options[i] for i in chosen]

    return chosen


class CaptchaCreator:

    def __init__(self, items):

        """
        Construct a captcha creator containing items to create captchas.

        :type items: the list of items. Each should contain a URL field and a label field (which can be empty for
        unlabelled items) :return: captcha challenges

        """
        self.items_labelled = [item for item in items if item["label"] != ""]
        self.items_unlabelled = [item for item in items if item["label"] == ""]
        self.labels = list(set([item["label"] for item in items if item["label"] != ""]))

    def create_captcha_unsolved(self, size, rng):
        """
        Create a captcha from unlabelled data.

        :param size: the size of the captcha, i.e. number of items to pick.
        :param rng: the rng.
        :return: the captcha containing unlabelled items.
        """

        if len(self.items_unlabelled) < size:
            raise ValueError("too few unlabelled items to choose from")

        # choose n items
        chosen_items = choices_without_replacement(self.items_unlabelled, size, rng)
        # deep copy as we'll be mutating this later
        chosen_items = copy.deepcopy(chosen_items)

        for item in chosen_items:
            # label should not be available in captcha
            del item['label']

        return {
            "items": chosen_items,
            "salt": bcrypt.gensalt().hex()
        }

    def create_captcha(self, n_correct, size, target, rng):
        """
        Create a captcha containing n_correct target images.

        :type rng: the rng to randomly select items.
        :type target: the target label. E.g. "bird".
        :param n_correct: the number of target images in the captcha. E.g. n_correct images of "bird".
        :param size: the number of images in the captcha. E.g. 9 for 3x3 grid.
        :return: the captcha.
        """

        if size < n_correct:
            raise ValueError("size < n_correct")
        if target not in self.labels:
            raise ValueError("no labelled items for target label")

        n_incorrect = size - n_correct

        # partition the data into correct and incorrect
        correct_items = [item for item in self.items_labelled if item["label"] == target]
        incorrect_items = [item for item in self.items_labelled if item["label"] != target]

        if len(correct_items) < n_correct:
            raise ValueError("too few correct items to pick from")
        if len(incorrect_items) < n_incorrect:
            raise ValueError("too few incorrect items to pick from")

        # randomly pick n_correct items, these will be the correct imgs
        chosen_correct_items = choices_without_replacement(correct_items, n_correct, rng)
        # deep copy as we'll be mutating this later
        chosen_correct_items = copy.deepcopy(chosen_correct_items)

        # randomly pick n incorrect items, these will be the incorrect imgs
        chosen_incorrect_items = choices_without_replacement(incorrect_items, n_incorrect, rng)
        # deep copy as we'll be mutating this later
        chosen_incorrect_items = copy.deepcopy(chosen_incorrect_items)

        for item in chosen_correct_items:
            # label should not be available in captcha
            del item['label']
        for item in chosen_incorrect_items:
            # label should not be available in captcha
            del item['label']

        chosen_items = []
        chosen_items.extend(chosen_correct_items)
        chosen_items.extend(chosen_incorrect_items)
        # shuffle the correct and incorrect items
        rng.shuffle(chosen_items)
        # collect the correct item indices as the solution
        solution = [i for i in range(len(chosen_items)) if chosen_items[i] in chosen_correct_items]

        return {
            "solution": solution,
            "items": chosen_items,
            "salt": bcrypt.gensalt().hex()
        }

    def create_captchas_unsolved(self, n_captchas, size, rng, progress_callback=lambda x, y: None):
        """
        Generate many unsolved captchas.
        :param n_captchas: the number of captchas to produce.
        :param size: the size of the captchas (e.g. number of images)
        :param rng: the rng.
        :param progress_callback: callback to report progress.
        :return: the captchas list
        """

        captchas = []

        progress_callback(0, n_captchas)

        for i in range(n_captchas):
            captcha = self.create_captcha_unsolved(size, rng)
            captchas.append(captcha)
            progress_callback(i + 1, n_captchas)

        return captchas

    def create_captchas(self, n_captchas, min_n_correct, max_n_correct, size, rng, progress_callback=lambda x, y: None):
        """
        Generate many captchas.

        :param progress_callback: function to be called as progress is made through generating the n_captchas.
        :type n_captchas: the number of captchas to generate
        :param min_n_correct: the minimum number of correct items in the captcha (inclusive)
        :param max_n_correct: the maximum number of correct items in the captcha (inclusive)
        :param size: the number of items in the captcha
        :param rng: the rng
        :return: array of captchas
        """

        captchas = []

        progress_callback(0, n_captchas)

        for i in range(n_captchas):
            # randomly choose the n_correct items in this captcha
            n_correct = rng.choice(range(min_n_correct, max_n_correct + 1))
            # randomly choose the target label
            target = rng.choice(self.labels)
            captcha = self.create_captcha(n_correct, size, target, rng)
            captchas.append(captcha)
            progress_callback(i + 1, n_captchas)

        return captchas


if __name__ == '__main__':
    print(__file__)

    parser = ArgumentParser()
    parser.set_defaults(unsolved=False)
    parser.add_argument("--unsolved", action="store_true",
                        help="whether to use unlabelled data. If this is enabled, there is no solution to the captcha "
                             "and min/max parameters are ignored.")
    parser.add_argument("--min", default="1", type=int,
                        help="the minimum number of images in the captcha which match the target label")
    parser.add_argument("--max", default="8", type=int,
                        help="the maximum number of images in the captcha which match the target label")
    parser.add_argument("--count", default="1", type=int,
                        help="the number of captchas to generate")
    parser.add_argument("--size", default="9", type=int,  # 3x3 grid
                        help="the number of images per captcha")
    parser.add_argument("--output", default="captchas.json",
                        help="write captcha challenges to FILE", metavar="FILE")
    parser.add_argument("--data",
                        help="read JSON input data from FILE. Need to be in the same format as:\n"
                             "{\n"
                             "\t\"items\": [\n"
                             "\t\t{\n"
                             "\t\t\t\"url\": \"<path to resource>\",\n"
                             "\t\t\t\"label\": \"<label or empty string if unlabelled\"\n"
                             "\t\t},\n"
                             "\t\t...\n"
                             "\t]\n"
                             "}\n", metavar="FILE", required=True)
    parser.add_argument("--seed", type=int,
                        help="the seed for the random number generator. Note this does not affect how the salt is "
                             "chosen",
                        required=True)

    config = parser.parse_args()
    # config = parser.parse_args(["--min", "2", "--max", "4", "--count", "10", "--size", "9", "--output", "captchas.json", "--seed", "0", "--data", "data.json", "--unsolved"])

    print("config:")
    print(config)

    if Path(config.output).exists():
        raise ValueError('output file already exists')

    with open(config.data, 'r') as file:
        data = json.load(file)

    creator = CaptchaCreator(data["items"])

    if config.unsolved:
        # create captchas with no solutions
        captchas = creator.create_captchas_unsolved(config.count, config.size, random.Random(config.seed),
                                       progress_callback=lambda i, n: print(i, "/", n))
    else:
        # create captchas with solutions
        captchas = creator.create_captchas(config.count, config.min, config.max, config.size, random.Random(config.seed),
                                       progress_callback=lambda i, n: print(i, "/", n))

    output = {"captchas": captchas}

    with open(config.output, 'w') as file:
        json.dump(output, file, indent=4)
