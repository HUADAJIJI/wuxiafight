import { defineConfig } from 'vite'

export default defineConfig({
  // 对于 Crazy Games 这种上传 ZIP 包的平台，
  // base 建议设置为 './' 以确保资源路径在任何子目录下都能正确加载。
  base: './', 
  build: {
    outDir: 'dist',
    // 资源文件较小时内联到 JS 中，减少 HTTP 请求数
    assetsInlineLimit: 4096,
    // 确保静态资源命名简洁
    rollupOptions: {
      output: {
        manualChunks: undefined,
      }
    }
  }
})
