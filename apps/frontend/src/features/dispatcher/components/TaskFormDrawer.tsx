"use client";

import { useEffect, useState } from "react";
import { useCreateTask, useUpdateTask } from "@/features/shared/hooks";
import { useGeocode } from "@/features/shared/hooks/useGeocode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { MapView, type MapMarker } from "@/components/map";
import type { Task } from "@/types/api";
import { Loader2, MapPin } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
}

interface FormState {
  title: string;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropoffAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  pickupEarliest: string;
  pickupLatest: string;
  deadline: string;
  priority: "low" | "normal" | "high" | "urgent";
  pickupServiceMinutes: number;
  dropoffServiceMinutes: number;
  notes: string;
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

function defaultForm(task?: Task | null): FormState {
  if (!task) {
    return {
      title: "",
      pickupAddress: "",
      pickupLat: 0,
      pickupLng: 0,
      dropoffAddress: "",
      dropoffLat: 0,
      dropoffLng: 0,
      pickupEarliest: "08:00",
      pickupLatest: "12:00",
      deadline: "17:00",
      priority: "normal",
      pickupServiceMinutes: 10,
      dropoffServiceMinutes: 10,
      notes: "",
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
    pickupEarliest: timeFromIso(task.pickupWindowStart),
    pickupLatest: timeFromIso(task.pickupWindowEnd),
    deadline: timeFromIso(task.dropoffDeadline),
    priority: task.priority,
    pickupServiceMinutes: task.pickupServiceMinutes,
    dropoffServiceMinutes: task.dropoffServiceMinutes,
    notes: task.notes ?? "",
    date: dateFromIso(task.pickupWindowStart),
  };
}

export function TaskFormDrawer({ open, onOpenChange, task }: Props) {
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(() => defaultForm(task));
  const [pickupQuery, setPickupQuery] = useState("");
  const [dropoffQuery, setDropoffQuery] = useState("");

  useEffect(() => {
    if (open)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(defaultForm(task));
  }, [open, task]);

  const pickupGeocode = useGeocode(pickupQuery, { minLength: 3, enabled: open });
  const dropoffGeocode = useGeocode(dropoffQuery, { minLength: 3, enabled: open });

  const createMutation = useCreateTask();
  const updateMutation = useUpdateTask();
  const submitting = createMutation.isPending || updateMutation.isPending;

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
      toast({ title: "Missing addresses", description: "Pickup and dropoff are required.", variant: "destructive" });
      return;
    }
    if (!form.pickupLat || !form.dropoffLat) {
      toast({ title: "Geocoded coordinates required", description: "Pick a suggestion from the address dropdown.", variant: "destructive" });
      return;
    }

    const payload: Partial<Task> = {
      title: form.title || `${form.pickupAddress} → ${form.dropoffAddress}`,
      pickupAddress: form.pickupAddress,
      pickupLat: form.pickupLat,
      pickupLng: form.pickupLng,
      pickupWindowStart: isoAt(form.date, form.pickupEarliest),
      pickupWindowEnd: isoAt(form.date, form.pickupLatest),
      pickupServiceMinutes: form.pickupServiceMinutes,
      dropoffAddress: form.dropoffAddress,
      dropoffLat: form.dropoffLat,
      dropoffLng: form.dropoffLng,
      dropoffDeadline: isoAt(form.date, form.deadline),
      dropoffServiceMinutes: form.dropoffServiceMinutes,
      priority: form.priority,
      notes: form.notes || undefined,
    };

    try {
      if (task) {
        await updateMutation.mutateAsync({ id: task.id, data: payload });
        toast({ title: "Task updated" });
      } else {
        await createMutation.mutateAsync(payload);
        toast({ title: "Task created" });
      }
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{task ? "Edit Task" : "Create Task"}</SheetTitle>
        </SheetHeader>
        <SheetBody>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Optional descriptive title"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Pickup Address</Label>
                <Input
                  value={form.pickupAddress}
                  onChange={(e) => {
                    setForm({ ...form, pickupAddress: e.target.value });
                    setPickupQuery(e.target.value);
                  }}
                  placeholder="Search for a pickup address"
                  autoComplete="off"
                />
                {pickupGeocode.data && pickupGeocode.data.length > 0 && pickupQuery === form.pickupAddress && (
                  <div className="border border-border rounded-md max-h-40 overflow-y-auto bg-popover shadow-md text-xs">
                    {pickupGeocode.data.map((r) => (
                      <button
                        key={r.placeId}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-accent flex items-start gap-2"
                        onClick={() => {
                          setForm((f) => ({
                            ...f,
                            pickupAddress: r.displayName,
                            pickupLat: r.lat,
                            pickupLng: r.lng,
                          }));
                          setPickupQuery("");
                        }}
                      >
                        <MapPin className="h-3 w-3 mt-0.5 text-muted-foreground" />
                        <span>{r.displayName}</span>
                      </button>
                    ))}
                  </div>
                )}
                {form.pickupLat !== 0 && (
                  <p className="text-[10px] text-muted-foreground font-mono">
                    {form.pickupLat.toFixed(5)}, {form.pickupLng.toFixed(5)}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Dropoff Address</Label>
                <Input
                  value={form.dropoffAddress}
                  onChange={(e) => {
                    setForm({ ...form, dropoffAddress: e.target.value });
                    setDropoffQuery(e.target.value);
                  }}
                  placeholder="Search for a dropoff address"
                  autoComplete="off"
                />
                {dropoffGeocode.data && dropoffGeocode.data.length > 0 && dropoffQuery === form.dropoffAddress && (
                  <div className="border border-border rounded-md max-h-40 overflow-y-auto bg-popover shadow-md text-xs">
                    {dropoffGeocode.data.map((r) => (
                      <button
                        key={r.placeId}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-accent flex items-start gap-2"
                        onClick={() => {
                          setForm((f) => ({
                            ...f,
                            dropoffAddress: r.displayName,
                            dropoffLat: r.lat,
                            dropoffLng: r.lng,
                          }));
                          setDropoffQuery("");
                        }}
                      >
                        <MapPin className="h-3 w-3 mt-0.5 text-muted-foreground" />
                        <span>{r.displayName}</span>
                      </button>
                    ))}
                  </div>
                )}
                {form.dropoffLat !== 0 && (
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
              <div className="space-y-2 md:col-span-2">
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm({ ...form, priority: v as FormState["priority"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["low", "normal", "high", "urgent"] as const).map((p) => (
                      <SelectItem key={p} value={p} className="capitalize">
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Pickup Earliest</Label>
                <Input type="time" value={form.pickupEarliest} onChange={(e) => setForm({ ...form, pickupEarliest: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Pickup Latest</Label>
                <Input type="time" value={form.pickupLatest} onChange={(e) => setForm({ ...form, pickupLatest: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Dropoff Deadline</Label>
                <Input type="time" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Pickup Service (min)</Label>
                <Input
                  type="number"
                  value={form.pickupServiceMinutes}
                  onChange={(e) => setForm({ ...form, pickupServiceMinutes: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Dropoff Service (min)</Label>
                <Input
                  type="number"
                  value={form.dropoffServiceMinutes}
                  onChange={(e) => setForm({ ...form, dropoffServiceMinutes: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                placeholder="Special instructions for the driver..."
              />
            </div>
          </div>
        </SheetBody>
        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {task ? "Save Changes" : "Create Task"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
