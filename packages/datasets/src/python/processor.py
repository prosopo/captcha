from PIL import Image, ImageFilter, ImageDraw, ImageFont, ImageOps
import numpy as np
import random
import string
import os


class ImageProcessor:
    def __init__(self, image_paths, font_path):
        for path in image_paths:
            if not os.path.exists(path):
                raise ValueError(f"Image file does not exist: {path}")

        if not os.path.exists(font_path):
            raise ValueError("Font file does not exist.")

        self.image_paths = image_paths
        self.font_path = font_path

    def find_coeffs(self, pa, pb):
        matrix = []
        for p1, p2 in zip(pa, pb):
            matrix.append([p1[0], p1[1], 1, 0, 0, 0, -p2[0] * p1[0], -p2[0] * p1[1]])
            matrix.append([0, 0, 0, p1[0], p1[1], 1, -p2[1] * p1[0], -p2[1] * p1[1]])

        A = np.matrix(matrix, dtype=np.float64)
        B = np.array(pb).reshape(8)

        return np.array(np.dot(np.linalg.inv(A.T * A) * A.T, B)).reshape(8)

    def add_noise(self):
        # Add gaussian noise
        np_image = np.array(self.image)
        noisy_image = np_image + np.random.normal(0, 0.2, np_image.shape)

        # Convert back to PIL Image
        self.image = Image.fromarray(np.uint8(np.clip(noisy_image, 0, 255)))

    def add_text(self):
        # Generate a random string length 5
        random_word = "".join(
            random.choices(string.ascii_uppercase + string.digits, k=5)
        )

        # Estimate font size as 50% of the image height
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

        text_draw.text((x_position, y_position), random_word, (0, 0, 0, 180), font=font)

        # Randomly rotate the text
        angle = random.randint(-45, 45)
        rotated_text_image = text_image.rotate(angle, resample=Image.BICUBIC, expand=1)

        # Create an RGBA version of the main image and paste the text
        self.image = self.image.convert("RGBA")

        # Paste the rotated text onto the main image
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
                        int(self.image.width * 0.8), int(self.image.width * 1.2)
                    ),
                    np.random.randint(
                        int(self.image.height * 0.8), int(self.image.height * 1.2)
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
        blurred_image = self.image.filter(ImageFilter.GaussianBlur(radius=2))
        self.image = ImageOps.autocontrast(blurred_image.convert("RGB"), cutoff=1)

    def get_filename_without_extension(self, filepath):
        return os.path.splitext(os.path.basename(filepath))[0]

    def process_image(self, output_folder: str) -> None:
        for i, image_path in enumerate(self.image_paths):
            self.image = Image.open(image_path)

            self.add_noise()
            self.add_text()
            self.distort_image()
            self.blur_and_contrast()

            filename = f"{self.get_filename_without_extension(image_path)}_processed.png"
            
            output_path = os.path.join(output_folder, filename)
            self.image.save(output_path)
