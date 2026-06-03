import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import obfuscatorPlugin from 'vite-plugin-javascript-obfuscator'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    // command === 'build' ? obfuscatorPlugin({
    //   include: ['src/**/*.js', 'src/**/*.jsx'],
    //   exclude: [/node_modules/],
    //   apply: 'build',
    //   debugger: true,
    //   options: {
    //     compact: true,
    //     controlFlowFlattening: true,
    //     controlFlowFlatteningThreshold: 1,
    //     deadCodeInjection: true,
    //     deadCodeInjectionThreshold: 1,
    //     debugProtection: true,
    //     debugProtectionInterval: 4000,
    //     disableConsoleOutput: true,
    //     identifierNamesGenerator: 'hexadecimal',
    //     log: false,
    //     numbersToExpressions: true,
    //     renameGlobals: false,
    //     selfDefending: true,
    //     simplify: true,
    //     splitStrings: true,
    //     splitStringsChunkLength: 5,
    //     stringArray: true,
    //     stringArrayCallsTransform: true,
    //     stringArrayEncoding: ['rc4'],
    //     stringArrayIndexShift: true,
    //     stringArrayRotate: true,
    //     stringArrayShuffle: true,
    //     stringArrayWrappersCount: 5,
    //     stringArrayWrappersChainedCalls: true,    
    //     stringArrayWrappersParametersMaxCount: 5,
    //     stringArrayWrappersType: 'function',
    //     stringArrayThreshold: 1,
    //     transformObjectKeys: true,
    //     unicodeEscapeSequence: false
    //   }
    // }) : null
  ],
  server: {
    proxy: {
      '/dl': {
        target: 'https://filestreambot-1-jx2x.onrender.com',
        changeOrigin: true,
      }
    }
  }
}))
