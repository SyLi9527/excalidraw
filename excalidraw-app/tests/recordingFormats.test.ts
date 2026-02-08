import {
  getFileExtension,
  getSupportedMimeType,
  MIME_TYPE_MP4,
  MIME_TYPE_WEBM,
  MIME_TYPE_WEBM_VP9,
} from "../recording/recordingFormats";

describe("recordingFormats", () => {
  it("prefers mp4 when supported", () => {
    const isSupported = (type: string) => type === MIME_TYPE_MP4;
    expect(getSupportedMimeType(isSupported)).toBe(MIME_TYPE_MP4);
  });

  it("falls back to vp9 when mp4 unsupported", () => {
    const isSupported = (type: string) => type === MIME_TYPE_WEBM_VP9;
    expect(getSupportedMimeType(isSupported)).toBe(MIME_TYPE_WEBM_VP9);
  });

  it("falls back to webm when nothing else supported", () => {
    const isSupported = () => false;
    expect(getSupportedMimeType(isSupported)).toBe(MIME_TYPE_WEBM);
  });

  it("maps mime types to file extensions", () => {
    expect(getFileExtension(MIME_TYPE_MP4)).toBe("mp4");
    expect(getFileExtension(MIME_TYPE_WEBM_VP9)).toBe("webm");
    expect(getFileExtension(MIME_TYPE_WEBM)).toBe("webm");
  });
});
