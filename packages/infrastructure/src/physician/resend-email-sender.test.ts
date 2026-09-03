import { describe, expect, it, vi } from "vitest";

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));
vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({ emails: { send: sendMock } })),
}));

const { ResendEmailSender } = await import("./resend-email-sender.js");

describe("ResendEmailSender", () => {
  it("sends via Resend with the given from address and message fields", async () => {
    sendMock.mockResolvedValue({ data: { id: "email-1" }, error: null });
    const sender = new ResendEmailSender("re_fake_key", "Epitaxy <noreply@example.com>");

    await sender.send({
      to: "ana@example.com",
      subject: "Confirm your account",
      html: "<p>Hi</p>",
      text: "Hi",
    });

    expect(sendMock).toHaveBeenCalledWith({
      from: "Epitaxy <noreply@example.com>",
      to: "ana@example.com",
      subject: "Confirm your account",
      html: "<p>Hi</p>",
      text: "Hi",
    });
  });

  it("throws when Resend reports an error", async () => {
    sendMock.mockResolvedValue({ data: null, error: { message: "invalid API key" } });
    const sender = new ResendEmailSender("re_fake_key", "Epitaxy <noreply@example.com>");

    await expect(
      sender.send({ to: "ana@example.com", subject: "s", html: "h", text: "t" }),
    ).rejects.toThrow(/invalid API key/);
  });
});
