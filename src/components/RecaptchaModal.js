import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, View, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

const getSiteKey = () =>
  typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_RECAPTCHA_SITE_KEY || '' : '';

const buildHtml = (siteKey) => `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://www.google.com/recaptcha/api.js?render=explicit" async defer></script>
  <style>html,body{margin:0;background:transparent;}</style>
</head>
<body>
  <div id="captcha-container"></div>
  <script>
    (function () {
      function send(o) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(o));
        }
      }
      var tmo = setTimeout(function () {
        send({ type: 'error', code: 'timeout' });
      }, 120000);
      var iv = setInterval(function () {
        if (window.grecaptcha && grecaptcha.render) {
          clearInterval(iv);
          try {
            var wid = grecaptcha.render('captcha-container', {
              sitekey: ${JSON.stringify(siteKey)},
              size: 'invisible',
              callback: function (token) {
                clearTimeout(tmo);
                send({ type: 'token', token: token });
              },
              'error-callback': function () {
                clearTimeout(tmo);
                send({ type: 'error', code: 'widget' });
              },
              'expired-callback': function () {
                clearTimeout(tmo);
                send({ type: 'error', code: 'expired' });
              },
            });
            grecaptcha.execute(wid);
          } catch (e) {
            clearTimeout(tmo);
            send({ type: 'error', code: 'exception' });
          }
        }
      }, 50);
    })();
  </script>
</body>
</html>`;

/**
 * Invisible reCAPTCHA v2 in a WebView; posts token to RN via postMessage.
 * Site key from EXPO_PUBLIC_RECAPTCHA_SITE_KEY only (never the secret).
 */
export default function RecaptchaModal({ visible, onClose, onToken, onError }) {
  const siteKey = useMemo(() => getSiteKey(), []);
  const [webKey, setWebKey] = useState(0);
  const html = useMemo(() => buildHtml(siteKey), [siteKey]);

  useEffect(() => {
    if (visible && !siteKey) {
      onError?.();
      onClose();
    }
  }, [visible, siteKey, onClose, onError]);

  useEffect(() => {
    if (visible && siteKey) {
      setWebKey((k) => k + 1);
    }
  }, [visible, siteKey]);

  const handleMessage = useCallback(
    (event) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data?.type === 'token' && data.token) {
          onToken(data.token);
          onClose();
          return;
        }
        if (data?.type === 'error') {
          onError?.();
          onClose();
        }
      } catch {
        onError?.();
        onClose();
      }
    },
    [onClose, onError, onToken]
  );

  if (!visible || !siteKey) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.wrap} pointerEvents="box-none">
        <View style={styles.holder}>
          <View style={styles.webShell}>
            <WebView
              key={webKey}
              source={{ html, baseUrl: 'https://localhost' }}
              onMessage={handleMessage}
              style={styles.web}
              javaScriptEnabled
              domStorageEnabled
              originWhitelist={['*']}
              mixedContentMode="always"
              thirdPartyCookiesEnabled
              sharedCookiesEnabled
              onHttpError={() => {
                onError?.();
                onClose();
              }}
              onError={() => {
                onError?.();
                onClose();
              }}
              {...(Platform.OS === 'android' ? { nestedScrollEnabled: true } : {})}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  holder: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 1,
    height: 1,
    overflow: 'hidden',
    opacity: 0.02,
  },
  webShell: {
    width: 320,
    height: 120,
    position: 'absolute',
  },
  web: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
