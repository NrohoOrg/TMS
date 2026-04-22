"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Pencil, Plus, Search, Trash2, UserCheck } from "lucide-react";
import {
  useCreateDriver,
  useDeleteDriver,
  useDrivers,
  useUpdateDriver,
} from "@/features/shared/hooks";
import type { Driver } from "@/types/api";

interface DriverForm {
  name: string;
  phone: string;
  shiftStart: string;
  shiftEnd: string;
  depotLat: number;
  depotLng: number;
  capacityUnits: number | null;
  active: boolean;
}

const EMPTY: DriverForm = {
  name: "",
  phone: "",
  shiftStart: "08:00",
  shiftEnd: "17:00",
  depotLat: 0,
  depotLng: 0,
  capacityUnits: null,
  active: true,
};

export default function AdminDrivers() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Driver | null>(null);
  const [form, setForm] = useState<DriverForm>(EMPTY);

  const driversQuery = useDrivers();
  const createMut = useCreateDriver();
  const updateMut = useUpdateDriver();
  const deleteMut = useDeleteDriver();

  const drivers = driversQuery.data ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return drivers;
    return drivers.filter(
      (d) => d.name.toLowerCase().includes(q) || d.phone.toLowerCase().includes(q),
    );
  }, [drivers, search]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  }

  function openEdit(d: Driver) {
    setEditing(d);
    setForm({
      name: d.name,
      phone: d.phone,
      shiftStart: d.shiftStart,
      shiftEnd: d.shiftEnd,
      depotLat: d.depotLat,
      depotLng: d.depotLng,
      capacityUnits: d.capacityUnits,
      active: d.active,
    });
    setOpen(true);
  }

  async function save() {
    if (!form.name || !form.phone) {
      toast({
        title: "Missing fields",
        description: "Name and phone are required.",
        variant: "destructive",
      });
      return;
    }
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, data: form });
        toast({ title: "Driver updated" });
      } else {
        await createMut.mutateAsync(form);
        toast({ title: "Driver created" });
      }
      setOpen(false);
    } catch (err) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Deactivate this driver?")) return;
    try {
      await deleteMut.mutateAsync(id);
      toast({ title: "Driver removed" });
    } catch (err) {
      toast({
        title: "Delete failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Drivers"
        subtitle="Fleet roster — shift hours, depot location, and active status."
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" /> Add driver
          </Button>
        }
      />

      <Card>
        <CardHeader className="pb-2">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search drivers…"
              className="pl-9 h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {driversQuery.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : driversQuery.isError ? (
            <ErrorState
              message={driversQuery.error instanceof Error ? driversQuery.error.message : "Failed to load drivers"}
              onRetry={() => driversQuery.refetch()}
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={UserCheck}
              title="No drivers"
              description="Add a driver to begin assigning routes."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Depot</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="text-sm font-medium">{d.name}</TableCell>
                    <TableCell className="text-sm">{d.phone}</TableCell>
                    <TableCell className="text-xs font-mono">
                      {d.shiftStart}–{d.shiftEnd}
                    </TableCell>
                    <TableCell className="text-[10px] font-mono text-muted-foreground">
                      {d.depotLat.toFixed(3)}, {d.depotLng.toFixed(3)}
                    </TableCell>
                    <TableCell className="text-xs">{d.capacityUnits ?? "—"}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          d.active
                            ? "bg-tms-success-light text-tms-success-dark"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {d.active ? "active" : "inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => openEdit(d)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-tms-error"
                          onClick={() => handleDelete(d.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit driver" : "New driver"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Shift Start</Label>
                <Input
                  type="time"
                  value={form.shiftStart}
                  onChange={(e) => setForm({ ...form, shiftStart: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Shift End</Label>
                <Input
                  type="time"
                  value={form.shiftEnd}
                  onChange={(e) => setForm({ ...form, shiftEnd: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Depot Lat</Label>
                <Input
                  type="number"
                  step="0.000001"
                  value={form.depotLat}
                  onChange={(e) => setForm({ ...form, depotLat: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <Label>Depot Lng</Label>
                <Input
                  type="number"
                  step="0.000001"
                  value={form.depotLng}
                  onChange={(e) => setForm({ ...form, depotLng: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Capacity (units)</Label>
              <Input
                type="number"
                value={form.capacityUnits ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    capacityUnits: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={form.active}
                onCheckedChange={(checked) => setForm({ ...form, active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={createMut.isPending || updateMut.isPending}>
              {(createMut.isPending || updateMut.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {editing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
