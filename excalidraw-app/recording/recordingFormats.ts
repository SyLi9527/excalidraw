export const MIME_TYPE_MP4 = "video/mp4;codecs=avc1,mp4a";
export const MIME_TYPE_WEBM_VP9 = "video/webm;codecs=vp9,opus";
export const MIME_TYPE_WEBM = "video/webm";

type MimeSupportChecker = (mimeType: string) => boolean;

export const getSupportedMimeType = (
  isTypeSupported: MimeSupportChecker = MediaRecorder.isTypeSupported,
): string => {
  if (isTypeSupported(MIME_TYPE_MP4)) {
    return MIME_TYPE_MP4;
  }
  if (isTypeSupported(MIME_TYPE_WEBM_VP9)) {
    return MIME_TYPE_WEBM_VP9;
  }
  if (isTypeSupported(MIME_TYPE_WEBM)) {
    return MIME_TYPE_WEBM;
  }
  return MIME_TYPE_WEBM;
};

export const getFileExtension = (mimeType: string): "mp4" | "webm" => {
  if (mimeType.startsWith("video/mp4")) {
    return "mp4";
  }
  return "webm";
};
