import React from "react";

import { Dialog } from "@excalidraw/excalidraw/components/Dialog";
import { Button } from "@excalidraw/excalidraw/components/Button";
import { CheckboxItem } from "@excalidraw/excalidraw/components/CheckboxItem";

import type { RecordingSettings } from "./recordingSettings";
import type { RecordingBackgroundCategory } from "./backgrounds";

import "./RecordingDialog.scss";

const ASPECT_RATIOS: RecordingSettings["aspectRatio"][] = [
  "16:9",
  "9:16",
  "1:1",
];

export type RecordingDialogLabels = {
  title: string;
  start: string;
  aspectRatio: string;
  background: string;
  cursorHighlight: string;
  camera: string;
  teleprompter: string;
};

export const RecordingDialog = ({
  isOpen,
  settings,
  backgrounds,
  labels,
  onClose,
  onSettingsChange,
  onStart,
}: {
  isOpen: boolean;
  settings: RecordingSettings;
  backgrounds: RecordingBackgroundCategory[];
  labels: RecordingDialogLabels;
  onClose: () => void;
  onSettingsChange: (settings: RecordingSettings) => void;
  onStart: () => void;
}) => {
  if (!isOpen) {
    return null;
  }

  const updateSettings = (partial: Partial<RecordingSettings>) => {
    onSettingsChange({ ...settings, ...partial });
  };

  return (
    <Dialog size="small" onCloseRequest={onClose} title={labels.title}>
      <div className="RecordingDialog">
        <section className="RecordingDialog__section">
          <div className="RecordingDialog__sectionTitle">
            {labels.aspectRatio}
          </div>
          <div className="RecordingDialog__ratioGrid">
            {ASPECT_RATIOS.map((ratio) => (
              <button
                key={ratio}
                type="button"
                className={
                  ratio === settings.aspectRatio
                    ? "RecordingDialog__ratioButton is-selected"
                    : "RecordingDialog__ratioButton"
                }
                aria-pressed={ratio === settings.aspectRatio}
                onClick={() => updateSettings({ aspectRatio: ratio })}
              >
                {ratio}
              </button>
            ))}
          </div>
        </section>

        <section className="RecordingDialog__section">
          <div className="RecordingDialog__sectionTitle">
            {labels.background}
          </div>
          <div className="RecordingDialog__backgrounds">
            {backgrounds.map((category) => (
              <div
                key={category.id}
                className="RecordingDialog__backgroundCategory"
              >
                <div className="RecordingDialog__backgroundLabel">
                  {category.label}
                </div>
                <div className="RecordingDialog__backgroundGrid">
                  {category.options.map((option) => {
                    const isSelected =
                      settings.background.category === category.id &&
                      settings.background.id === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        className={
                          isSelected
                            ? "RecordingDialog__backgroundSwatch is-selected"
                            : "RecordingDialog__backgroundSwatch"
                        }
                        aria-pressed={isSelected}
                        aria-label={option.label}
                        onClick={() =>
                          updateSettings({
                            background: {
                              category: category.id,
                              id: option.id,
                            },
                          })
                        }
                      >
                        <span
                          className="RecordingDialog__backgroundPreview"
                          style={
                            option.color
                              ? { backgroundColor: option.color }
                              : option.previewUrl
                                ? {
                                    backgroundImage: `url(${option.previewUrl})`,
                                  }
                                : undefined
                          }
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="RecordingDialog__section RecordingDialog__toggles">
          <CheckboxItem
            checked={settings.cursorHighlight}
            onChange={(checked) => updateSettings({ cursorHighlight: checked })}
          >
            {labels.cursorHighlight}
          </CheckboxItem>
          <CheckboxItem
            checked={settings.cameraEnabled}
            onChange={(checked) => updateSettings({ cameraEnabled: checked })}
          >
            {labels.camera}
          </CheckboxItem>
          <CheckboxItem
            checked={settings.teleprompterEnabled}
            onChange={(checked) => updateSettings({ teleprompterEnabled: checked })}
          >
            {labels.teleprompter}
          </CheckboxItem>
        </section>

        <div className="RecordingDialog__actions">
          <Button onSelect={onStart} className="RecordingDialog__startButton">
            {labels.start}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
