package com.ilmoirfanapp
import android.content.res.Configuration
import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ExpoReactHostFactory

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    ExpoReactHostFactory.getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
    createNotificationChannels()
  }

  /**
   * The three channels every push names (`android.notification.channel_id`
   * on the server, `_shared/push.ts`). Creating them here, before any
   * message can arrive, is what lets the reader mute "new books" in the OS
   * settings while keeping "a book you hold was removed". Creating an
   * existing channel is a no-op, so this is safe on every launch; only the
   * names and descriptions are updatable afterwards, importance is not.
   */
  private fun createNotificationChannels() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = getSystemService(NotificationManager::class.java) ?: return

    manager.createNotificationChannel(
      NotificationChannel(
        "catalog",
        "New books & collections",
        NotificationManager.IMPORTANCE_DEFAULT,
      ).apply { description = "When new titles or collections are added to the library." },
    )
    manager.createNotificationChannel(
      NotificationChannel(
        "library",
        "Changes to my books",
        NotificationManager.IMPORTANCE_HIGH,
      ).apply { description = "When a book you have is removed, updated, or gets a new edition." },
    )
    manager.createNotificationChannel(
      NotificationChannel(
        "account",
        "Membership",
        NotificationManager.IMPORTANCE_HIGH,
      ).apply { description = "When your membership starts or ends." },
    )
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}
