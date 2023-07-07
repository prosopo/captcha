from PIL import Image, ImageFilter, ImageDraw, ImageFont, ImageOps
import numpy as np
import random
import string
import os
from skimage import transform
from skimage.util import img_as_ubyte
from tqdm.notebook import tqdm


class ImageProcessor:
    def __init__(self, font_path):
        if not os.path.exists(font_path):
            raise ValueError("Font file does not exist.")

        self.font_path = font_path

    def find_coeffs(self, pa, pb):
        """
        Calculates the coefficients for a perspective transformation used to distort an image
        """
        matrix = []
        for p1, p2 in zip(pa, pb):
            matrix.append([p1[0], p1[1], 1, 0, 0, 0, -p2[0] * p1[0], -p2[0] * p1[1]])
            matrix.append([0, 0, 0, p1[0], p1[1], 1, -p2[1] * p1[0], -p2[1] * p1[1]])

        A = np.matrix(matrix, dtype=np.float64)
        B = np.array(pb).reshape(8)

        return np.array(np.dot(np.linalg.inv(A.T * A) * A.T, B)).reshape(8)

    def add_noise(self):
        np_image = np.array(self.image)
        noisy_image = np_image + np.random.normal(0, 0.2, np_image.shape)

        # Convert back to PIL Image
        self.image = Image.fromarray(np.uint8(np.clip(noisy_image, 0, 255)))

    def add_text(self):
        # Generate a random string length 5
        random_word = "".join(
            random.choices(string.ascii_uppercase + string.digits, k=5)
        )

        # Estimate font size
        font_size = self.image.height // 3
        font = ImageFont.truetype(self.font_path, font_size)

        # Create a separate image for the text
        text_image = Image.new("RGBA", self.image.size, (255, 255, 255, 0))
        text_draw = ImageDraw.Draw(text_image)

        # Position the text in the center
        bbox = text_draw.multiline_textbbox((0, 0), random_word, font=font)
        width, height = bbox[2] - bbox[0], bbox[3] - bbox[1]
        x_position, y_position = (text_image.width - width) / 3, (
            text_image.height - height
        ) / 3

        text_draw.text((x_position, y_position), random_word, (0, 0, 0, 90), font=font)

        # Randomly rotate the text
        angle = random.randint(-45, 45)
        rotated_text_image = text_image.rotate(angle, resample=Image.BICUBIC, expand=1)

        self.image = self.image.convert("RGBA")
        self.image.paste(rotated_text_image, (0, 0), rotated_text_image)

    def distort_image(self) -> None:
        # Apply distortion
        coeffs = self.find_coeffs(
            [
                (0, 0),
                (self.image.width, 0),
                (self.image.width, self.image.height),
                (0, self.image.height),
            ],
            [
                (0, 0),
                (self.image.width, 0),
                (
                    np.random.randint(
                        int(self.image.width * 0.9), int(self.image.width * 1.1)
                    ),
                    np.random.randint(
                        int(self.image.height * 0.9), int(self.image.height * 1.1)
                    ),
                ),
                (0, self.image.height),
            ],
        )

        self.image = self.image.transform(
            (self.image.width, self.image.height),
            Image.PERSPECTIVE,
            coeffs,
            Image.BICUBIC,
        )

    def blur_and_contrast(self) -> None:
        blurred_image = self.image.filter(ImageFilter.GaussianBlur(radius=1))
        self.image = ImageOps.autocontrast(blurred_image.convert("RGB"), cutoff=1)

    def multiple_swirls(self):
        # Convert the PIL image to a NumPy array
        image_array = np.array(self.image)

        num_swirls = 5

        # Loop through multiple centres
        for _ in range(num_swirls):
            # Randomly select a centre
            y_center, x_center = np.random.randint(
                0, image_array.shape[0]
            ), np.random.randint(0, image_array.shape[1])

            # Swirl transformation parameters
            rotation = np.random.rand() * np.pi
            strength = 10 * np.random.rand()
            radius = min(image_array.shape[0], image_array.shape[1]) / (
                2.0 * np.random.rand() + 2.0
            )
            image_array = transform.swirl(
                image_array,
                center=(y_center, x_center),
                rotation=rotation,
                strength=strength,
                radius=radius,
            )

        swirled_image_array = Image.fromarray(img_as_ubyte(image_array))
        self.image = Image.blend(self.image, swirled_image_array, alpha=0.2)

    def get_filename_without_extension(self, filepath):
        return os.path.splitext(os.path.basename(filepath))[0]

    def process_image(self, output_folder: str) -> None:
        for i, image_path in enumerate(self.image_paths):
            self.image = Image.open(image_path)

            self.add_noise()
            self.add_text()
            self.multiple_swirls()
            self.distort_image()
            self.blur_and_contrast()

            filename = (
                f"{self.get_filename_without_extension(image_path)}_processed.png"
            )

            output_path = os.path.join(output_folder, filename)
            self.image.save(output_path)

    def process_folder(self, source_folder: str, target_folder: str) -> None:
        labels = [
            name
            for name in os.listdir(source_folder)
            if os.path.isdir(os.path.join(source_folder, name))
        ]

        for label in tqdm(
            labels, desc="Processing folders"
        ):  # wrap your loop in tqdm for a progress bar
            print(f"Processing images in folder: {label}")

            source_subfolder = os.path.join(source_folder, label)
            target_subfolder = os.path.join(target_folder, label)
            os.makedirs(target_subfolder, exist_ok=True)

            image_paths = [
                os.path.join(source_subfolder, image)
                for image in os.listdir(source_subfolder)
            ]

            self.image_paths = image_paths

            for i, image_path in enumerate(
                tqdm(self.image_paths, desc=f"Processing images in {label} folder")
            ):  # wrap this loop in tqdm for another progress bar
                self.image = Image.open(image_path)

                self.add_noise()
                self.add_text()
                self.multiple_swirls()
                self.distort_image()
                self.blur_and_contrast()

                filename = (
                    f"{self.get_filename_without_extension(image_path)}_processed.png"
                )
                output_path = os.path.join(target_subfolder, filename)
                self.image.save(output_path)
