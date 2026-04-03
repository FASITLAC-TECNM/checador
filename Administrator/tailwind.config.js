module.exports = {
    content: ['./src/**/*.{js,jsx,ts,tsx}'],
    theme: {
        extend: {
            colors: {
                // Fondos
                bg: {
                    primary: 'rgb(var(--bg-primary) / <alpha-value>)',
                    secondary: 'rgb(var(--bg-secondary) / <alpha-value>)',
                    tertiary: 'rgb(var(--bg-tertiary) / <alpha-value>)',
                },

                // Textos
                text: {
                    primary: 'rgb(var(--text-primary) / <alpha-value>)',
                    secondary: 'rgb(var(--text-secondary) / <alpha-value>)',
                    tertiary: 'rgb(var(--text-tertiary) / <alpha-value>)',
                    disabled: 'rgb(var(--text-disabled) / <alpha-value>)',
                },

                // Acento/Brand
                accent: {
                    DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
                    hover: 'rgb(var(--accent-hover) / <alpha-value>)',
                    active: 'rgb(var(--accent-active) / <alpha-value>)',
                    light: 'rgb(var(--accent-light) / <alpha-value>)',
                },

                // Bordes
                border: {
                    subtle: 'rgb(var(--border-subtle) / <alpha-value>)',
                    medium: 'rgb(var(--border-medium) / <alpha-value>)',
                    divider: 'rgb(var(--border-divider) / <alpha-value>)',
                },

                // Estados
                success: 'rgb(var(--success) / <alpha-value>)',
                warning: 'rgb(var(--warning) / <alpha-value>)',
                error: 'rgb(var(--error) / <alpha-value>)',
                info: 'rgb(var(--info) / <alpha-value>)',
            },
            boxShadow: {
                'sm': 'var(--shadow-sm)',
                'md': 'var(--shadow-md)',
                'lg': 'var(--shadow-lg)',
            },
            borderRadius: {
                'card': '12px',
                'button': '8px',
            },
            transitionDuration: {
                'smooth': '300ms',
            },
            fontFamily: {
                'sans': ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'SF Pro Display', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
