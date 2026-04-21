import { defineConfig } from 'vite'

export default defineConfig({
  // 如果你的 GitHub 仓库地址是 https://github.com/用户名/wuxiafight/
  // 那么 base 必须设置为 '/wuxiafight/'
  base: '/wuxiafight/', 
  build: {
    outDir: 'dist',
  }
})
