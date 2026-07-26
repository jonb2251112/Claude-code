# Replace the `post_install` block at the bottom of ios/Podfile with this.
#
# permission_handler compiles in code for *every* iOS permission it supports.
# App Review rejects binaries that reference APIs (contacts, photos, mic…)
# with no matching usage description in Info.plist. These macros compile the
# unused ones out. This app only ever asks for storage access on Android, so
# every iOS permission is switched off.

post_install do |installer|
  installer.pods_project.targets.each do |target|
    flutter_additional_ios_build_settings(target)

    target.build_configurations.each do |config|
      config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= [
        '$(inherited)',
        'PERMISSION_EVENTS=0',
        'PERMISSION_EVENTS_FULL_ACCESS=0',
        'PERMISSION_REMINDERS=0',
        'PERMISSION_CONTACTS=0',
        'PERMISSION_CAMERA=0',
        'PERMISSION_MICROPHONE=0',
        'PERMISSION_SPEECH_RECOGNIZER=0',
        'PERMISSION_PHOTOS=0',
        'PERMISSION_LOCATION=0',
        'PERMISSION_NOTIFICATIONS=0',
        'PERMISSION_MEDIA_LIBRARY=0',
        'PERMISSION_SENSORS=0',
        'PERMISSION_BLUETOOTH=0',
        'PERMISSION_APP_TRACKING_TRANSPARENCY=0',
        'PERMISSION_CRITICAL_ALERTS=0',
        'PERMISSION_ASSISTANT=0',
      ]

      # Minimum iOS version required by the current plugin set.
      config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '13.0'
    end
  end
end
