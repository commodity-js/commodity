# Commodity React Client Example

A comprehensive React application demonstrating all features of the **Commodity** library - a functional, fully type-inferred, and stateless dependency injection system for TypeScript.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)

## 🚀 Live Demo

This example showcases a social media wireframe built entirely with Commodity's dependency injection patterns, demonstrating how to eliminate prop-drilling while maintaining type safety and testability.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Installation

```bash
# Clone the repository
git clone https://github.com/commodity-js/react-client.git
cd react-client

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

The application will be available at `http://localhost:5173`

### Building for Production

```bash
# Build the application
pnpm build

# Preview the production build
pnpm preview
```

## ✨ Features Demonstrated

### Core Commodity Features

- **📦 Markets and Suppliers** - Organized dependency scopes
- **🔄 Resources and Products** - Data and service containers
- **🎯 Context Switching** - Dynamic dependency resolution with `reassemble()`
- **⚡ Just-in-Time Suppliers** - Lazy loading and conditional assembly
- **🧪 Mocking and Prototypes** - Testing with alternative implementations
- **🔗 Deep Nesting** - No prop-drilling throughout the component tree

### React Integration

- **🎛️ Hook Supplier Pattern** - How to integrate hooks with Supplier
- **🎯 React Query Integration** - Data fetching and preloading with dependency injection
- **🎨 Context propagation and switching** - Impersonate another user down the component tree.

## 🏗️ Architecture Overview

```
src/
├── components/        # UI components as Supplier products
│   ├── app.tsx       # Main app component
│   ├── comment.tsx   # Comment component
│   ├── feed.tsx      # Feed component
│   ├── post.tsx      # Post component
│   ├── reply.tsx     # Reply component
│   └── session.tsx   # Session management component
├── api.ts            # API service definitions and data fetching
├── context.ts        # React context for dependency injection
├── index.css         # Global styles
├── main.tsx          # Application entry point
├── market.ts         # Main market with resources and products
└── query.ts          # React Query integration and hooks
```

## 📚 Learning Path

1. **Explore `src/api.ts`** - See how to integrate react-query for data loading and preloading
2. **Check `src/context.ts`** - See how to aggregate resource definitions in a ctx to replace React Context.
3. **Review `src/components/`** - Understand how to create components as products with JSX
4. **Examine `src/main.tsx`** - See how everything is assembled and used
5. **Experiment with the live demo** - Notice the absence of waterfall loading

## 📖 Related Documentation

- [Commodity Core Library](https://github.com/commodity-js/commodity)
- [Commodity Documentation](https://github.com/commodity-js/commodity#readme)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Built with ❤️ using [Commodity](https://github.com/commodity-js/commodity) - First fully type-inferred DI for TypeScript**
