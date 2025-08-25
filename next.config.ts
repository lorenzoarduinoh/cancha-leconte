import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable experimental features that might conflict with Jest
  experimental: {
    workerThreads: false,
    serverActions: {
      allowedOrigins: []
    }
  },
  
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.parallelism = 1;
      
      // Bloquear módulos de Jest completamente
      config.resolve.alias = {
        ...config.resolve.alias,
        'jest-worker': false,
        '@jest/core': false,
        '@jest/transform': false,
        '@jest/globals': false,
        'jest-environment-jsdom': false,
        'ts-jest': false,
      };
      
      // Externals para evitar bundling
      config.externals = config.externals || [];
      config.externals.push(
        'jest-worker',
        '@jest/core',
        '@jest/transform',
        '@jest/globals',
        'jest-environment-jsdom',
        'ts-jest'
      );
      
      // Plugin para ignorar imports de Jest
      const webpack = require('webpack');
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^(jest-worker|@jest\/core|@jest\/transform)$/,
        })
      );
      
      // Excluir archivos de test del bundle
      config.module.rules.push({
        test: /\.(test|spec)\.(js|jsx|ts|tsx)$/,
        loader: 'ignore-loader'
      });
    }
    
    return config;
  },
  
  // Optimize for development stability
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
};

export default nextConfig;