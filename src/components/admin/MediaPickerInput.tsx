import React, { useState } from 'react';
import { Image as ImageIcon, Search, Upload, X } from 'lucide-react';
import type { MediaAsset } from '../../types';

interface MediaPickerInputProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  token: string;
  media: MediaAsset[];
  onMediaUploaded?: () => Promise<void>;
  bucket?: string;
  accept?: string;
  placeholder?: string;
  previewDark?: boolean;
  previewContain?: boolean;
  hint?: string;
}

export const MediaPickerInput: React.FC<MediaPickerInputProps> = ({
  label,
  value,
  onChange,
  token,
  media,
  onMediaUploaded,
  bucket = 'site-branding',
  accept = 'image/jpeg,image/png,image/webp,image/avif,.ico',
  placeholder = 'https://... or /assets/...',
  previewDark = false,
  previewContain = true,
  hint,
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');

  const handleFileChange = async (file: File) => {
    setUploading(true);
    setUploadError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('bucket', bucket);
      const res = await fetch('/api/admin/media', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error || 'Image upload failed.');
      } else {
        onChange(data.asset.file_url);
        if (onMediaUploaded) {
          await onMediaUploaded();
        }
      }
    } catch {
      setUploadError('Network error while uploading image.');
    } finally {
      setUploading(false);
    }
  };

  const filteredMedia = media.filter((m) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      m.file_name.toLowerCase().includes(q) ||
      m.bucket.toLowerCase().includes(q) ||
      m.file_url.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="block text-xs font-semibold text-[#0E021E]">{label}</label>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-[11px] font-medium text-[#B71C85] hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
        {value && (
          <div
            className={`w-12 h-10 rounded-lg border border-[#AA87FF]/35 shrink-0 flex items-center justify-center overflow-hidden p-1 ${
              previewDark ? 'bg-[#1D0047]' : 'bg-[#F3F0FF]/70'
            }`}
          >
            <img
              src={value}
              alt={label}
              className={`w-full h-full ${previewContain ? 'object-contain' : 'object-cover'}`}
            />
          </div>
        )}

        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 min-w-[160px] px-3 py-2 rounded-xl border border-[#AA87FF]/45 text-xs bg-white focus:outline-none focus:border-[#5000AF]"
        />

        <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#5000AF] text-white text-xs font-semibold cursor-pointer hover:bg-[#39008B] transition-colors shrink-0">
          <Upload className="w-3.5 h-3.5" />
          {uploading ? 'Uploading...' : 'Upload'}
          <input
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileChange(f);
              e.target.value = '';
            }}
          />
        </label>

        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F3F0FF] text-[#39008B] text-xs font-semibold hover:bg-[#AA87FF]/25 transition-colors shrink-0"
        >
          <ImageIcon className="w-3.5 h-3.5" />
          Library
        </button>
      </div>

      {hint && <p className="text-[11px] text-[#0E021E]/55">{hint}</p>}
      {uploadError && <p className="text-[11px] font-semibold text-[#B71C85]">{uploadError}</p>}

      {pickerOpen && (
        <div className="fixed inset-0 z-[70] bg-[#0E021E]/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-5 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#F3F0FF]">
              <div>
                <h4 className="font-display text-lg font-bold text-[#0E021E]">
                  Choose Image from Media Library
                </h4>
                <p className="text-xs text-[#0E021E]/60">
                  Select an existing asset or upload a new image directly above.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="p-1.5 rounded-lg hover:bg-[#F3F0FF]"
                aria-label="Close media library picker"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-3 flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-[#39008B]/60 absolute left-3 top-2.5" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter by file name or folder..."
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-[#AA87FF]/40 text-xs focus:outline-none focus:border-[#5000AF]"
                />
              </div>
              <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#5000AF] text-white text-xs font-semibold cursor-pointer hover:bg-[#39008B]">
                <Upload className="w-3.5 h-3.5" />
                {uploading ? 'Uploading...' : 'Upload New'}
                <input
                  type="file"
                  accept={accept}
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      await handleFileChange(f);
                      setPickerOpen(false);
                    }
                    e.target.value = '';
                  }}
                />
              </label>
            </div>

            <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 py-2">
              {filteredMedia.length === 0 ? (
                <div className="col-span-full py-12 text-center text-xs text-[#0E021E]/55">
                  No uploaded media assets match your filter yet. Upload an image above to add it to your library.
                </div>
              ) : (
                filteredMedia.map((m) => {
                  const isSelected = value === m.file_url;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        onChange(m.file_url);
                        setPickerOpen(false);
                      }}
                      className={`group rounded-xl border text-left overflow-hidden transition-all ${
                        isSelected
                          ? 'border-[#5000AF] ring-2 ring-[#5000AF]/30'
                          : 'border-[#AA87FF]/25 hover:border-[#5000AF]'
                      }`}
                    >
                      <div className="aspect-[4/3] bg-[#F3F0FF] flex items-center justify-center overflow-hidden p-1.5">
                        <img
                          src={m.file_url}
                          alt={m.alt_text || m.file_name}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <div className="p-2 bg-white">
                        <p className="text-[11px] font-semibold text-[#0E021E] truncate">
                          {m.file_name}
                        </p>
                        <p className="text-[10px] text-[#0E021E]/50 truncate">{m.bucket}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
