# Scarcity Website

The official website and documentation for the Scarcity library, showcasing its powerful dependency injection capabilities.

## 🌟 Features

- **Beautiful Landing Page**: Modern design with Scarcity's signature orange gradient palette
- **Interactive Examples**: Live demo of 4-level deep component hierarchy with context switching
- **Responsive Design**: Works perfectly on all devices
- **GitHub Pages Deployment**: Automatically deployed on every commit

## 🎨 Design

The website uses Scarcity's signature color palette inspired by the official logo:

- **Primary Orange**: `#ff9500`
- **Amber**: `#ffb92e`
- **Yellow**: `#ffd60a`
- **Red**: `#ff6b6b`
- **Dark Theme**: `#1a1a1a`

## 🚀 Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm run dev

# Build for production
pnpm run build
```

## 📦 Deployment

The website is automatically deployed to GitHub Pages using GitHub Actions. The workflow:

1. Builds the Next.js app with static export
2. Uploads the `out/` directory to GitHub Pages
3. Deploys to `https://scarcity-js.github.io/scarcity`

## 🧩 Live Demo

The website features a live demonstration of Scarcity's dependency injection system:

- **4-level component hierarchy**: Level 1 → Level 2 → Level 3 → Level 4
- **Context switching**: Level 2 modifies the config using `resupply()`
- **Visual comparison**: See original vs modified configs side by side
- **Type safety**: Full TypeScript inference throughout

## 🔗 Links

- **Live Website**: [scarcity-js.github.io/scarcity](https://scarcity-js.github.io/scarcity)
- **GitHub Repository**: [github.com/scarcity-js/scarcity](https://github.com/scarcity-js/scarcity)
- **Interactive Demo**: [/examples](https://scarcity-js.github.io/scarcity/examples)

## 🛠️ Built With

- **Next.js 15**: React framework with App Router
- **Tailwind CSS 4**: Utility-first CSS framework
- **TypeScript**: Type-safe development
- **Lucide React**: Beautiful icons
- **Scarcity**: Our own dependency injection library!
