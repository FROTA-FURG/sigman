import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.jsx',
    ],

    theme: {
        extend: {
            fontFamily: {
                sans: ['Figtree', ...defaultTheme.fontFamily.sans],
            },
            keyframes: {
                // Sino balançando quando chega notificação nova
                'bell-shake': {
                    '0%, 100%':      { transform: 'rotate(0deg)' },
                    '10%, 30%, 50%': { transform: 'rotate(-14deg)' },
                    '20%, 40%, 60%': { transform: 'rotate(14deg)' },
                    '70%':           { transform: 'rotate(-6deg)' },
                    '80%':           { transform: 'rotate(6deg)' },
                    '90%':           { transform: 'rotate(0deg)' },
                },
            },
            animation: {
                // Ciclo de 1s repetido: o componente tira a classe depois de 5 segundos
                'bell-shake': 'bell-shake 1s ease-in-out infinite',
            },
        },
    },

    plugins: [forms],
};
