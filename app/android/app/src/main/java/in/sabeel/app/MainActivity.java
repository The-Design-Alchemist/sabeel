package in.sabeel.app;

import com.getcapacitor.BridgeActivity;

/**
 * Android 13+ (API 33) gates ALL notifications — including the media/lock-screen controls from
 * @capgo/capacitor-media-session — behind runtime POST_NOTIFICATIONS.
 *
 * That permission is deliberately NOT requested here. Asking in onCreate put the system dialog
 * on screen over the first onboarding slide, before the user had any idea what Sabeel was or why
 * it wanted notifications — which is both a poor first impression and the surest way to get
 * denied. It's now requested from the web layer at the two moments it actually earns itself:
 * the first time audio plays (see PlaybackProvider) and the first time a download starts
 * (see DownloadNotifications), both via ensureNotifyPermission() in src/lib/notify.ts.
 */
public class MainActivity extends BridgeActivity {}
