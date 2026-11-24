import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import { formatCad } from '../../context/StoreContext';
import type { OrderStatus, PaymentStatus, RetailOrder } from '../../types';

interface CustomerRecord {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  country: string;
  city: string;
  delivery_address: string;
  order_count: number;
  total_spent_cad: number;
  created_at: string;
}

interface AdminOrdersCustomersProps {
  token: string;
  mode: 'orders' | 'customers';
  orders: RetailOrder[];
  customers: CustomerRecord[];
  onRefresh: () => Promise<void>;
}

const ORDER_STATUSES: OrderStatus[] = [
  'Awaiting WhatsApp Confirmation',
  'Pending Business Confirmation',
  'Confirmed',
  'Processing',
  'Shipped',
  'Delivered',
  'Cancelled',
];

const PAYMENT_STATUSES: PaymentStatus[] = [
  'Unpaid',
  'Pending Verification',
  'Paid',
  'Refunded',
  'Partially Refunded',
];

export const AdminOrdersCustomersSection: React.FC<AdminOrdersCustomersProps> = ({
  token,
  mode,
  orders,
  customers,
  onRefresh,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState<RetailOrder | null>(null);
  const [saving, setSaving] = useState(false);

  const handleUpdateOrder = async (
    id: string,
    patch: { order_status?: OrderStatus; payment_status?: PaymentStatus; internal_notes?: string }
  ) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        await onRefresh();
        if (selectedOrder && selectedOrder.id === id) {
          setSelectedOrder({ ...selectedOrder, ...patch });
        }
      }
    } finally {
      setSaving(false);
    }
  };

  if (mode === 'customers') {
    const filteredCustomers = customers.filter(
      (c) =>
        !search.trim() ||
        c.full_name.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase()) ||
        c.country.toLowerCase().includes(search.toLowerCase())
    );

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold text-[#0E021E]">Customers</h2>
            <p className="text-xs text-[#0E021E]/65">
              Retail customers created through checkout with order counts and CAD totals.
            </p>
          </div>
          <div className="relative">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customers..."
              className="pl-9 pr-4 py-2 rounded-full border border-[#AA87FF]/40 text-xs bg-white"
            />
            <Search className="w-3.5 h-3.5 text-[#5000AF] absolute left-3 top-2.5" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#AA87FF]/25 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F3F0FF]/70 text-[#39008B] font-semibold">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">WhatsApp / Phone</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3 text-right">Orders</th>
                <th className="px-4 py-3 text-right">Total (CAD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F0FF]">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[#0E021E]/60">
                    No customer records match your search yet.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-[#F3F0FF]/25">
                    <td className="px-4 py-3">
                      <span className="font-semibold text-[#0E021E] block">{c.full_name}</span>
                      <span className="text-[#0E021E]/60">{c.email}</span>
                    </td>
                    <td className="px-4 py-3 font-mono">{c.phone}</td>
                    <td className="px-4 py-3">
                      {c.city}, {c.country}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{c.order_count}</td>
                    <td className="px-4 py-3 text-right font-bold text-[#39008B] tabular-nums">
                      {formatCad(c.total_spent_cad)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const filteredOrders = orders.filter((o) => {
    const matchesStatus = statusFilter === 'ALL' || o.order_status === statusFilter;
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      o.order_reference.toLowerCase().includes(q) ||
      o.customer_name.toLowerCase().includes(q) ||
      o.customer_email.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-[#0E021E]">Retail Orders</h2>
          <p className="text-xs text-[#0E021E]/65">
            Update order status and payment status independently.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ref or customer..."
              className="pl-9 pr-4 py-2 rounded-full border border-[#AA87FF]/40 text-xs bg-white"
            />
            <Search className="w-3.5 h-3.5 text-[#5000AF] absolute left-3 top-2.5" />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-full border border-[#AA87FF]/40 text-xs bg-white"
          >
            <option value="ALL">All Statuses</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#AA87FF]/25 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F3F0FF]/70 text-[#39008B] font-semibold">
            <tr>
              <th className="px-4 py-3">Order Ref</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Order Status</th>
              <th className="px-4 py-3">Payment Status</th>
              <th className="px-4 py-3 text-right">Total (CAD)</th>
              <th className="px-4 py-3 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F3F0FF]">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[#0E021E]/60">
                  No retail orders recorded yet.
                </td>
              </tr>
            ) : (
              filteredOrders.map((o) => (
                <tr key={o.id} className="hover:bg-[#F3F0FF]/25">
                  <td className="px-4 py-3 font-mono font-bold text-[#5000AF]">
                    {o.order_reference}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-[#0E021E] block">{o.customer_name}</span>
                    <span className="text-[#0E021E]/60">
                      {o.city}, {o.country}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={o.order_status}
                      disabled={saving}
                      onChange={(e) =>
                        handleUpdateOrder(o.id, { order_status: e.target.value as OrderStatus })
                      }
                      className="px-2.5 py-1 rounded-lg border border-[#AA87FF]/40 bg-white text-xs"
                    >
                      {ORDER_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={o.payment_status}
                      disabled={saving}
                      onChange={(e) =>
                        handleUpdateOrder(o.id, { payment_status: e.target.value as PaymentStatus })
                      }
                      className="px-2.5 py-1 rounded-lg border border-[#AA87FF]/40 bg-white text-xs"
                    >
                      {PAYMENT_STATUSES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-[#39008B] tabular-nums">
                    {formatCad(o.total_cad)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedOrder(o)}
                      className="px-3 py-1 rounded-full bg-[#F3F0FF] text-[#5000AF] font-semibold hover:bg-[#5000AF] hover:text-white transition-colors"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-[#0E021E]/55 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-xs text-[#5000AF] font-bold">
                  {selectedOrder.order_reference}
                </span>
                <h3 className="font-display text-xl font-bold text-[#0E021E]">
                  {selectedOrder.customer_name}
                </h3>
              </div>
              <button type="button" onClick={() => setSelectedOrder(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-[#F3F0FF]/60 p-4 rounded-xl">
              <div>
                <span className="text-[#0E021E]/60 block">Email</span>
                <strong>{selectedOrder.customer_email}</strong>
              </div>
              <div>
                <span className="text-[#0E021E]/60 block">WhatsApp / Phone</span>
                <strong className="font-mono">{selectedOrder.customer_phone}</strong>
              </div>
              <div className="sm:col-span-2">
                <span className="text-[#0E021E]/60 block">Delivery Address</span>
                <strong>
                  {selectedOrder.delivery_address}, {selectedOrder.city}, {selectedOrder.country}
                </strong>
              </div>
              {selectedOrder.order_notes && (
                <div className="sm:col-span-2">
                  <span className="text-[#0E021E]/60 block">Customer Notes</span>
                  <span>{selectedOrder.order_notes}</span>
                </div>
              )}
            </div>

            <div>
              <h4 className="text-xs font-bold text-[#39008B] mb-2">Ordered Items</h4>
              <div className="border border-[#F3F0FF] rounded-xl divide-y divide-[#F3F0FF] text-xs">
                {(selectedOrder.items || []).map((it) => (
                  <div key={it.id} className="p-3 flex justify-between tabular-nums">
                    <span>
                      {it.product_name}
                      {it.variant_name ? ` (${it.variant_name})` : ''} × {it.quantity}
                    </span>
                    <span className="font-bold">{formatCad(it.line_total_cad)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Internal Admin Notes</label>
              <textarea
                rows={2}
                value={selectedOrder.internal_notes || ''}
                onChange={(e) =>
                  setSelectedOrder({ ...selectedOrder, internal_notes: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border border-[#AA87FF]/45 text-xs"
              />
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  handleUpdateOrder(selectedOrder.id, {
                    internal_notes: selectedOrder.internal_notes,
                  })
                }
                className="mt-2 px-4 py-1.5 rounded-full bg-[#5000AF] text-white text-xs font-semibold"
              >
                Save Internal Notes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
