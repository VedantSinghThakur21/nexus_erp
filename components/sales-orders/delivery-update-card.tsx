"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Truck } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { updateSalesOrder } from "@/app/actions/sales-orders";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface DeliveryUpdateCardProps {
  deliveryDate: string;
  deliveryStatus: string;
  orderId: string;
}

export function DeliveryUpdateCard({ deliveryDate, deliveryStatus, orderId }: DeliveryUpdateCardProps) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(deliveryDate);
  const [status, setStatus] = useState(deliveryStatus);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    setDate(deliveryDate);
    setStatus(deliveryStatus);
  }, [deliveryDate, deliveryStatus]);

  const handleUpdate = async () => {
    setLoading(true);
    const data: any = {};
    if (date !== deliveryDate) data.delivery_date = date;
    if (status !== deliveryStatus) data.delivery_status = status;
    if (Object.keys(data).length === 0) {
      setLoading(false);
      return;
    }
    const result = await updateSalesOrder(orderId, data);
    setLoading(false);
    if (result.success) {
      addToast({ type: "success", title: "Updated!", message: "Delivery details updated." });
      setOpen(false);
    } else {
      addToast({ type: "error", title: "Update failed", message: result.error || "Could not update delivery details." });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Truck className="h-3 w-3" />
          Update
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Delivery Details</DialogTitle>
          <DialogDescription>
            Update the delivery date and status for this sales order.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label htmlFor="delivery-date" className="text-sm font-medium">
              Delivery Date
            </label>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              <input
                id="delivery-date"
                type="date"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <label htmlFor="delivery-status" className="text-sm font-medium">
              Delivery Status
            </label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Not Delivered">Not Delivered</SelectItem>
                <SelectItem value="Partly Delivered">Partly Delivered</SelectItem>
                <SelectItem value="Fully Delivered">Fully Delivered</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
                <SelectItem value="Not Applicable">Not Applicable</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpdate} disabled={loading}>
            {loading ? "Updating..." : "Update"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
