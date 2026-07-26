# ZIP Tools

A cross-platform Flutter app with two jobs: unpack ZIP archives, and turn ZIPs
of game disc data into `.iso` files that mobile emulators can load.

Works fully offline — the Android release build does not even declare the
`INTERNET` permission.

| Extract ZIP | ZIP to ISO |
| --- | --- |
| Multi-select archives, streaming extraction, nested ZIPs, password prompts, optional delete-after | Reads each archive first and shows a plan, then converts BIN/CUE, raw images, or loose file sets |

---

## Project layout

```
zip_iso_tool/
├── packages/disc_core/        Pure Dart. No Flutter imports anywhere.
│   ├── lib/src/zip/           Central-directory inspector, streaming extractor
│   ├── lib/src/disc/          CUE parser, sector codec, format detector
│   ├── lib/src/iso/           ISO 9660 + Joliet image writer
│   └── test/                  49 tests, run with plain `dart test`
├── app/                       The Flutter app
│   ├── lib/services/          Isolates, storage, permissions, share, haptics
│   ├── lib/controllers/       Tab state machines (ChangeNotifier)
│   ├── lib/ui/                Material 3 screens and shared widgets
│   ├── platform_patches/      Manifest / plist / Podfile changes to apply
│   └── test/                  Widget and model tests
└── tool/setup.sh              Generates platform folders and applies patches
```

The split is the important part. All ZIP and ISO logic lives in `disc_core`,
which has no dependency on Flutter, so it runs inside background isolates and
is testable on the plain Dart VM — including against real `isoinfo` and `7z`
in CI. The Flutter layer is only state and pixels.

---

## Setup

