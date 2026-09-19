import { describe, expect, it } from "vitest";
import { extractVideoId, popoutChatUrl } from "@/lib/youtube-url";

const ID = "dQw4w9WgXcQ";

describe("extractVideoId", () => {
  it.each([
    `https://www.youtube.com/watch?v=${ID}`,
    `youtube.com/watch?v=${ID}`,
    `https://m.youtube.com/watch?v=${ID}&t=30s`,
    `https://youtu.be/${ID}`,
    `https://youtu.be/${ID}?si=abc`,
    `https://www.youtube.com/live/${ID}`,
    `https://www.youtube.com/live/${ID}?feature=share`,
    `https://www.youtube.com/embed/${ID}`,
    `https://studio.youtube.com/video/${ID}/livestreaming`,
    `https://www.youtube.com/live_chat?is_popout=1&v=${ID}`,
    `  https://www.youtube.com/watch?v=${ID}  `,
  ])("mengambil ID dari %s", (input) => expect(extractVideoId(input)).toBe(ID));

  it.each([
    "",
    "   ",
    "halo dunia",
    "https://example.com/watch?v=" + ID,
    "https://www.youtube.com/",
    "https://www.youtube.com/watch?v=pendek",
    "https://youtu.be/",
    "https://www.youtube.com/@channel",
    "javascript:alert(1)",
  ])("menolak %j", (input) => expect(extractVideoId(input)).toBeNull());
});

describe("popoutChatUrl", () => {
  it("membentuk link chat popout", () => {
    expect(popoutChatUrl(ID)).toBe(`https://www.youtube.com/live_chat?is_popout=1&v=${ID}`);
  });
});
