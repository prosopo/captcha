import os
import hashlib


def hash_label(label):
    """Hash the given label using SHA-256."""
    return hashlib.sha256(label.encode()).hexdigest()


def rename_directories(root_dir):
    """Rename all directories in the directory tree rooted at root_dir."""

    for dirpath, dirnames, _ in os.walk(root_dir, topdown=False):
        for dirname in dirnames:
            original_dir_path = os.path.join(dirpath, dirname)
            hashed_dir_name = hash_label(dirname)
            new_dir_path = os.path.join(dirpath, hashed_dir_name)

            # Rename the directory
            os.rename(original_dir_path, new_dir_path)


# Specify your root directory here
root_dir = "/home/user/datasets/128_target_images"
rename_directories(root_dir)
