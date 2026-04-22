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
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    email: "",
    name: "",
    phone: "",
    password: "",
    role: "DISPATCHER" as "ADMIN" | "DISPATCHER",
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
        title: "Missing fields",
        description: "Email and password are required.",
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
      toast({ title: "User created" });
      setCreateOpen(false);
      setForm({ email: "", name: "", phone: "", password: "", role: "DISPATCHER" });
    } catch (err) {
      toast({
        title: "Create failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  }

  async function handleRoleChange(id: string, role: Role) {
    if (role === "DRIVER") return;
    try {
      await updateMut.mutateAsync({ id, data: { role } });
      toast({ title: "Role updated" });
    } catch (err) {
      toast({
        title: "Update failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Permanently delete this user?")) return;
    try {
      await deleteMut.mutateAsync(id);
      toast({ title: "User deleted" });
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
        title="Users"
        subtitle="Admin & dispatcher accounts."
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1" /> New user
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create user</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Name</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Phone</Label>
                    <Input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Password *</Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Role</Label>
                  <Select
                    value={form.role}
                    onValueChange={(v) => setForm({ ...form, role: v as "ADMIN" | "DISPATCHER" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="DISPATCHER">Dispatcher</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={createMut.isPending}>
                  {createMut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <Card>
        <CardHeader className="pb-2">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email…"
              className="pl-9 h-9"
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
              message={usersQuery.error instanceof Error ? usersQuery.error.message : "Failed to load users"}
              onRetry={() => usersQuery.refetch()}
            />
          ) : filtered.length === 0 ? (
            <EmptyState icon={Users} title="No users" description="Create the first user to get started." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Last login</TableHead>
                  <TableHead className="w-16">Actions</TableHead>
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
                          <SelectItem value="ADMIN">Admin</SelectItem>
                          <SelectItem value="DISPATCHER">Dispatcher</SelectItem>
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
          <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Saving…
        </Badge>
      )}
    </div>
  );
}
