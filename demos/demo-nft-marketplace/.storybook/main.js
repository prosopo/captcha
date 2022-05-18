const path = require('path')

module.exports = {
  stories: [
    '../src/**/*.stories.mdx',
    '../src/**/*.stories.@(js|jsx|ts|tsx)',
  ],
  addons: [
    '@storybook/addon-viewport',
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    'storybook-addon-apollo-client',
    {
      name: '@storybook/addon-postcss',
      options: {
        postcssLoaderOptions: {
          implementation: require('postcss'),
        },
      },
    },
  ],
  webpackFinal: async (config) => {
    config.module.rules.push({
      test: /\.(graphql|gql)$/,
      exclude: /node_modules/,
      loader: 'graphql-tag/loader',
    })

    const appSrc = path.resolve(__dirname, '../src');

    config.resolve.alias = {
      ...config.resolve.alias,
      'api': `${appSrc}/api/`,
      'assets': `${appSrc}/assets/`,
      'components': `${appSrc}/components/`,
      'types': `${appSrc}/types/`,
      'i18n': `${appSrc}/i18n/`,
      'hooks': `${appSrc}/hooks/`,
      'utils': `${appSrc}/utils/`,
    };

    return config
  },
}
