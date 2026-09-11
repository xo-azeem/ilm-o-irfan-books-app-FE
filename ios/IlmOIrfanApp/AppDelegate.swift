import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  /// Covers the UI while AirPlay / screen recording is active.
  /// Note: iOS cannot fully block still screenshots the way Android FLAG_SECURE can.
  private var captureBlockerWindow: UIWindow?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "IlmOIrfanApp",
      in: window,
      launchOptions: launchOptions
    )

    NotificationCenter.default.addObserver(
      self,
      selector: #selector(updateCaptureBlocker),
      name: UIScreen.capturedDidChangeNotification,
      object: nil
    )
    updateCaptureBlocker()

    return true
  }

  @objc private func updateCaptureBlocker() {
    if UIScreen.main.isCaptured {
      showCaptureBlocker()
    } else {
      hideCaptureBlocker()
    }
  }

  private func showCaptureBlocker() {
    guard captureBlockerWindow == nil else { return }
    let blocker = UIWindow(frame: UIScreen.main.bounds)
    blocker.windowLevel = .alert + 1
    blocker.backgroundColor = .black
    let root = UIViewController()
    root.view.backgroundColor = .black
    let label = UILabel()
    label.text = "Screen recording is not allowed"
    label.textColor = .white
    label.textAlignment = .center
    label.translatesAutoresizingMaskIntoConstraints = false
    root.view.addSubview(label)
    NSLayoutConstraint.activate([
      label.centerXAnchor.constraint(equalTo: root.view.centerXAnchor),
      label.centerYAnchor.constraint(equalTo: root.view.centerYAnchor),
      label.leadingAnchor.constraint(equalTo: root.view.leadingAnchor, constant: 24),
      label.trailingAnchor.constraint(equalTo: root.view.trailingAnchor, constant: -24),
    ])
    blocker.rootViewController = root
    blocker.isHidden = false
    blocker.makeKeyAndVisible()
    captureBlockerWindow = blocker
  }

  private func hideCaptureBlocker() {
    captureBlockerWindow?.isHidden = true
    captureBlockerWindow = nil
    window?.makeKeyAndVisible()
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
