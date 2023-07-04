import json


def replace_path_start_with_url(json_file_path, url):
    """Replace the start of each path with the specified URL in the JSON file."""

    # Load data
    with open(json_file_path, "r") as file:
        data = json.load(file)

    for item in data["items"]:
        _, _, _, _, _, _, hashed_directory, filename = item["path"].split("/")
        item["path"] = f"{url}{hashed_directory}/{filename}"

    with open(json_file_path, "w") as file:
        json.dump(data, file, indent=4)


replace_path_start_with_url("data.json", "https://imageserver.app.runonflux.io/")
