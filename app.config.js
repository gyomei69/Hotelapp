/**
 * Dynamic Expo config: merges app.json + Google OAuth return URL handling.
 * Rebuild native Android after changing EXPO_PUBLIC_GOOGLE_* env (EAS or `npx expo prebuild`).
 */
const fs = require('fs');
const path = require('path');

const appJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'app.json'), 'utf8'));

function reversedGoogleScheme(clientId) {
  if (!clientId || typeof clientId !== 'string' || !clientId.includes('.apps.googleusercontent.com')) {
    return null;
  }
  const suffix = clientId.replace('.apps.googleusercontent.com', '').trim();
  if (!suffix) return null;
  return `com.googleusercontent.apps.${suffix}`;
}

module.exports = () => {
  const expo = { ...appJson.expo };
  // Lets Expo embed `originalFullName` (@owner/slug) so AuthSession / auth.expo.io matches Google redirect URIs.
  const expoOwner = typeof process.env.EXPO_PUBLIC_EXPO_OWNER === 'string' ? process.env.EXPO_PUBLIC_EXPO_OWNER.trim() : '';
  if (expoOwner) {
    expo.owner = expoOwner;
  }
  const androidId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
  const iosId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const webId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

  const androidScheme = reversedGoogleScheme(androidId) || reversedGoogleScheme(webId);
  const iosScheme = reversedGoogleScheme(iosId) || reversedGoogleScheme(androidId) || reversedGoogleScheme(webId);

  const baseScheme = expo.scheme != null ? expo.scheme : 'appdev';
  const schemeList = Array.isArray(baseScheme) ? [...baseScheme] : [String(baseScheme)];
  if (androidScheme && !schemeList.includes(androidScheme)) {
    schemeList.push(androidScheme);
  }

  // Match redirect_uri from AuthContext: com.googleusercontent.apps.<suffix>:/oauth2redirect/google
  // Optional hierarchical form (://oauth2redirect/google) for the same scheme.
  const googleAndroidIntentFilters = androidScheme
    ? [
        {
          action: 'VIEW',
          autoVerify: false,
          data: [
            { scheme: androidScheme, path: '/oauth2redirect/google' },
            {
              scheme: androidScheme,
              host: 'oauth2redirect',
              pathPrefix: '/google',
            },
          ],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ]
    : [];

  return {
    expo: {
      ...expo,
      scheme: schemeList.length === 1 ? schemeList[0] : schemeList,
      android: {
        ...expo.android,
        intentFilters: [...(expo.android?.intentFilters || []), ...googleAndroidIntentFilters],
      },
      ios: {
        ...expo.ios,
        ...(iosScheme
          ? {
              infoPlist: {
                ...(expo.ios?.infoPlist || {}),
                CFBundleURLTypes: [
                  ...(Array.isArray(expo.ios?.infoPlist?.CFBundleURLTypes)
                    ? expo.ios.infoPlist.CFBundleURLTypes
                    : []),
                  {
                    CFBundleURLName: 'google-oauth',
                    CFBundleURLSchemes: [iosScheme],
                  },
                ],
              },
            }
          : {}),
      },
    },
  };
};
