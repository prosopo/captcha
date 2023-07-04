import json


def remove_solution(json_file_path):
    """Remove 'solution' attribute from first 5000 captchas in the JSON file for generating demo captcha datasets with good behaviour."""

    # Load data
    with open(json_file_path, "r") as file:
        data = json.load(file)

    # Iterate through first 5000 captchas
    for captcha in data["captchas"][:5000]:
        # Remove 'solution' attribute
        if "solution" in captcha:
            del captcha["solution"]

    # Save data
    with open(json_file_path, "w") as file:
        json.dump(data, file, indent=4)


# Call the function with the path to your data.json file
remove_solution("captchas.json")
