# R8 rules for the release build. Most libraries ship their own consumer
# rules; the ones below cover what reaches Java by reflection or JNI and is
# not declared by the library itself.

# react-native-config reads the baked .env values off BuildConfig by name.
-keep class com.ilmoirfanapp.BuildConfig { *; }

# react-native-pdf: Pdfium is driven over JNI, and the viewer serialises its
# outline with Gson (field names are the JSON keys).
-keep class io.legere.pdfiumandroid.** { *; }
-keep class com.github.barteksc.pdfviewer.** { *; }
-keep class org.wonday.pdf.** { *; }
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}

# Nitro modules (react-native-mmkv, react-native-quick-crypto) bind over JNI.
-keep class com.margelo.nitro.** { *; }

# Firebase Messaging's headless task and RevenueCat's models are reached by
# name from native code.
-keep class io.invertase.firebase.** { *; }
-keep class com.revenuecat.purchases.** { *; }

# Hermes / React Native JSI turbo modules and codegen'd specs.
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }
-keep,includedescriptorclasses class com.facebook.react.bridge.** { *; }

# Keep line numbers for readable crash reports; the mapping file de-obfuscates
# the rest and travels with the AAB.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
