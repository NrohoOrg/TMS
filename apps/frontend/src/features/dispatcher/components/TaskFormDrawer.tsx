"use client";

import { useEffect, useState } from "react";
import {
  useCreateCadreTask,
  useCreateTask,
  useUpdateCadreTask,
  useUpdateTask,
} from "@/features/shared/hooks";
import { useGeocode } from "@/features/shared/hooks/useGeocode";
import { geocodeResolve } from "@/lib/api-services";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { MapView, type MapMarker } from "@/components/map";
import type { Task } from "@/types/api";
import { Loader2, MapPin } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  initialPriority?: "normal" | "urgent";
  /** When provided, hides the Date input and forces this date for new tasks. */
  lockedDate?: string;
  /** When provided, hides the Priority select and forces this value. */
  lockedPriority?: "normal" | "urgent";
  /** Called after the new task is created. Awaited before the drawer closes
   *  so callers can run follow-up work (e.g. re-optimization) and show the
   *  resulting state without the drawer disappearing too early. */
  onCreated?: (task: Task) => void | Promise<void>;
  /** Switches the mutations to the Cadre endpoints (submitted for approval). */
  mode?: "dispatcher" | "cadre";
}

interface FormState {
  title: string;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropoffAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  pickupTime: string;
  priority: "normal" | "urgent";
  date: string;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function isoAt(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString();
}

function timeFromIso(iso: string | undefined): string {
  if (!iso) return "08:00";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function dateFromIso(iso: string | undefined): string {
  if (!iso) return todayStr();
  return new Date(iso).toISOString().slice(0, 10);
}

function defaultForm(task?: Task | null, initialPriority?: FormState["priority"]): FormState {
  if (!task) {
    return {
      title: "",
      pickupAddress: "",
      pickupLat: 0,
      pickupLng: 0,
      dropoffAddress: "",
      dropoffLat: 0,
      dropoffLng: 0,
      pickupTime: "08:00",
      priority: initialPriority ?? "normal",
      date: todayStr(),
    };
  }
  return {
    title: task.title,
    pickupAddress: task.pickupAddress,
    pickupLat: task.pickupLat,
    pickupLng: task.pickupLng,
    dropoffAddress: task.dropoffAddress,
    dropoffLat: task.dropoffLat,
    dropoffLng: task.dropoffLng,
    pickupTime: timeFromIso(task.pickupWindowStart),
    priority: task.priority,
    date: dateFromIso(task.pickupWindowStart),
  };
}

export function TaskFormDrawer({
  open,
  onOpenChange,
  task,
  initialPriority,
  lockedDate,
  lockedPriority,
  onCreated,
  mode = "dispatcher",
}: Props) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [form, setForm] = useState<FormState>(() => {
    const f = defaultForm(task, lockedPriority ?? initialPriority);
    if (lockedDate) f.date = lockedDate;
    if (lockedPriority) f.priority = lockedPriority;
    return f;
  });
  const [pickupQuery, setPickupQuery] = useState("");
  const [dropoffQuery, setDropoffQuery] = useState("");

  useEffect(() => {
    if (open) {
      const f = defaultForm(task, lockedPriority ?? initialPriority);
      if (lockedDate) f.date = lockedDate;
      if (lockedPriority) f.priority = lockedPriority;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(f);
    }
  }, [open, task, initialPriority, lockedDate, lockedPriority]);

  const pickupGeocode = useGeocode(pickupQuery, { minLength: 3, enabled: open });
  const dropoffGeocode = useGeocode(dropoffQuery, { minLength: 3, enabled: open });

  const createDispatcherMutation = useCreateTask();
  const updateDispatcherMutation = useUpdateTask();
  const createCadreMutation = useCreateCadreTask();
  const updateCadreMutation = useUpdateCadreTask();
  const createMutation = mode === "cadre" ? createCadreMutation : createDispatcherMutation;
  const updateMutation = mode === "cadre" ? updateCadreMutation : updateDispatcherMutation;
  const submitting = createMutation.isPending || updateMutation.isPending;
  const [resolvingPlace, setResolvingPlace] = useState<"pickup" | "dropoff" | null>(null);

  // When the active geocoder doesn't include lat/lng in suggestions
  // (e.g. Google Places Autocomplete), resolve the placeId on selection.
  async function resolveCoords(
    placeId: string,
    fallbackLat: number,
    fallbackLng: number,
  ): Promise<{ lat: number; lng: number } | null> {
    if (fallbackLat !== 0 || fallbackLng !== 0) {
      return { lat: fallbackLat, lng: fallbackLng };
    }
    try {
      const resolved = await geocodeResolve(placeId);
      return resolved;
    } catch {
      return null;
    }
  }

  async function selectPickup(suggestion: { placeId: string; displayName: string; lat: number; lng: number }) {
    setForm((f) => ({ ...f, pickupAddress: suggestion.displayName }));
    setPickupQuery("");
    setResolvingPlace("pickup");
    const coords = await resolveCoords(suggestion.placeId, suggestion.lat, suggestion.lng);
    setResolvingPlace(null);
    if (!coords) {
      toast({
        title: t("taskForm.geocodeFailed"),
        description: t("common.unknownError"),
        variant: "destructive",
      });
      return;
    }
    setForm((f) => ({ ...f, pickupLat: coords.lat, pickupLng: coords.lng }));
  }

  async function selectDropoff(suggestion: { placeId: string; displayName: string; lat: number; lng: number }) {
    setForm((f) => ({ ...f, dropoffAddress: suggestion.displayName }));
    setDropoffQuery("");
    setResolvingPlace("dropoff");
    const coords = await resolveCoords(suggestion.placeId, suggestion.lat, suggestion.lng);
    setResolvingPlace(null);
    if (!coords) {
      toast({
        title: t("taskForm.geocodeFailed"),
        description: t("common.unknownError"),
        variant: "destructive",
      });
      return;
    }
    setForm((f) => ({ ...f, dropoffLat: coords.lat, dropoffLng: coords.lng }));
  }

  const markers: MapMarker[] = [];
  if (form.pickupLat && form.pickupLng) {
    markers.push({
      id: "pickup",
      position: [form.pickupLat, form.pickupLng],
      kind: "pickup",
      label: "P",
      popup: form.pickupAddress,
    });
  }
  if (form.dropoffLat && form.dropoffLng) {
    markers.push({
      id: "dropoff",
      position: [form.dropoffLat, form.dropoffLng],
      kind: "dropoff",
      label: "D",
      popup: form.dropoffAddress,
    });
  }

  async function handleSave() {
    if (!form.pickupAddress || !form.dropoffAddress) {
      toast({ title: t("common.missingFields"), description: `${t("taskForm.missingPickup")} / ${t("taskForm.missingDropoff")}`, variant: "destructive" });
      return;
    }
    if (!form.pickupLat || !form.dropoffLat) {
      toast({ title: t("taskForm.geocodeFailed"), description: t("taskForm.selectOnMap"), variant: "destructive" });
      return;
    }

    const payload: Partial<Task> = {
      title: form.title || `${form.pickupAddress} → ${form.dropoffAddress}`,
      pickupAddress: form.pickupAddress,
      pickupLat: form.pickupLat,
      pickupLng: form.pickupLng,
      pickupWindowStart: isoAt(form.date, form.pickupTime),
      dropoffAddress: form.dropoffAddress,
      dropoffLat: form.dropoffLat,
      dropoffLng: form.dropoffLng,
      priority: form.priority,
    };

    try {
      if (task) {
        await updateMutation.mutateAsync({ id: task.id, data: payload });
        toast({ title: t("dispatcher.tasks.taskUpdated") });
      } else {
        const created = await createMutation.mutateAsync(payload);
        toast({ title: t("dispatcher.tasks.taskCreated") });
        if (onCreated) await onCreated(created);
      }
      onOpenChange(false);
    } catch (err) {
      toast({
        title: t("taskForm.saveFailed"),
        description: err instanceof Error ? err.message : t("common.unknownError"),
        variant: "destructive",
      });
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{task ? t("taskForm.editTask") : t("taskForm.newTask")}</SheetTitle>
        </SheetHeader>
        <SheetBody>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("taskForm.title")}</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder={t("taskForm.titlePlaceholder")}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("taskForm.pickupAddress")}</Label>
                <Input
                  value={form.pickupAddress}
                  onChange={(e) => {
                    setForm({ ...form, pickupAddress: e.target.value });
                    setPickupQuery(e.target.value);
                  }}
                  placeholder={t("taskForm.addressPlaceholder")}
                  autoComplete="off"
                />
                {pickupGeocode.data && pickupGeocode.data.length > 0 && pickupQuery === form.pickupAddress && (
                  <div className="border border-border rounded-md max-h-40 overflow-y-auto bg-popover shadow-md text-xs">
                    {pickupGeocode.data.map((r) => (
                      <button
                        key={r.placeId}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-accent flex items-start gap-2"
                        onClick={() => selectPickup(r)}
                      >
                        <MapPin className="h-3 w-3 mt-0.5 text-muted-foreground" />
                        <span>{r.displayName}</span>
                      </button>
                    ))}
                  </div>
                )}
                {resolvingPlace === "pickup" && (
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> {t("taskForm.geocoding")}
                  </p>
                )}
                {form.pickupLat !== 0 && resolvingPlace !== "pickup" && (
                  <p className="text-[10px] text-muted-foreground font-mono">
                    {form.pickupLat.toFixed(5)}, {form.pickupLng.toFixed(5)}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>{t("taskForm.dropoffAddress")}</Label>
                <Input
                  value={form.dropoffAddress}
                  onChange={(e) => {
                    setForm({ ...form, dropoffAddress: e.target.value });
                    setDropoffQuery(e.target.value);
                  }}
                  placeholder={t("taskForm.addressPlaceholder")}
                  autoComplete="off"
                />
                {dropoffGeocode.data && dropoffGeocode.data.length > 0 && dropoffQuery === form.dropoffAddress && (
                  <div className="border border-border rounded-md max-h-40 overflow-y-auto bg-popover shadow-md text-xs">
                    {dropoffGeocode.data.map((r) => (
                      <button
                        key={r.placeId}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-accent flex items-start gap-2"
                        onClick={() => selectDropoff(r)}
                      >
                        <MapPin className="h-3 w-3 mt-0.5 text-muted-foreground" />
                        <span>{r.displayName}</span>
                      </button>
                    ))}
                  </div>
                )}
                {resolvingPlace === "dropoff" && (
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> {t("taskForm.geocoding")}
                  </p>
                )}
                {form.dropoffLat !== 0 && resolvingPlace !== "dropoff" && (
                  <p className="text-[10px] text-muted-foreground font-mono">
                    {form.dropoffLat.toFixed(5)}, {form.dropoffLng.toFixed(5)}
                  </p>
                )}
              </div>
            </div>

            {markers.length > 0 && (
              <MapView markers={markers} height={220} fitBoundsKey={`${form.pickupLat}-${form.dropoffLat}`} />
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {!lockedDate && (
                <div className="space-y-2 md:col-span-2">
                  <Label>{t("common.date")}</Label>
                  <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
              )}
              {!lockedPriority && (
              <div className="space-y-2">
                <Label>{t("taskForm.priority")}</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm({ ...form, priority: v as FormState["priority"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["normal", "urgent"] as const).map((p) => (
                      <SelectItem key={p} value={p} className="capitalize">
                        {t(`priority.${p}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-pickup-time">{t("common.time")}</Label>
              <Input
                id="task-pickup-time"
                type="time"
                value={form.pickupTime}
                onChange={(e) => setForm({ ...form, pickupTime: e.target.value })}
                className="cursor-pointer"
              />
              <Label
                htmlFor="task-pickup-time"
                className="text-[11px] font-normal text-muted-foreground cursor-pointer"
              >
                {t("taskForm.pickupWindow")}
              </Label>
            </div>
          </div>
        </SheetBody>
        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
            {task ? t("taskForm.save") : t("taskForm.create")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
