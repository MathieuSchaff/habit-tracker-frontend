export default {
  plugins: {
    '@csstools/postcss-global-data': {
      files: ['src/styles/tokens/breakpoints.css'],
    },
    'postcss-custom-media': {},
  },
}
