import type { Design, RoleOverride, Surface } from "@/lib/design/model";
import { designFromTemplate } from "@/lib/design/templates";

/**
 * Desain contoh untuk halaman utama: template Sticker ditambah bubble khusus untuk tiap peran.
 * Semua yang tampil di preview halaman utama dibuat lewat model dan generator CSS yang sama dengan editor,
 * jadi yang dilihat pengunjung memang hasil yang bisa mereka buat sendiri.
 */
function role(base: Surface, fill: string, border: string, shadow: string): RoleOverride {
  return {
    surface: { ...base, fill: { ...base.fill, mode: "solid", color: fill, opacity: 100 }, borderColor: border, shadowColor: shadow, decorations: [] },
    textColor: null,
  };
}

export function demoDesign(): Design {
  const d = designFromTemplate("sticker-pop", "Contoh peran");
  const { show, roleTint, ...surface } = d.bubble;
  void show;
  void roleTint;
  d.nameStyle.colors.verified = "#6A43C9";
  d.roleBubbles = {
    member: role(surface, "#EFFFF7", "#4CC795", "#FFB3D1"),
    verified: role(surface, "#F4F0FF", "#A58BFF", "#8FE3C7"),
    moderator: role(surface, "#EEF5FF", "#6FA2F2", "#FFD27A"),
    owner: role(surface, "#FFF4E3", "#F2A33A", "#FF9EC4"),
  };
  return d;
}
