"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { updateSalesOrder } from "@/app/actions/sales-orders";

interface DeliveryUpdateCardProps {
  deliveryDate: string;
  deliveryStatus: string;
  orderId: string;
}

const DELIVERY_STATUS_OPTIONS = [
  "Not Delivered",
  "Partly Delivered",
  "Fully Delivered",
  "Closed",
  "Not Applicable"
];

export function DeliveryUpdateCard({ deliveryDate, deliveryStatus, orderId }: DeliveryUpdateCardProps) {
  const [date, setDate] = useState(deliveryDate);
  const [status, setStatus] = useState(deliveryStatus);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

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
    } else {
      addToast({ type: "error", title: "Update failed", message: result.error || "Could not update delivery details." });
    }
  };

  return (
    <Card className="bg-neutral-900/80 border-none shadow-lg">
      <CardContent className="flex flex-col gap-4 p-6">
        <div className="text-slate-400 text-sm mb-1">Delivery Date</div>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-slate-400" />
          <input
            type="date"
            className="bg-transparent border rounded px-3 py-1 text-white"
            value={date}
            onChange={e => setDate(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Select value={status} onValueChange={setStatus} disabled={loading}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DELIVERY_STATUS_OPTIONS.map(opt => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleUpdate} disabled={loading} className="ml-2 bg-blue-600 hover:bg-blue-700">
            {loading ? 'Updating...' : 'Update'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
