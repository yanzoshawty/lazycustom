import type { Metadata } from "next";
import { Editor } from "@/components/Editor";

export const metadata: Metadata = {
  title: "Editor | Lazycustom Livechat",
};

export default function EditorPage() {
  return <Editor />;
}
