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
import { Plus, Search, Truck, Car, Bus } from "lucide-react";
import { MOCK_VEHICLES } from "@/lib/mock-data";

const TYPE_ICON: Record<string, React.ElementType> = {
  Van: Truck,
  Truck: Truck,
  Car: Car,
  Bus: Bus,
  Motorcycle: Car,
};
const STATUS_VARIANT: Record<string, "secondary" | "destructive" | "outline"> =
  { active: "secondary", maintenance: "destructive", retired: "outline" };

export default function AdminFleet() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = MOCK_VEHICLES.filter(
    (v) =>
      v.plate.toLowerCase().includes(search.toLowerCase()) ||
      v.make.toLowerCase().includes(search.toLowerCase()) ||
      v.model.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Fleet Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {MOCK_VEHICLES.filter((v) => v.status === "active").length} active
            vehicles
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" /> Add Vehicle
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">
                Register Vehicle
              </DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setDialogOpen(false);
              }}
              className="space-y-4 mt-2"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>License Plate</Label>
                  <Input name="plate" required placeholder="16-A-0000" />
                </div>
                <div className="space-y-1">
                  <Label>Type</Label>
                  <Select name="type" defaultValue="Van">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["Car", "Van", "Truck", "Bus", "Motorcycle"].map(
                        (t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Make</Label>
                  <Input name="make" required />
                </div>
                <div className="space-y-1">
                  <Label>Model</Label>
                  <Input name="model" required />
                </div>
                <div className="space-y-1">
                  <Label>Year</Label>
                  <Input name="year" type="number" defaultValue={2024} />
                </div>
                <div className="space-y-1">
                  <Label>Depot</Label>
                  <Input
                    name="depot"
                    required
                    placeholder="Algiers Central"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Max Passengers</Label>
                  <Input name="passengers" type="number" defaultValue={2} />
                </div>
                <div className="space-y-1">
                  <Label>Max Weight (kg)</Label>
                  <Input name="weight" type="number" defaultValue={1000} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Save Vehicle</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search vehicles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Depot</TableHead>
                <TableHead>Assigned Driver</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((v) => {
                const Icon = TYPE_ICON[v.type] || Truck;
                return (
                  <TableRow key={v.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium text-sm font-mono">
                            {v.plate}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {v.make} {v.model} ({v.year})
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{v.type}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {v.capacity.passengers}p / {v.capacity.weight}kg
                    </TableCell>
                    <TableCell className="text-sm">{v.depot}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {v.driver || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={STATUS_VARIANT[v.status]}
                        className="text-xs capitalize"
                      >
                        {v.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
