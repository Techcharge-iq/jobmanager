import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
				sans: ['"Inter Variable"', 'Inter', 'ui-sans-serif', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', '"Noto Sans Arabic"', 'sans-serif'],
			},
			fontSize: {
				h1: ['1.75rem', { lineHeight: '2.25rem', letterSpacing: '-0.022em', fontWeight: '650' }],
				h2: ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.016em', fontWeight: '600' }],
				h3: ['1rem', { lineHeight: '1.5rem', letterSpacing: '-0.01em', fontWeight: '600' }],
				display: ['2rem', { lineHeight: '2.5rem', letterSpacing: '-0.02em' }],
			},
			boxShadow: {
				sm: 'var(--shadow-sm)',
				DEFAULT: 'var(--shadow-sm)',
				md: 'var(--shadow-md)',
				lg: 'var(--shadow-lg)',
				card: 'var(--shadow-card)',
				glass: 'var(--shadow-glass)',
				glow: 'var(--shadow-glow)',
			},
			colors: {
				lavender: { DEFAULT: 'hsl(var(--tone-lavender))', foreground: 'hsl(var(--tone-lavender-fg))' },
				mint: { DEFAULT: 'hsl(var(--tone-mint))', foreground: 'hsl(var(--tone-mint-fg))' },
				peach: { DEFAULT: 'hsl(var(--tone-peach))', foreground: 'hsl(var(--tone-peach-fg))' },
				sky: { DEFAULT: 'hsl(var(--tone-sky))', foreground: 'hsl(var(--tone-sky-fg))' },
				rose: { DEFAULT: 'hsl(var(--tone-rose))', foreground: 'hsl(var(--tone-rose-fg))' },
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'tab-in': {
					from: { opacity: '0', transform: 'translateY(4px) scale(0.96)' },
					to: { opacity: '1', transform: 'translateY(0) scale(1)' }
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'tab-in': 'tab-in 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)'
			}
		}
	},
	plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
