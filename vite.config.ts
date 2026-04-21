import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  // 这里的 base 必须与你的 GitHub 仓库名称一致
  // 例如：https://<USERNAME>.github.io/wuxiafight/
  base: '/wuxiafight/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});
