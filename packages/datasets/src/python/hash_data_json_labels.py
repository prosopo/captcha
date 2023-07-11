import json
import hashlib
import os


def hash_label(label):
    """Hash the given label using SHA-256."""
    return hashlib.sha256(label.encode()).hexdigest()


def replace_directory_with_hash(json_file_path):
    """Replace directory name with its hash in the JSON file."""

    with open(json_file_path, "r") as file:
        data = json.load(file)

    for item in data["items"]:
        path_parts = os.path.normpath(item["path"]).split(os.sep)

        # Identify the directory name
        dir_name = path_parts[-2]

        # Replace the directory name with its hash
        path_parts[-2] = hash_label(dir_name)

        # Join the path back together
        item["path"] = os.sep.join(path_parts)

    with open(json_file_path, "w") as file:
        json.dump(data, file, indent=4)


replace_directory_with_hash("data.json")
