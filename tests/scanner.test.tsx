// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Scanner } from "@/components/scanner";

// jsdom lacks these APIs that Radix UI touches during pointer interactions.
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

const messagePlaceholder = /Paste the suspicious email/i;
const headersPlaceholder = /Authentication-Results/i;

describe("Scanner input modes", () => {
  it("clears the textarea when switching from Message to Email headers", async () => {
    const user = userEvent.setup();
    render(<Scanner />);

    const textarea = screen.getByPlaceholderText(
      messagePlaceholder,
    ) as HTMLTextAreaElement;
    await user.type(textarea, "scam text here");
    expect(textarea.value).toBe("scam text here");

    await user.click(screen.getByRole("tab", { name: /Email headers/i }));

    const headersArea = screen.getByPlaceholderText(
      headersPlaceholder,
    ) as HTMLTextAreaElement;
    expect(headersArea.value).toBe("");
  });

  it("does not carry text back when switching headers -> message", async () => {
    const user = userEvent.setup();
    render(<Scanner />);

    await user.click(screen.getByRole("tab", { name: /Email headers/i }));
    const headersArea = screen.getByPlaceholderText(
      headersPlaceholder,
    ) as HTMLTextAreaElement;
    await user.type(headersArea, "From: a@b.com");
    expect(headersArea.value).toBe("From: a@b.com");

    await user.click(screen.getByRole("tab", { name: /Message/i }));
    const messageArea = screen.getByPlaceholderText(
      messagePlaceholder,
    ) as HTMLTextAreaElement;
    expect(messageArea.value).toBe("");
  });

  it("loading a sample switches to its mode and populates the field", async () => {
    const user = userEvent.setup();
    render(<Scanner />);

    await user.click(screen.getByText("CEO impersonation"));
    const headersArea = screen.getByPlaceholderText(
      headersPlaceholder,
    ) as HTMLTextAreaElement;
    expect(headersArea.value).toContain("spf=fail");
  });

  it("disables Scan until there is input, enables once text is entered", async () => {
    const user = userEvent.setup();
    render(<Scanner />);

    const scanButton = screen.getByRole("button", {
      name: /Scan it/i,
    }) as HTMLButtonElement;
    expect(scanButton.disabled).toBe(true);

    await user.type(screen.getByPlaceholderText(messagePlaceholder), "hello");
    expect(scanButton.disabled).toBe(false);
  });

  it("the Clear button empties the active input", async () => {
    const user = userEvent.setup();
    render(<Scanner />);

    const textarea = screen.getByPlaceholderText(
      messagePlaceholder,
    ) as HTMLTextAreaElement;
    await user.type(textarea, "something");

    await user.click(screen.getByRole("button", { name: /^Clear$/i }));
    expect(textarea.value).toBe("");
  });
});
