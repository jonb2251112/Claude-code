# Nix environment for the ZIP Tools project (zip_iso_tool/).
#
# `flutter` here also provides the bundled `dart`, so both commands resolve.
# The three CLI tools below are what the core test suite shells out to:
#
#   zip     — builds real archives in tests, so we are parsing third-party
#             output rather than our own
#   cdrkit  — provides isoinfo, used to read generated ISOs back and confirm
#             a real ISO 9660 reader accepts them
#   p7zip   — provides 7z, used to extract generated ISOs and assert the
#             payload comes out byte-identical
#
# Without them the suite still passes, but those tests skip and you lose the
# strongest coverage in the project. They are cheap; keep them.

{ pkgs }: {
  deps = [
    pkgs.flutter
    pkgs.zip
    pkgs.unzip
    pkgs.cdrkit
    pkgs.p7zip
  ];
}
