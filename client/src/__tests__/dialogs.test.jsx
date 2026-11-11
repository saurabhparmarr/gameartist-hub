import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConfirmDialog from "../components/ConfirmDialog.jsx";

function DialogFixture({ isLoading = false }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)}>Open confirmation</button>
      {isOpen && (
        <ConfirmDialog
          title="Remove item?"
          message="This action cannot be undone."
          isLoading={isLoading}
          onConfirm={() => {}}
          onCancel={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

describe("Confirmation dialog accessibility", () => {
  it("moves focus into the dialog, traps tab focus, and restores focus on Escape", async () => {
    const user = userEvent.setup();
    render(<DialogFixture />);

    const trigger = screen.getByRole("button", { name: "Open confirmation" });
    await user.click(trigger);
    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    const confirmButton = screen.getByRole("button", { name: "Delete" });

    expect(cancelButton).toHaveFocus();
    await user.tab();
    expect(confirmButton).toHaveFocus();
    await user.tab();
    expect(cancelButton).toHaveFocus();
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("does not dismiss while a confirmation action is in progress", async () => {
    const user = userEvent.setup();
    render(<DialogFixture isLoading />);
    await user.click(screen.getByRole("button", { name: "Open confirmation" }));
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("alertdialog").parentElement);

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });
});
