export type RecordingBackgroundOption = {
  id: string;
  label: string;
  color?: string;
  previewUrl?: string;
};

export type RecordingBackgroundCategory = {
  id: string;
  label: string;
  options: RecordingBackgroundOption[];
};

export const recordingBackgrounds: RecordingBackgroundCategory[] = [
  {
    id: "solid",
    label: "Solid",
    options: [
      {
        id: "white",
        label: "White",
        color: "#ffffff",
      },
      {
        id: "dark",
        label: "Dark",
        color: "#1f2933",
      },
    ],
  },
  {
    id: "vibrant",
    label: "Vibrant",
    options: [
      {
        id: "vibrant-1",
        label: "Vibrant Glow",
        previewUrl: "/recording/backgrounds/vibrant-1.svg",
      },
    ],
  },
  {
    id: "pastel",
    label: "Pastel",
    options: [
      {
        id: "pastel-1",
        label: "Pastel Mist",
        previewUrl: "/recording/backgrounds/pastel-1.svg",
      },
    ],
  },
  {
    id: "dark",
    label: "Dark",
    options: [
      {
        id: "dark-1",
        label: "Midnight Fade",
        previewUrl: "/recording/backgrounds/dark-1.svg",
      },
    ],
  },
  {
    id: "nature",
    label: "Nature",
    options: [
      {
        id: "nature-1",
        label: "Green Hills",
        previewUrl: "/recording/backgrounds/nature-1.svg",
      },
    ],
  },
];
