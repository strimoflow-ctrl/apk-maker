// vite.config.js
import { defineConfig } from "file:///C:/Users/cryvex/Desktop/Naino%20Academy/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/cryvex/Desktop/Naino%20Academy/node_modules/@vitejs/plugin-react/dist/index.js";
import obfuscatorPlugin from "file:///C:/Users/cryvex/Desktop/Naino%20Academy/node_modules/vite-plugin-javascript-obfuscator/dist/index.cjs.js";
var vite_config_default = defineConfig(({ command }) => ({
  plugins: [
    react()
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
      "/dl": {
        target: "https://filestreambot-1-jx2x.onrender.com",
        changeOrigin: true
      }
    }
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxjcnl2ZXhcXFxcRGVza3RvcFxcXFxOYWlubyBBY2FkZW15XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxjcnl2ZXhcXFxcRGVza3RvcFxcXFxOYWlubyBBY2FkZW15XFxcXHZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9jcnl2ZXgvRGVza3RvcC9OYWlubyUyMEFjYWRlbXkvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xuaW1wb3J0IG9iZnVzY2F0b3JQbHVnaW4gZnJvbSAndml0ZS1wbHVnaW4tamF2YXNjcmlwdC1vYmZ1c2NhdG9yJ1xuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IGNvbW1hbmQgfSkgPT4gKHtcbiAgcGx1Z2luczogW1xuICAgIHJlYWN0KCksXG4gICAgLy8gY29tbWFuZCA9PT0gJ2J1aWxkJyA/IG9iZnVzY2F0b3JQbHVnaW4oe1xuICAgIC8vICAgaW5jbHVkZTogWydzcmMvKiovKi5qcycsICdzcmMvKiovKi5qc3gnXSxcbiAgICAvLyAgIGV4Y2x1ZGU6IFsvbm9kZV9tb2R1bGVzL10sXG4gICAgLy8gICBhcHBseTogJ2J1aWxkJyxcbiAgICAvLyAgIGRlYnVnZ2VyOiB0cnVlLFxuICAgIC8vICAgb3B0aW9uczoge1xuICAgIC8vICAgICBjb21wYWN0OiB0cnVlLFxuICAgIC8vICAgICBjb250cm9sRmxvd0ZsYXR0ZW5pbmc6IHRydWUsXG4gICAgLy8gICAgIGNvbnRyb2xGbG93RmxhdHRlbmluZ1RocmVzaG9sZDogMSxcbiAgICAvLyAgICAgZGVhZENvZGVJbmplY3Rpb246IHRydWUsXG4gICAgLy8gICAgIGRlYWRDb2RlSW5qZWN0aW9uVGhyZXNob2xkOiAxLFxuICAgIC8vICAgICBkZWJ1Z1Byb3RlY3Rpb246IHRydWUsXG4gICAgLy8gICAgIGRlYnVnUHJvdGVjdGlvbkludGVydmFsOiA0MDAwLFxuICAgIC8vICAgICBkaXNhYmxlQ29uc29sZU91dHB1dDogdHJ1ZSxcbiAgICAvLyAgICAgaWRlbnRpZmllck5hbWVzR2VuZXJhdG9yOiAnaGV4YWRlY2ltYWwnLFxuICAgIC8vICAgICBsb2c6IGZhbHNlLFxuICAgIC8vICAgICBudW1iZXJzVG9FeHByZXNzaW9uczogdHJ1ZSxcbiAgICAvLyAgICAgcmVuYW1lR2xvYmFsczogZmFsc2UsXG4gICAgLy8gICAgIHNlbGZEZWZlbmRpbmc6IHRydWUsXG4gICAgLy8gICAgIHNpbXBsaWZ5OiB0cnVlLFxuICAgIC8vICAgICBzcGxpdFN0cmluZ3M6IHRydWUsXG4gICAgLy8gICAgIHNwbGl0U3RyaW5nc0NodW5rTGVuZ3RoOiA1LFxuICAgIC8vICAgICBzdHJpbmdBcnJheTogdHJ1ZSxcbiAgICAvLyAgICAgc3RyaW5nQXJyYXlDYWxsc1RyYW5zZm9ybTogdHJ1ZSxcbiAgICAvLyAgICAgc3RyaW5nQXJyYXlFbmNvZGluZzogWydyYzQnXSxcbiAgICAvLyAgICAgc3RyaW5nQXJyYXlJbmRleFNoaWZ0OiB0cnVlLFxuICAgIC8vICAgICBzdHJpbmdBcnJheVJvdGF0ZTogdHJ1ZSxcbiAgICAvLyAgICAgc3RyaW5nQXJyYXlTaHVmZmxlOiB0cnVlLFxuICAgIC8vICAgICBzdHJpbmdBcnJheVdyYXBwZXJzQ291bnQ6IDUsXG4gICAgLy8gICAgIHN0cmluZ0FycmF5V3JhcHBlcnNDaGFpbmVkQ2FsbHM6IHRydWUsICAgIFxuICAgIC8vICAgICBzdHJpbmdBcnJheVdyYXBwZXJzUGFyYW1ldGVyc01heENvdW50OiA1LFxuICAgIC8vICAgICBzdHJpbmdBcnJheVdyYXBwZXJzVHlwZTogJ2Z1bmN0aW9uJyxcbiAgICAvLyAgICAgc3RyaW5nQXJyYXlUaHJlc2hvbGQ6IDEsXG4gICAgLy8gICAgIHRyYW5zZm9ybU9iamVjdEtleXM6IHRydWUsXG4gICAgLy8gICAgIHVuaWNvZGVFc2NhcGVTZXF1ZW5jZTogZmFsc2VcbiAgICAvLyAgIH1cbiAgICAvLyB9KSA6IG51bGxcbiAgXSxcbiAgc2VydmVyOiB7XG4gICAgcHJveHk6IHtcbiAgICAgICcvZGwnOiB7XG4gICAgICAgIHRhcmdldDogJ2h0dHBzOi8vZmlsZXN0cmVhbWJvdC0xLWp4Mngub25yZW5kZXIuY29tJyxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgfVxuICAgIH1cbiAgfVxufSkpXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQTZTLFNBQVMsb0JBQW9CO0FBQzFVLE9BQU8sV0FBVztBQUNsQixPQUFPLHNCQUFzQjtBQUc3QixJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFFLFFBQVEsT0FBTztBQUFBLEVBQzVDLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBc0NSO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTixPQUFPO0FBQUEsTUFDTCxPQUFPO0FBQUEsUUFDTCxRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsTUFDaEI7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLEVBQUU7IiwKICAibmFtZXMiOiBbXQp9Cg==
