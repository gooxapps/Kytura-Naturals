import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import { formatCad } from '../../context/StoreContext';
import type {
  Product,
  WholesaleApplication,
  WholesaleInquiry,
  WholesalePriceTier,
  WholesaleProfile,
} from '../../types';

interface AdminWholesaleProps {
  token: string;
  applications: WholesaleApplication[];
  profiles: WholesaleProfile[];
  inquiries: WholesaleInquiry[];
  products: Array<Product & { wholesale_tier?: WholesalePriceTier | null }>;
  onRefresh: () => Promise<void>;
}

export const AdminWholesaleSection: React.FC<AdminWholesaleProps> = ({
  token,
  applications,
  profiles,
  inquiries,
  products,
  onRefresh,
}) => {
  const [subTab, setSubTab] = useState<'apps' | 'profiles' | 'pricing' | 'inquiries'>('apps');
  const [statusMsg, setStatusMsg] = useState('');
  const [editingTier, setEditingTier] = useState<{
    productId: string;
    productName: string;
    moq: number;
    base_wholesale_price_cad: number;
    tier_2_min_qty: number | '';
    tier_2_price_cad: number | '';
    tier_3_min_qty: number | '';
    tier_3_price_cad: number | '';
    is_wholesale_available: boolean;
  } | null>(null);
  const [quotingInquiry, setQuotingInquiry] = useState<{
    inquiryId: string;
    ref: string;
    quoted_total_cad: number;
    shipping_estimate_cad: number;
    terms: string;
    valid_until: string;
  } | null>(null);

  const handleApplicationDecision = async (
    id: string,
    status: 'approved' | 'rejected',
    rejection_reason = ''
  ) => {
    const res = await fetch(`/api/admin/wholesale/applications/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status, rejection_reason }),
    });
    if (res.ok) {
      await onRefresh();
      setStatusMsg(`Application marked as ${status}.`);
    }
  };

  const handleProfileStatus = async (id: string, status: 'approved' | 'suspended') => {
    const res = await fetch(`/api/admin/wholesale/profiles/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      await onRefresh();
      setStatusMsg(`Wholesale partner status set to ${status}.`);
    }
  };

  const handleSaveTier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTier) return;
    const res = await fetch(`/api/admin/wholesale/tiers/${editingTier.productId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        moq: editingTier.moq,
        base_wholesale_price_cad: editingTier.base_wholesale_price_cad,
        tier_2_min_qty: editingTier.tier_2_min_qty === '' ? null : Number(editingTier.tier_2_min_qty),
        tier_2_price_cad: editingTier.tier_2_price_cad === '' ? null : Number(editingTier.tier_2_price_cad),
        tier_3_min_qty: editingTier.tier_3_min_qty === '' ? null : Number(editingTier.tier_3_min_qty),
        tier_3_price_cad: editingTier.tier_3_price_cad === '' ? null : Number(editingTier.tier_3_price_cad),
        is_wholesale_available: editingTier.is_wholesale_available,
      }),
    });
    if (res.ok) {
      setEditingTier(null);
      await onRefresh();
      setStatusMsg('Wholesale price tier saved.');
    }
  };

  const handleUpdateInquiryStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/admin/wholesale/inquiries/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      await onRefresh();
    }
  };

  const handleSendQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quotingInquiry) return;
    const res = await fetch(
      `/api/admin/wholesale/inquiries/${quotingInquiry.inquiryId}/quotation`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(quotingInquiry),
      }
    );
    if (res.ok) {
      setQuotingInquiry(null);
      await onRefresh();
      setStatusMsg('Formal quotation sent to wholesale partner.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-[#0E021E]">Wholesale Management</h2>
          <p className="text-xs text-[#0E021E]/65">
            Review applications, manage approved partners, configure CAD wholesale tiers &amp; MOQs, and issue quotations.
          </p>
        </div>

        <div className="inline-flex bg-[#F3F0FF] p-1 rounded-full text-xs font-semibold">
          {[
            { id: 'apps', label: `Applications (${applications.length})` },
            { id: 'profiles', label: `Partners (${profiles.length})` },
            { id: 'pricing', label: 'Wholesale Pricing' },
            { id: 'inquiries', label: `Enquiries (${inquiries.length})` },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id as typeof subTab)}
              className={`px-3.5 py-1.5 rounded-full transition-colors whitespace-nowrap ${
                subTab === t.id ? 'bg-[#5000AF] text-white' : 'text-[#39008B]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {statusMsg && (
        <div className="p-3 rounded-xl bg-[#F3F0FF] text-xs font-semibold text-[#39008B]">
          {statusMsg}
        </div>
      )}

      {subTab === 'apps' && (
        <div className="space-y-3">
          {applications.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#AA87FF]/25 p-8 text-center text-xs text-[#0E021E]/60">
              No wholesale applications submitted yet.
            </div>
          ) : (
            applications.map((app) => (
              <div
                key={app.id}
                className="bg-white rounded-xl border border-[#AA87FF]/25 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-[#0E021E]">{app.business_name}</h3>
                    <span
                      className={`font-semibold uppercase ${
                        app.status === 'approved'
                          ? 'text-[#538710]'
                          : app.status === 'rejected'
                          ? 'text-[#B71C85]'
                          : 'text-[#5000AF]'
                      }`}
                    >
                      {app.status}
                    </span>
                  </div>
                  <p className="text-[#0E021E]/75">
                    {app.applicant_name} · {app.business_email} · {app.phone}
                  </p>
                  <p className="text-[#0E021E]/65">
                    {app.business_type} · {app.business_address}, {app.country}
                  </p>
                  {app.additional_info && (
                    <p className="text-[#0E021E]/70 italic">Note: {app.additional_info}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {app.status !== 'approved' && (
                    <button
                      type="button"
                      onClick={() => handleApplicationDecision(app.id, 'approved')}
                      className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-[#538710] text-white text-xs font-semibold hover:opacity-90"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Approve
                    </button>
                  )}
                  {app.status !== 'rejected' && (
                    <button
                      type="button"
                      onClick={() => handleApplicationDecision(app.id, 'rejected')}
                      className="inline-flex items-center gap-1 px-4 py-2 rounded-full border border-[#B71C85] text-[#B71C85] text-xs font-semibold hover:bg-[#B71C85]/10"
                    >
                      <X className="w-3.5 h-3.5" />
                      Reject
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {subTab === 'profiles' && (
        <div className="bg-white rounded-xl border border-[#AA87FF]/25 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F3F0FF]/70 text-[#39008B] font-semibold">
              <tr>
                <th className="px-4 py-3">Business</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Country</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F0FF]">
              {profiles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[#0E021E]/60">
                    No approved wholesale partners yet.
                  </td>
                </tr>
              ) : (
                profiles.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-semibold">{p.business_name}</td>
                    <td className="px-4 py-3">
                      {p.contact_name} · {p.business_email}
                    </td>
                    <td className="px-4 py-3">{p.country}</td>
                    <td className="px-4 py-3 font-semibold capitalize">{p.status}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          handleProfileStatus(
                            p.id,
                            p.status === 'approved' ? 'suspended' : 'approved'
                          )
                        }
                        className="px-3 py-1 rounded-full border border-[#5000AF] text-[#5000AF] font-semibold"
                      >
                        {p.status === 'approved' ? 'Suspend' : 'Reactivate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {subTab === 'pricing' && (
        <div className="bg-white rounded-xl border border-[#AA87FF]/25 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F3F0FF]/70 text-[#39008B] font-semibold">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3 text-right">Retail (CAD)</th>
                <th className="px-4 py-3 text-right">MOQ</th>
                <th className="px-4 py-3 text-right">Wholesale Base</th>
                <th className="px-4 py-3 text-right">Tier 2 / Tier 3</th>
                <th className="px-4 py-3 text-right">Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F0FF]">
              {products.map((p) => {
                const t = p.wholesale_tier;
                return (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-semibold">{p.name}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatCad(p.retail_price_cad)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{t ? t.moq : '—'}</td>
                    <td className="px-4 py-3 text-right font-bold text-[#39008B] tabular-nums">
                      {t ? formatCad(t.base_wholesale_price_cad) : 'Not set'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {t?.tier_2_min_qty && t.tier_2_price_cad !== null
                        ? `${t.tier_2_min_qty}+: ${formatCad(t.tier_2_price_cad)}`
                        : '—'}
                      {t?.tier_3_min_qty && t.tier_3_price_cad !== null
                        ? ` · ${t.tier_3_min_qty}+: ${formatCad(t.tier_3_price_cad)}`
                        : ''}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          setEditingTier({
                            productId: p.id,
                            productName: p.name,
                            moq: t?.moq ?? 10,
                            base_wholesale_price_cad:
                              t?.base_wholesale_price_cad ??
                              Number((p.retail_price_cad * 0.6).toFixed(2)),
                            tier_2_min_qty: t?.tier_2_min_qty ?? '',
                            tier_2_price_cad: t?.tier_2_price_cad ?? '',
                            tier_3_min_qty: t?.tier_3_min_qty ?? '',
                            tier_3_price_cad: t?.tier_3_price_cad ?? '',
                            is_wholesale_available: t ? Boolean(t.is_wholesale_available) : true,
                          })
                        }
                        className="px-3 py-1 rounded-full bg-[#F3F0FF] text-[#5000AF] font-semibold"
                      >
                        Configure
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {subTab === 'inquiries' && (
        <div className="space-y-4">
          {inquiries.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#AA87FF]/25 p-8 text-center text-xs text-[#0E021E]/60">
              No wholesale enquiries received yet.
            </div>
          ) : (
            inquiries.map((inq) => (
              <div
                key={inq.id}
                className="bg-white rounded-xl border border-[#AA87FF]/25 p-5 space-y-3 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="font-mono font-bold text-[#5000AF]">
                      {inq.inquiry_reference}
                    </span>
                    <span className="ml-2 font-semibold text-[#0E021E]">
                      {inq.business_name} ({inq.business_email})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={inq.status}
                      onChange={(e) => handleUpdateInquiryStatus(inq.id, e.target.value)}
                      className="px-2.5 py-1 rounded-lg border border-[#AA87FF]/40 bg-white"
                    >
                      {['Submitted', 'Under Review', 'Quoted', 'Approved', 'Fulfilled', 'Closed'].map(
                        (s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        )
                      )}
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        setQuotingInquiry({
                          inquiryId: inq.id,
                          ref: inq.inquiry_reference,
                          quoted_total_cad: inq.estimated_total_cad,
                          shipping_estimate_cad: 0,
                          terms: 'Net 15 / Confirmed upon invoice acceptance',
                          valid_until: '',
                        })
                      }
                      className="px-3 py-1.5 rounded-full bg-[#5000AF] text-white font-semibold"
                    >
                      Create Quotation
                    </button>
                  </div>
                </div>

                <div className="bg-[#F3F0FF]/50 rounded-lg p-3 space-y-1">
                  {inq.items.map((it) => (
                    <div key={it.id} className="flex justify-between tabular-nums">
                      <span>
                        {it.product_name} × {it.quantity} ({formatCad(it.quoted_unit_price_cad)}/unit)
                      </span>
                      <strong>{formatCad(it.line_total_cad)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tier Modal */}
      {editingTier && (
        <div className="fixed inset-0 z-50 bg-[#0E021E]/55 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveTier}
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">{editingTier.productName}</h3>
              <button type="button" onClick={() => setEditingTier(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">MOQ (Units)</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={editingTier.moq}
                  onChange={(e) =>
                    setEditingTier({ ...editingTier, moq: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-xl border"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Base Wholesale (CAD)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editingTier.base_wholesale_price_cad}
                  onChange={(e) =>
                    setEditingTier({
                      ...editingTier,
                      base_wholesale_price_cad: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Tier 2 Min Qty</label>
                <input
                  type="number"
                  value={editingTier.tier_2_min_qty}
                  onChange={(e) =>
                    setEditingTier({
                      ...editingTier,
                      tier_2_min_qty: e.target.value ? Number(e.target.value) : '',
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Tier 2 Price (CAD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingTier.tier_2_price_cad}
                  onChange={(e) =>
                    setEditingTier({
                      ...editingTier,
                      tier_2_price_cad: e.target.value ? Number(e.target.value) : '',
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Tier 3 Min Qty</label>
                <input
                  type="number"
                  value={editingTier.tier_3_min_qty}
                  onChange={(e) =>
                    setEditingTier({
                      ...editingTier,
                      tier_3_min_qty: e.target.value ? Number(e.target.value) : '',
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Tier 3 Price (CAD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingTier.tier_3_price_cad}
                  onChange={(e) =>
                    setEditingTier({
                      ...editingTier,
                      tier_3_price_cad: e.target.value ? Number(e.target.value) : '',
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold">
              <input
                type="checkbox"
                checked={editingTier.is_wholesale_available}
                onChange={(e) =>
                  setEditingTier({ ...editingTier, is_wholesale_available: e.target.checked })
                }
              />
              Available in Wholesale Portal
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingTier(null)}
                className="px-4 py-2 rounded-full border text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-full bg-[#5000AF] text-white text-xs font-semibold"
              >
                Save Pricing
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Quotation Modal */}
      {quotingInquiry && (
        <div className="fixed inset-0 z-50 bg-[#0E021E]/55 flex items-center justify-center p-4">
          <form
            onSubmit={handleSendQuotation}
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">
                Quotation for {quotingInquiry.ref}
              </h3>
              <button type="button" onClick={() => setQuotingInquiry(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Quoted Product Total (CAD)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={quotingInquiry.quoted_total_cad}
                  onChange={(e) =>
                    setQuotingInquiry({
                      ...quotingInquiry,
                      quoted_total_cad: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Shipping Estimate (CAD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={quotingInquiry.shipping_estimate_cad}
                  onChange={(e) =>
                    setQuotingInquiry({
                      ...quotingInquiry,
                      shipping_estimate_cad: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Quotation Terms</label>
                <textarea
                  rows={2}
                  value={quotingInquiry.terms}
                  onChange={(e) =>
                    setQuotingInquiry({ ...quotingInquiry, terms: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Valid Until (Optional)</label>
                <input
                  type="date"
                  value={quotingInquiry.valid_until}
                  onChange={(e) =>
                    setQuotingInquiry({ ...quotingInquiry, valid_until: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setQuotingInquiry(null)}
                className="px-4 py-2 rounded-full border text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-full bg-[#5000AF] text-white text-xs font-semibold"
              >
                Send Quotation
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
