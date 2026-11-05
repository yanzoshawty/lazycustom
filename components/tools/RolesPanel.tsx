"use client";

import { ROLE_IDS, type Design, type LayerId, type RoleId } from "@/lib/design/model";
import { Section } from "../controls";

const ROLE_LABEL: Record<RoleId, string> = { member: "Member", verified: "Verified", moderator: "Moderator", owner: "Owner" };
const ROLE_HINT: Record<RoleId, string> = {
  member: "Penonton yang berlangganan membership channel",
  verified: "Channel bercentang. Atributnya belum terkonfirmasi, cek di OBS",
  moderator: "Moderator chat dengan ikon kunci pas",
  owner: "Kamu sendiri, pemilik channel",
};
const CARDS: Array<{ layer: Extract<LayerId, "superchat" | "membership" | "sticker">; key: "superChat" | "membership" | "sticker"; label: string; hint: string }> = [
  { layer: "superchat", key: "superChat", label: "Super Chat", hint: "Pesan berbayar dengan nominal" },
  { layer: "membership", key: "membership", label: "Membership", hint: "Pengumuman member baru" },
  { layer: "sticker", key: "sticker", label: "Sticker", hint: "Super Sticker berbayar" },
];

interface Props {
  design: Design;
  onOpenLayer: (layer: LayerId, role?: string | null) => void;
}

function Row({ title, hint, status, custom, onOpen }: { title: string; hint: string; status: string; custom: boolean; onOpen: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="bubble-tail-sm grid w-full gap-0.5 border border-line-strong bg-surface px-3 py-2.5 text-left transition hover:border-accent active:scale-[0.98]"
      >
        <span className="flex items-center justify-between gap-2">
          <span className="font-display text-sm font-semibold text-ink">{title}</span>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${custom ? "bg-accent text-on-accent" : "bg-surface-2 text-ink-2"}`}>{status}</span>
        </span>
        <span className="text-xs text-ink-2">{hint}</span>
      </button>
    </li>
  );
}

/**
 * Peta semua jenis pesan: satu desain global (Default) dan bubble khusus per peran atau kartu.
 * Membuka satu baris memilih layer dan tab perannya, lalu pengaturannya tampil di Properties.
 */
export function RolesPanel({ design: d, onOpenLayer }: Props) {
  const custom = ROLE_IDS.filter((r) => d.roleBubbles[r] !== null).length;

  function openRole(role: RoleId | "default") {
    // Editor memetakan peran ke tab bubble yang sesuai; "viewer" berarti tab Default.
    onOpenLayer("bubble", role === "default" ? "viewer" : role);
  }

  return (
    <div className="grid gap-7">
      <p className="text-sm text-ink-2">
        Desain Default berlaku untuk semua pesan. Nyalakan bubble khusus untuk peran tertentu, sisanya tetap ikut Default. {custom > 0 ? `${custom} peran punya bubble sendiri.` : "Belum ada peran yang punya bubble sendiri."}
      </p>

      <Section title="Desain global">
        <ul className="grid gap-2">
          <Row title="Default" hint="Viewer dan semua peran yang belum custom" status="Global" custom={false} onOpen={() => openRole("default")} />
        </ul>
      </Section>

      <Section title="Bubble per peran">
        <ul className="grid gap-2">
          {ROLE_IDS.map((role) => (
            <Row
              key={role}
              title={ROLE_LABEL[role]}
              hint={ROLE_HINT[role]}
              custom={d.roleBubbles[role] !== null}
              status={d.roleBubbles[role] !== null ? "Custom" : "Ikut Default"}
              onOpen={() => openRole(role)}
            />
          ))}
        </ul>
      </Section>

      <Section title="Kartu berbayar">
        <ul className="grid gap-2">
          {CARDS.map((c) => (
            <Row key={c.layer} title={c.label} hint={c.hint} custom={false} status={d[c.key].colorMode === "tier" ? "Warna tier" : "Warna sendiri"} onOpen={() => onOpenLayer(c.layer)} />
          ))}
        </ul>
      </Section>
    </div>
  );
}
