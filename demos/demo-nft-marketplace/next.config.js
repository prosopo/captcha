const withImages = require('next-images');

module.exports = {
  ...withImages(),
  images: {
    disableStaticImages: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};
