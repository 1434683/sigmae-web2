// Fix: Removed the triple-slash directive `/// <reference types="node" />` which was causing an error
// because the corresponding type definitions were not found. The code works without it.

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
