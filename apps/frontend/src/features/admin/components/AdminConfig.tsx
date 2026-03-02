"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import { Save, RotateCcw } from "lucide-react";

export default function AdminConfig() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            System Configuration
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Global parameters affecting system behavior
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <RotateCcw className="w-4 h-4 mr-2" /> Reset
          </Button>
          <Button size="sm">
            <Save className="w-4 h-4 mr-2" /> Save All
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Optimization */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-display">
              Optimization Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Default Time Window Duration (hours)</Label>
              <Input type="number" defaultValue={2} />
            </div>
            <div className="space-y-2">
              <Label>Solver Time Limit (seconds)</Label>
              <Input type="number" defaultValue={60} />
            </div>
            <div className="space-y-2">
              <Label>Depot Return Policy</Label>
              <Select defaultValue="always">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="always">Always Return</SelectItem>
                  <SelectItem value="optional">Optional</SelectItem>
                  <SelectItem value="never">Never</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Capacity Unit</Label>
              <Select defaultValue="kg">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">Kilograms (kg)</SelectItem>
                  <SelectItem value="m3">Cubic Meters (m³)</SelectItem>
                  <SelectItem value="passengers">Passengers</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Routing */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-display">
              Routing Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Default Travel Speed (km/h)</Label>
              <Input type="number" defaultValue={40} />
            </div>
            <div className="space-y-2">
              <Label>Road Type Preference</Label>
              <Select defaultValue="mixed">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="highways">Prefer Highways</SelectItem>
                  <SelectItem value="local">Prefer Local Roads</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Matrix Cache Duration (hours)</Label>
              <Input type="number" defaultValue={24} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Rush Hour Multipliers</Label>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Business Rules */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-display">
              Business Rules
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Maximum Stops per Driver</Label>
              <Input type="number" defaultValue={15} />
            </div>
            <div className="space-y-2">
              <Label>Default Pickup Service Time (min)</Label>
              <Input type="number" defaultValue={10} />
            </div>
            <div className="space-y-2">
              <Label>Default Dropoff Service Time (min)</Label>
              <Input type="number" defaultValue={5} />
            </div>
            <div className="space-y-2">
              <Label>Priority Weighting</Label>
              <Select defaultValue="default">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">
                    Default (Urgent x4, High x2)
                  </SelectItem>
                  <SelectItem value="equal">Equal Priority</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* System */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-display">
              System Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Session Timeout (minutes)</Label>
              <Input type="number" defaultValue={30} />
            </div>
            <div className="space-y-2">
              <Label>Password Expiry (days)</Label>
              <Input type="number" defaultValue={90} />
            </div>
            <div className="space-y-2">
              <Label>Audit Log Retention (months)</Label>
              <Input type="number" defaultValue={12} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Require Complex Passwords</Label>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
