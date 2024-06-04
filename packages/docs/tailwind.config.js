module.exports = {
    // Uncomment the line below if you need to specify other locations for your source files
    content: ['./src/**/*.njk', './src/**/*.vue', './src/**/*.jsx', './src/**/*.js'],
    theme: {
        animation: {
            fade: 'fadeOut .9s ease-in-out',
        },

        // that is actual animation
        keyframes: (theme) => ({
            fadeOut: {
                '0%': { backgroundColor: theme('colors.green.500') },
                '100%': { backgroundColor: theme('colors.transparent') },
            },
        }),
    },
    variants: {
        extend: {
            display: ["group-hover", "group-active"],
            // Add any custom variants here
        },
    },
    plugins: [require('@tailwindcss/typography')],
}
