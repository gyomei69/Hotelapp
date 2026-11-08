/**
 * expo-web-browser (Android): openAuthSessionAsync polyfill races AppState "active" vs Linking URL.
 * AppState often wins right after OAuth completes → { type: 'dismiss' } and sign-in never finishes.
 * Re-apply after every `npm install`. Safe if expo-web-browser changes (no-op with warning).
 */
const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'node_modules', 'expo-web-browser', 'build', 'WebBrowser.js');
if (!fs.existsSync(target)) {
  console.warn('[patch-expo-web-browser-android-auth] skip: expo-web-browser not installed yet');
  process.exit(0);
}

let s = fs.readFileSync(target, 'utf8');
if (s.includes('Patched: do not race _openBrowserAndWaitAndroidAsync')) {
  console.log('[patch-expo-web-browser-android-auth] already applied');
  process.exit(0);
}

const needle = `        if (Platform.OS === 'android') {
            return await Promise.race([
                _openBrowserAndWaitAndroidAsync(startUrl, browserParams),
                _waitForRedirectAsync(returnUrl),
            ]);
        }`;

const replacement = `        if (Platform.OS === 'android') {
            // Patched: do not race _openBrowserAndWaitAndroidAsync vs Linking (Hotelapp scripts/patch-expo-web-browser-android-auth.js).
            const redirectPromise = _waitForRedirectAsync(returnUrl);
            const openResult = await openBrowserAsync(startUrl, browserParams);
            if (openResult.type !== WebBrowserResultType.OPENED) {
                return { type: openResult.type };
            }
            return await Promise.race([
                redirectPromise,
                new Promise((resolve) => setTimeout(() => resolve({ type: WebBrowserResultType.DISMISS }), 120000)),
            ]);
        }`;

if (!s.includes(needle)) {
  console.warn(
    '[patch-expo-web-browser-android-auth] skip: upstream WebBrowser.js changed; re-check expo-web-browser openAuthSession polyfill for Android'
  );
  process.exit(0);
}

fs.writeFileSync(target, s.replace(needle, replacement), 'utf8');
console.log('[patch-expo-web-browser-android-auth] applied Android OAuth race fix');
