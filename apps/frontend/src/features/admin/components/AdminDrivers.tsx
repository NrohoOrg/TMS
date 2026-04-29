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
import { useTranslation } from "react-i18next";
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
  const { t: tFn } = useTranslation();
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
        title: tFn("common.missingFields"),
        description: tFn("admin.drivers.missingNamePhone"),
        variant: "destructive",
      });
      return;
    }
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, data: form });
        toast({ title: tFn("admin.drivers.driverUpdated") });
      } else {
        await createMut.mutateAsync(form);
        toast({ title: tFn("admin.drivers.driverCreated") });
      }
      setOpen(false);
    } catch (err) {
      toast({
        title: tFn("common.saveFailed"),
        description: err instanceof Error ? err.message : tFn("common.unknownError"),
        variant: "destructive",
      });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(tFn("admin.drivers.confirmDeactivate"))) return;
    try {
      await deleteMut.mutateAsync(id);
      toast({ title: tFn("admin.drivers.driverRemoved") });
    } catch (err) {
      toast({
        title: tFn("common.deleteFailed"),
        description: err instanceof Error ? err.message : tFn("common.unknownError"),
        variant: "destructive",
      });
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <PageHeader
        title={tFn("admin.drivers.title")}
        subtitle={tFn("admin.drivers.subtitle")}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 me-1" /> {tFn("admin.drivers.addDriver")}
          </Button>
        }
      />

      <Card>
        <CardHeader className="pb-2">
          <div className="relative max-w-sm">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={tFn("admin.drivers.searchPlaceholder")}
              className="ps-9 h-9"
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
              message={driversQuery.error instanceof Error ? driversQuery.error.message : tFn("common.unknownError")}
              onRetry={() => driversQuery.refetch()}
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={UserCheck}
              title={tFn("admin.drivers.noDrivers")}
              description={tFn("admin.drivers.noDriversHint")}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tFn("admin.drivers.tableName")}</TableHead>
                  <TableHead>{tFn("admin.drivers.tablePhone")}</TableHead>
                  <TableHead>{tFn("admin.drivers.tableShift")}</TableHead>
                  <TableHead>{tFn("admin.drivers.tableDepot")}</TableHead>
                  <TableHead>{tFn("admin.drivers.tableCapacity")}</TableHead>
                  <TableHead>{tFn("admin.drivers.tableStatus")}</TableHead>
                  <TableHead className="w-24">{tFn("admin.drivers.tableActions")}</TableHead>
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
                        {d.active ? tFn("common.active") : tFn("common.inactive")}
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
            <DialogTitle>{editing ? tFn("admin.drivers.editDriver") : tFn("admin.drivers.newDriver")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{tFn("common.name")}</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>{tFn("common.phone")}</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{tFn("admin.drivers.shiftStart")}</Label>
                <Input
                  type="time"
                  value={form.shiftStart}
                  onChange={(e) => setForm({ ...form, shiftStart: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>{tFn("admin.drivers.shiftEnd")}</Label>
                <Input
                  type="time"
                  value={form.shiftEnd}
                  onChange={(e) => setForm({ ...form, shiftEnd: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{tFn("admin.drivers.depotLat")}</Label>
                <Input
                  type="number"
                  step="0.000001"
                  value={form.depotLat}
                  onChange={(e) => setForm({ ...form, depotLat: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <Label>{tFn("admin.drivers.depotLng")}</Label>
                <Input
                  type="number"
                  step="0.000001"
                  value={form.depotLng}
                  onChange={(e) => setForm({ ...form, depotLng: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>{tFn("admin.drivers.capacityUnits")}</Label>
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
              <Label>{tFn("admin.drivers.active")}</Label>
              <Switch
                checked={form.active}
                onCheckedChange={(checked) => setForm({ ...form, active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {tFn("common.cancel")}
            </Button>
            <Button onClick={save} disabled={createMut.isPending || updateMut.isPending}>
              {(createMut.isPending || updateMut.isPending) && (
                <Loader2 className="w-4 h-4 me-2 animate-spin" />
              )}
              {editing ? tFn("common.save") : tFn("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
