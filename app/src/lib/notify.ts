import { Capacitor } from "@capacitor/core"

// OS local notifications are optional polish: everything here is native-only and lazily
// imported, so the web build never pulls the plugin in and nothing throws if the user has
// declined permission.

const DL_CHANNEL = "downloads"
const DL_ACTION_TYPE = "sabeel-download"
const DL_NOTIF_BASE = 20000 // per-surah ongoing-progress notification id = base + surah
const SMALL_ICON = "ic_stat_download" // res/drawable/ic_stat_download.xml — Android tints it

// IMPORTANT: return the module *namespace*, not `mod.LocalNotifications`. Returning (or
// awaiting) the Capacitor plugin proxy makes JS treat it as a thenable and call `.then()` on
// it, which Capacitor rejects with "not implemented on android" — silently killing every call.
async function ln() {
  return await import("@capacitor/local-notifications")
}

let permAsked = false
/** Ask for notification permission once per session (native only). Safe to call repeatedly. */
export async function ensureNotifyPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false
  try {
    const { LocalNotifications: LN } = await ln()
    let perm = await LN.checkPermissions()
    if (perm.display === "prompt" || perm.display === "prompt-with-rationale") {
      if (permAsked) return false
      permAsked = true
      perm = await LN.requestPermissions()
    }
    return perm.display === "granted"
  } catch {
    return false
  }
}

let channelReady = false
async function ensureDownloadChannel(): Promise<void> {
  if (channelReady || Capacitor.getPlatform() !== "android") return
  try {
    const { LocalNotifications: LN } = await ln()
    await LN.createChannel({
      id: DL_CHANNEL,
      name: "Downloads",
      description: "Progress of surah audio downloads",
      importance: 2, // LOW — visible in the shade, but no sound/vibration on each progress update
      visibility: 1,
    })
    channelReady = true // only mark ready once creation actually succeeds
  } catch {
    /* leave channelReady false so the next call retries */
  }
}

let actionsReady = false
/** Register the notification "Cancel" action + create the channel up front (so the first
 *  notification isn't dropped for posting to a not-yet-created channel). */
export async function registerDownloadActions(onCancel: (surah: number) => void): Promise<void> {
  if (!Capacitor.isNativePlatform() || actionsReady) return
  actionsReady = true
  try {
    const { LocalNotifications: LN } = await ln()
    await LN.registerActionTypes({
      types: [{ id: DL_ACTION_TYPE, actions: [{ id: "cancel", title: "Cancel", destructive: true }] }],
    })
    await LN.addListener("localNotificationActionPerformed", (event) => {
      if (event.actionId !== "cancel") return
      const surah = event.notification?.extra?.surah
      if (typeof surah === "number") onCancel(surah)
    })
    await ensureDownloadChannel()
  } catch {
    /* ignore */
  }
}

/** Show/refresh the ongoing "Downloading …" notification with a Cancel action (Android only —
 *  iOS has no equivalent ongoing/progress concept). Reschedules the same id to update text. */
export async function showDownloadProgress(
  surah: number,
  name: string,
  done: number,
  total: number,
): Promise<void> {
  if (Capacitor.getPlatform() !== "android") return
  try {
    const { LocalNotifications: LN } = await ln()
    if ((await LN.checkPermissions()).display !== "granted") return
    await ensureDownloadChannel()
    await LN.schedule({
      notifications: [
        {
          id: DL_NOTIF_BASE + surah,
          title: `Downloading ${name}`,
          body: `${done} of ${total} verses saved`,
          channelId: DL_CHANNEL,
          smallIcon: SMALL_ICON,
          ongoing: true, // non-dismissible while the download is running
          autoCancel: false,
          actionTypeId: DL_ACTION_TYPE,
          extra: { surah },
        },
      ],
    })
  } catch {
    /* ignore — a missed progress notification is not worth surfacing */
  }
}

/** Remove the ongoing download notification for a surah (on finish, cancel, or error). */
export async function clearDownloadProgress(surah: number): Promise<void> {
  if (Capacitor.getPlatform() !== "android") return
  try {
    const { LocalNotifications: LN } = await ln()
    await LN.cancel({ notifications: [{ id: DL_NOTIF_BASE + surah }] })
  } catch {
    /* ignore */
  }
}

let nextId = 1
/** Fire an immediate one-off local notification (native only, best-effort — never throws). */
export async function notify(title: string, body: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try {
    const { LocalNotifications: LN } = await ln()
    if ((await LN.checkPermissions()).display !== "granted") return
    await LN.schedule({ notifications: [{ id: nextId++, title, body, smallIcon: SMALL_ICON }] })
  } catch {
    /* ignore — a missed notification is not worth surfacing */
  }
}
