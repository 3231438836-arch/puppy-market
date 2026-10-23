import {defineConfig,devices} from '@playwright/test';
import base from './playwright.config';
// Optional Safari-engine checks. Install WebKit first; these do not replace iPhone testing.
export default defineConfig({...base,testMatch:'layout.spec.ts',use:{...base.use,...devices['iPhone 13'],browserName:'webkit',launchOptions:{},baseURL:'http://127.0.0.1:5173'}});
