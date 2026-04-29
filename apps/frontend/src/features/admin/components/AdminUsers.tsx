"use client";

import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Loader2, Plus, Search, Trash2, Users } from "lucide-react";
import {
  useAdminUsers,
  useCreateAdminUser,
  useDeleteAdminUser,
  useUpdateAdminUser,
} from "@/features/shared/hooks";
import type { Role } from "@/types/api";

export default function AdminUsers() {
  const { toast } = useToast();
  const { t: tFn } = useTranslation();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    email: "",
    name: "",
    phone: "",
    password: "",
    role: "DISPATCHER" as "ADMIN" | "DISPATCHER" | "CADRE",
  });

  const usersQuery = useAdminUsers();
  const createMut = useCreateAdminUser();
  const updateMut = useUpdateAdminUser();
  const deleteMut = useDeleteAdminUser();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return usersQuery.data ?? [];
    return (usersQuery.data ?? []).filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        (u.name ?? "").toLowerCase().includes(q),
    );
  }, [usersQuery.data, search]);

  async function handleCreate() {
    if (!form.email || !form.password) {
      toast({
        title: tFn("common.missingFields"),
        description: tFn("admin.users.emailRequired"),
        variant: "destructive",
      });
      return;
    }
    try {
      await createMut.mutateAsync({
        email: form.email,
        password: form.password,
        name: form.name || undefined,
        phone: form.phone || undefined,
        role: form.role,
      });
      toast({ title: tFn("admin.users.userCreated") });
      setCreateOpen(false);
      setForm({ email: "", name: "", phone: "", password: "", role: "DISPATCHER" });
    } catch (err) {
      toast({
        title: tFn("common.createFailed"),
        description: err instanceof Error ? err.message : tFn("common.unknownError"),
        variant: "destructive",
      });
    }
  }

  async function handleRoleChange(id: string, role: Role) {
    if (role === "DRIVER") return;
    try {
      await updateMut.mutateAsync({ id, data: { role } });
      toast({ title: tFn("admin.users.roleUpdated") });
    } catch (err) {
      toast({
        title: tFn("common.updateFailed"),
        description: err instanceof Error ? err.message : tFn("common.unknownError"),
        variant: "destructive",
      });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(tFn("admin.users.confirmDelete"))) return;
    try {
      await deleteMut.mutateAsync(id);
      toast({ title: tFn("admin.users.userDeleted") });
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
        title={tFn("admin.users.title")}
        subtitle={tFn("admin.users.subtitle")}
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 me-1" /> {tFn("admin.users.newUser")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{tFn("admin.users.createUser")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>{tFn("admin.users.emailRequiredLabel")}</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>{tFn("common.name")}</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{tFn("common.phone")}</Label>
                    <Input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>{tFn("admin.users.passwordRequired")}</Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{tFn("admin.users.selectRole")}</Label>
                  <Select
                    value={form.role}
                    onValueChange={(v) => setForm({ ...form, role: v as "ADMIN" | "DISPATCHER" | "CADRE" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">{tFn("roles.admin")}</SelectItem>
                      <SelectItem value="DISPATCHER">{tFn("roles.dispatcher")}</SelectItem>
                      <SelectItem value="CADRE">{tFn("roles.cadre")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>
                  {tFn("common.cancel")}
                </Button>
                <Button onClick={handleCreate} disabled={createMut.isPending}>
                  {createMut.isPending && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                  {tFn("common.create")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <Card>
        <CardHeader className="pb-2">
          <div className="relative max-w-sm">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={tFn("admin.users.searchPlaceholder")}
              className="ps-9 h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {usersQuery.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : usersQuery.isError ? (
            <ErrorState
              message={usersQuery.error instanceof Error ? usersQuery.error.message : tFn("common.unknownError")}
              onRetry={() => usersQuery.refetch()}
            />
          ) : filtered.length === 0 ? (
            <EmptyState icon={Users} title={tFn("admin.users.noUsers")} description={tFn("admin.users.createFirst")} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tFn("admin.users.tableEmail")}</TableHead>
                  <TableHead>{tFn("admin.users.tableName")}</TableHead>
                  <TableHead>{tFn("admin.users.tableRole")}</TableHead>
                  <TableHead>{tFn("common.lastUpdated")}</TableHead>
                  <TableHead className="w-16">{tFn("admin.users.tableActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="text-sm">{u.email}</TableCell>
                    <TableCell className="text-sm">{u.name ?? "—"}</TableCell>
                    <TableCell>
                      <Select
                        value={u.role}
                        onValueChange={(v) => handleRoleChange(u.id, v as Role)}
                      >
                        <SelectTrigger className="h-7 w-32 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADMIN">{tFn("roles.admin")}</SelectItem>
                          <SelectItem value="DISPATCHER">{tFn("roles.dispatcher")}</SelectItem>
                          <SelectItem value="CADRE">{tFn("roles.cadre")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-tms-error"
                        onClick={() => handleDelete(u.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {(updateMut.isPending || deleteMut.isPending) && (
        <Badge variant="outline" className="text-xs">
          <Loader2 className="w-3 h-3 me-1 animate-spin" /> {tFn("common.loading")}
        </Badge>
      )}
    </div>
  );
}
