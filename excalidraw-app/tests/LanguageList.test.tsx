import { UI } from "@excalidraw/excalidraw/tests/helpers/ui";
import {
  screen,
  fireEvent,
  waitFor,
  render,
} from "@excalidraw/excalidraw/tests/test-utils";

import ExcalidrawApp from "../App";

describe("Test LanguageList", () => {
  it("rerenders UI on language change", async () => {
    const openMainMenu = async () => {
      if (!document.querySelector('[data-testid="dropdown-menu"]')) {
        fireEvent.click(screen.getByTestId("main-menu-trigger"));
      }
      await screen.findByTestId("dropdown-menu");
    };

    await render(<ExcalidrawApp />);

    // select rectangle tool to show properties menu
    UI.clickTool("rectangle");
    // english lang should display `thin` label
    expect(screen.queryByTitle(/thin/i)).not.toBeNull();
    await openMainMenu();
    fireEvent.click(await screen.findByLabelText(/中文/));
    // switching to german, `thin` label should no longer exist
    await waitFor(() => expect(screen.queryByTitle(/thin/i)).toBeNull());
    expect(screen.queryByTitle(/细/)).not.toBeNull();
    // reset language
    await openMainMenu();
    fireEvent.click(await screen.findByLabelText(/English/i));
    // switching back to English
    await waitFor(() => expect(screen.queryByTitle(/thin/i)).not.toBeNull());
  });
});
