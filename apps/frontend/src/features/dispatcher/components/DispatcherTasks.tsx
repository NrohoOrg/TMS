"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Search,
  Upload,
  MapPin,
  Clock,
  ArrowDown,
  ArrowUp,
  LayoutList,
  Grid3X3,
  Map,
} from "lucide-react";
import { MOCK_TASKS } from "@/lib/mock-data";

const PRIORITY_STYLES: Record<string, string> = {
  urgent: "bg-tms-error text-destructive-foreground",
  high: "bg-tms-warning text-accent-foreground",
  normal: "bg-muted text-muted-foreground",
  low: "bg-muted/50 text-muted-foreground",
};

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  planned: "bg-tms-info-light text-tms-info-dark",
  assigned: "bg-tms-success-light text-primary",
  in_progress: "bg-tms-warning-light text-tms-warning-dark",
  completed: "bg-tms-success-light text-tms-success-dark",
  cancelled: "bg-tms-error-light text-tms-error-dark",
};

export default function DispatcherTasks() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "card" | "map">("table");

  const filtered = MOCK_TASKS.filter((t) => {
    const ms =
      t.id.toLowerCase().includes(search.toLowerCase()) ||
      t.pickup.toLowerCase().includes(search.toLowerCase()) ||
      t.dropoff.toLowerCase().includes(search.toLowerCase()) ||
      t.contact.toLowerCase().includes(search.toLowerCase());
    const mst = statusFilter === "all" || t.status === statusFilter;
    const mp = priorityFilter === "all" || t.priority === priorityFilter;
    return ms && mst && mp;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Task Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {MOCK_TASKS.length} tasks today •{" "}
            {MOCK_TASKS.filter((t) => t.status === "draft").length} drafts
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-2" /> Bulk Import
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" /> Create Task
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-display">
                  Create New Task
                </DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setDialogOpen(false);
                }}
                className="space-y-4 mt-2 max-h-[60vh] overflow-y-auto pr-2"
              >
                <div className="space-y-2">
                  <Label>Task Type</Label>
                  <Select defaultValue="person">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="person">Person Transport</SelectItem>
                      <SelectItem value="delivery">Item Delivery</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Pickup Address</Label>
                    <Input placeholder="Enter pickup location" />
                  </div>
                  <div className="space-y-2">
                    <Label>Dropoff Address</Label>
                    <Input placeholder="Enter dropoff location" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>Pickup Earliest</Label>
                    <Input type="time" defaultValue="08:00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Pickup Latest</Label>
                    <Input type="time" defaultValue="09:00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Delivery Deadline</Label>
                    <Input type="time" defaultValue="12:00" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select defaultValue="normal">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["low", "normal", "high", "urgent"].map((p) => (
                          <SelectItem key={p} value={p} className="capitalize">
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Capacity Units</Label>
                    <Input type="number" defaultValue={1} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Contact Name</Label>
                    <Input placeholder="Contact name" />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Phone</Label>
                    <Input placeholder="+213 555 0000" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Instructions</Label>
                  <Textarea
                    placeholder="Special instructions for driver..."
                    rows={2}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Save Task</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {[
                    "draft",
                    "planned",
                    "assigned",
                    "in_progress",
                    "completed",
                    "cancelled",
                  ].map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-32 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  {["urgent", "high", "normal", "low"].map((p) => (
                    <SelectItem key={p} value={p} className="capitalize">
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-1 border border-border rounded-md p-0.5">
              {(
                [
                  ["table", LayoutList],
                  ["card", Grid3X3],
                  ["map", Map],
                ] as const
              ).map(([mode, Icon]) => (
                <Button
                  key={mode}
                  variant={viewMode === mode ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setViewMode(mode as "table" | "card" | "map")}
                >
                  <Icon className="w-3.5 h-3.5" />
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {viewMode === "table" ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Time Window</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Driver</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => (
                  <TableRow
                    key={t.id}
                    className={
                      t.priority === "urgent" ? "bg-tms-error-light/30" : ""
                    }
                  >
                    <TableCell className="font-mono text-sm font-medium">
                      {t.id}
                    </TableCell>
                    <TableCell className="text-sm capitalize">
                      {t.type === "person" ? "👤 Person" : "📦 Delivery"}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5 text-xs">
                        <div className="flex items-center gap-1">
                          <ArrowUp className="w-3 h-3 text-tms-success" />
                          {t.pickup}
                        </div>
                        <div className="flex items-center gap-1">
                          <ArrowDown className="w-3 h-3 text-tms-error" />
                          {t.dropoff}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs space-y-0.5">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          {t.pickupWindow}
                        </div>
                        <div className="text-muted-foreground">
                          Deadline: {t.deadline}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`text-[10px] ${PRIORITY_STYLES[t.priority]}`}
                      >
                        {t.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`text-[10px] ${STATUS_STYLES[t.status]}`}
                      >
                        {t.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {t.driver || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : viewMode === "card" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {filtered.map((t) => (
                <Card
                  key={t.id}
                  className={`cursor-pointer hover:shadow-md transition-shadow ${
                    t.priority === "urgent" ? "border-tms-error/40" : ""
                  }`}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-medium">
                        {t.id}
                      </span>
                      <Badge
                        className={`text-[10px] ${PRIORITY_STYLES[t.priority]}`}
                      >
                        {t.priority}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-1">
                        <ArrowUp className="w-3 h-3 text-tms-success" />
                        {t.pickup}
                      </div>
                      <div className="flex items-center gap-1">
                        <ArrowDown className="w-3 h-3 text-tms-error" />
                        {t.dropoff}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <Badge
                        className={`text-[10px] ${STATUS_STYLES[t.status]}`}
                      >
                        {t.status.replace("_", " ")}
                      </Badge>
                      <span className="text-muted-foreground">{t.contact}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <MapPin className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">
                Map view — Requires geocoding integration
              </p>
              <p className="text-xs mt-1">
                Tasks will be plotted on an interactive map when geocoding is
                enabled
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