You need [Flutter](https://docs.flutter.dev/get-started/install) **3.27 or
newer**. Verified against Flutter 3.44.8 / Dart 3.12.2.

```bash
git clone <this repo>
cd zip_iso_tool
./tool/setup.sh
```

`setup.sh` runs `flutter create` to generate `android/` and `ios/`, applies the
patches in `app/platform_patches/`, fetches packages, and runs both test
suites.

The platform folders are **not** checked in on purpose: `flutter create`
generates them to match your local Flutter, Gradle and Xcode versions, and a
committed `Runner.xcodeproj` from a different machine is a reliable way to get
build failures that have nothing to do with this app.

### Then run it

```bash
cd app
flutter run                    # connected device or emulator
flutter build apk --release    # Android
flutter build ipa              # iOS (needs a Mac + signing)
```

### iOS: two manual steps

`setup.sh` prints reminders, but these need a human:

1. **Podfile.** Replace the `post_install` block in `app/ios/Podfile` with
   `app/platform_patches/ios_podfile_snippet.rb`. Without it App Review rejects
   the build, because `permission_handler` compiles in references to camera,
   contacts and microphone APIs that have no usage description. The snippet
   compiles them out. Then `cd app/ios && pod install`.
2. **Info.plist.** `setup.sh` adds the two Files-app keys automatically on
   macOS. If you also want the app to show up in other apps' *Open in* menus,
   copy `CFBundleDocumentTypes` from
   `app/platform_patches/ios_info_plist_additions.xml`.

### A note on plugin versions

`share_plus` is pinned to `^12.0.2` rather than the latest `13.x` on purpose:
`share_plus` 13.1+ requires `win32 ^6.0.1` while `file_picker` 11 requires
`win32 ^5.9.0`, so the two cannot co-exist. Version solving fails outright if
you bump it. `share_plus` 12 has the same `SharePlus.instance.share(...)` API
this app uses, so nothing is lost.

If you upgrade `file_picker` past 11, re-check that constraint before also
bumping `share_plus`.

---

## Testing

```bash
cd packages/disc_core && dart test    # core logic, no Flutter needed
cd app && flutter test                # widgets and models
```

The core suite is the one that matters. It builds real ZIPs with the system
`zip` tool and validates generated ISOs by reading them back with `isoinfo`
(genisoimage) and extracting them with `7z`, asserting the payload comes out
byte-identical. On Debian/Ubuntu:

```bash
sudo apt-get install genisoimage p7zip-full zip
```

Tests that need those tools skip cleanly when they are missing, so the suite
still passes without them — you just get weaker coverage.

---

## How it works

### Tab 1 — Extract ZIP

Entries are inflated **straight to disk** through `InputFileStream` /
`OutputFileStream`, never buffered in memory. A 40 GB archive extracts in
roughly constant memory, which on a phone is the difference between working and
being OOM-killed.

- **Passwords.** The archive's central directory is read first — cheap, no
  decompression — so encryption is detected *before* a job starts and the user
  is prompted up front rather than a minute in. A wrong password re-prompts
  instead of failing the job.
- **Wrong passwords are actually caught.** The `archive` package decrypts
  without verifying, so a wrong password yields plausible garbage of exactly the
  right length rather than an error. `CrcOutputStream` hashes bytes as they
  stream to disk and compares against the CRC stored in the ZIP, which catches
  both bad passwords and genuine corruption. Failed files are deleted, not left
  behind.
- **Nested ZIPs** are expanded in place into a folder named after the archive,
  up to 4 levels deep. A broken or encrypted inner ZIP is left on disk rather
  than failing the whole job.
- **Zip slip** is blocked: entries with absolute paths or `..` segments are
  refused, so a malicious archive cannot write outside the destination.
- Jobs run **sequentially**, one isolate at a time. Two isolates inflating
  multi-gigabyte archives at once would thrash a phone's I/O for no wall-clock
  gain.

### Tab 2 — ZIP to ISO

Each archive is inspected before anything is written, and the app tells you
what it found and what it will do. Four outcomes:

| What's in the ZIP | What happens |
| --- | --- |
| `.bin` + `.cue` | The CUE is parsed for the data track's sector mode, and the 2048-byte user data is lifted out of each raw sector — a real conversion, not a rename |
| A raw image (`.iso`, `.mdf`, `.img`…) | Sector layout is sniffed; converted if raw, copied if already 2048-byte |
| Loose files (a PSP folder, a ROM set) | Packed into a fresh ISO 9660 image with Joliet long names |
| `.chd`, `.cso`, `.rvz`, `.wux` | Refused with an explanation — these are already-compressed formats most emulators load directly, and decoding them needs codecs this app doesn't ship |

Detection is not just extension matching. `PSP_GAME/SYSDIR/EBOOT.BIN` ends in
`.bin` but is emphatically not a disc image, so `.bin` and `.img` only count as
images when nothing else in the archive looks like an extracted game folder.

**Honest limitations**, surfaced as warnings in the UI rather than buried:

- An ISO holds one data track. CD audio tracks in a mixed-mode rip **cannot**
  be represented — PS1 games with redbook audio will lose their music. The app
  says so and suggests keeping the original BIN/CUE, which most emulators
  prefer anyway.
- GameCube, Wii and some PSP images have no ISO 9660 descriptor because they
  use their own filesystem. That is normal, and the app notes it instead of
  claiming failure.

### The ISO writer

`packages/disc_core/lib/src/iso/iso_writer.dart` is a from-scratch ECMA-119
writer, about 700 lines. It emits a 16-sector system area, a primary volume
descriptor, a Joliet supplementary descriptor (UCS-2BE, escape `%/E`), a
terminator, L- and M-type path tables for both hierarchies, directory extents,
and file payloads shared between both hierarchies — the same layout `mkisofs`
produces.

Details that are easy to get wrong and are covered by tests:

- Every multi-byte field is written in **both** endiannesses, as the spec
  requires, and the tests assert the two agree.
- A directory record may never straddle a 2048-byte sector boundary; records
  that would are pushed to the next sector.
- Primary and Joliet hierarchies sort independently, so each needs its **own**
  path-table indices — sharing them silently corrupts parent pointers.
- File payloads are padded to sector boundaries, but the padding is excluded
  from the recorded file size, so extraction returns the original bytes exactly.
- Names are mangled twice: uppercase `NAME.EXT;1` within 30 characters for the
  primary tree, original text within 64 UCS-2 units for Joliet, with numeric
  discriminators for collisions.

Payloads stream through a fixed 128 KB buffer, so image size is bounded by disk,
not RAM.

---

## Design notes

**Everything heavy runs in an isolate.** These jobs are CPU- and I/O-bound for
minutes; on the UI isolate they would jank every frame. Each job gets its own
isolate and streams progress back over a `SendPort`, throttled to ~16/second so
a loop over thousands of small files cannot flood the event queue.

**Storage is treated as untrustworthy.** Android scoped storage and the iOS
sandbox mean the only reliably writable place is the app's documents directory,
which is the default. A user-picked folder is **probed with a real write** before
any long job starts, rather than failing an hour in. Output filenames get
` (2)`, ` (3)` suffixes rather than overwriting.

**Errors are written for the person holding the phone.** `DiscCoreException`
carries messages meant to be shown verbatim — "This ZIP is truncated — its file
index points past the end of the file" beats a stack trace. `ENOSPC` and
`EACCES` are translated specifically.

**Delete-after-success is genuinely conditional.** The original is removed only
after the job succeeds, and a failed delete (common with picker-provided copies)
does not fail the job.

---

## Known limitations

- **AES-encrypted ZIPs**: `archive` implements AES-256; AES-128/192 and vendor
  extensions are not covered. Failures surface as a password error.
- **No `.chd`/`.cso`/`.rvz` decoding.** Refused up front rather than producing
  a broken ISO.
- **Audio tracks are dropped** by any BIN/CUE → ISO conversion. This is a
  property of the ISO format, not a bug.
- **Free-space checks are best-effort.** `dart:io` exposes no filesystem stats;
  the app shells out to `df` where it can and otherwise relies on translating
  `ENOSPC` when it happens.
- **Cancelling** kills the isolate immediately; partially written output is
  cleaned up by the controller, but a killed isolate mid-write may briefly leave
  a scratch file, cleared on next launch.

## License

MIT
