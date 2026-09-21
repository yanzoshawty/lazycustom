"use client";

import { useState, type ReactNode } from "react";
import { ROLE_IDS, type Design, type RoleId, type Surface } from "@/lib/design/model";
import { ColorField, Segmented, ToggleField } from "./controls";
import type { Edit } from "./Inspector";
import { SurfaceEditor } from "./SurfaceEditor";

const ROLE_LABEL: Record<RoleId, string> = { member: "Member", moderator: "Moderator", owner: "Owner" };

interface Props {
  design: Design;
  edit: Edit;
  /** Isi untuk tab Default: editor bubble utama. */
  children: ReactNode;
}

/**
 * Tab untuk mengedit bubble utama atau bubble khusus tiap peran. Viewer selalu memakai bubble utama.
 * Membuat bubble khusus menyalin bubble utama sebagai titik awal, jadi tampilannya tidak melompat.
 */
export function RoleBubbleEditor({ design: d, edit, children }: Props) {
  const [tab, setTab] = useState<"default" | RoleId>("default");
  const override = tab === "default" ? null : d.roleBubbles[tab];

  const setOverride = (role: RoleId, fn: (o: NonNullable<Design["roleBubbles"][RoleId]>) => NonNullable<Design["roleBubbles"][RoleId]>, key: string) =>
    edit((x) => {
      const cur = x.roleBubbles[role];
      return cur ? { ...x, roleBubbles: { ...x.roleBubbles, [role]: fn(cur) } } : x;
    }, `role.${role}.${key}`);

  function enable(role: RoleId) {
    edit((x) => {
      const { show, roleTint, ...surface } = x.bubble;
      void show;
      void roleTint;
      return { ...x, roleBubbles: { ...x.roleBubbles, [role]: { surface: JSON.parse(JSON.stringify(surface)) as Surface, textColor: null } } };
    });
  }

  return (
    <div className="grid gap-6">
      <Segmented
        label="Edit bubble untuk"
        small
        value={tab}
        options={[{ value: "default" as const, label: "Default" }, ...ROLE_IDS.map((r) => ({ value: r, label: ROLE_LABEL[r] }))]}
        onChange={setTab}
      />
      {tab === "default" ? (
        children
      ) : (
        <div className="grid gap-6">
          <ToggleField
            label={`Custom bubble untuk ${ROLE_LABEL[tab]}`}
            hint="Nyalakan supaya bubble peran ini punya fill, border, bentuk, dan dekorasi sendiri. Viewer tetap memakai bubble Default."
            checked={override !== null}
            onChange={(on) => (on ? enable(tab) : edit((x) => ({ ...x, roleBubbles: { ...x.roleBubbles, [tab]: null } })))}
          />
          {override ? (
            <>
              <ToggleField
                label="Custom text color"
                checked={override.textColor !== null}
                onChange={(on) => setOverride(tab, (o) => ({ ...o, textColor: on ? "#FFFFFF" : null }), "textColorOn")}
              />
              {override.textColor !== null ? (
                <ColorField label="Text color" value={override.textColor} onChange={(textColor) => setOverride(tab, (o) => ({ ...o, textColor }), "textColor")} />
              ) : null}
              <SurfaceEditor surface={override.surface} onChange={(fn, key) => setOverride(tab, (o) => ({ ...o, surface: fn(o.surface) }), key)} />
            </>
          ) : (
            <p className="rounded-field bg-surface-2 px-3 py-2 text-sm text-ink-2">
              {ROLE_LABEL[tab]} saat ini memakai bubble Default{d.bubble.roleTint ? " dengan semburat warna peran" : ""}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
