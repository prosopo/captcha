import os
from PIL import Image


def resize_image(image_path, max_size=(96, 96)):
    # Open an image file
    with Image.open(image_path) as img:
        # Calculate the ratio of the height and width
        img.thumbnail(max_size, Image.ANTIALIAS)
        return img


def resize_images_in_directory(input_dir, output_dir, max_size=(96, 96)):
    for root, dirs, files in os.walk(input_dir):
        for filename in files:
            if filename.endswith(
                (".jpg", ".JPEG", ".png")
            ):  # add or remove file extension as per your need.
                input_file_path = os.path.join(root, filename)

                # Create the same structure in the output directory as the input directory
                relative_path = os.path.relpath(root, input_dir)
                new_dir_path = os.path.join(output_dir, relative_path)
                if not os.path.exists(new_dir_path):
                    os.makedirs(new_dir_path)

                base_filename = os.path.splitext(filename)[
                    0
                ]  # from 'example.jpg' to 'example'
                output_file_path = os.path.join(new_dir_path, base_filename + ".png")

                try:
                    resized_img = resize_image(input_file_path, max_size)
                    resized_img.save(output_file_path)
                    print(
                        f"Successfully resized {filename} and saved it to {output_file_path}"
                    )
                except Exception as e:
                    print(f"Failed to resize {filename} due to {str(e)}")


# usage
# resize_images_in_directory("/path/to/input/images", "/path/to/output/images")

if __name__ == "__main__":
    resize_images_in_directory(
        "/home/user/datasets/source_unlabelled_images/imagenet",
        "/home/user/datasets/final_demo_dataset/unlabelled",
    )
