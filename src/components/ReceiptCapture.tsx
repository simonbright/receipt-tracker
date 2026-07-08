import { useRef, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Expense, LineItemType } from '../types';
import { DEFAULT_LINE_ITEM, LINE_ITEMS, lineItemToCategory } from '../types';
import { parseReceipt } from '../lib/receiptParser';

interface ReceiptCaptureProps {
  onAddExpense: (expense: Expense) => void;
  aiAvailable: boolean;
}

type Step = 'idle' | 'preview' | 'parsing' | 'review';

const GALLERY_ACCEPT = 'image/jpeg,image/png,image/heic,image/heif,image/webp,image/gif';

function isMobileDevice() {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    || (window.matchMedia('(pointer: coarse)').matches && window.innerWidth < 1024);
}

export default function ReceiptCapture({ onAddExpense, aiAvailable }: ReceiptCaptureProps) {
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isMobile = isMobileDevice();

  const [step, setStep] = useState<Step>('idle');
  const [imageData, setImageData] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [parseProgress, setParseProgress] = useState('');
  const [form, setForm] = useState({
    merchant: '',
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toTimeString().slice(0, 5),
    amount: '',
    lineItem: DEFAULT_LINE_ITEM as LineItemType,
    description: '',
  });

  const stopCamera = useCallback(() => {
    const video = videoRef.current;
    if (video?.srcObject) {
      (video.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  const reset = useCallback(() => {
    setStep('idle');
    setImageData(null);
    stopCamera();
    setForm({
      merchant: '',
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toTimeString().slice(0, 5),
      amount: '',
      lineItem: DEFAULT_LINE_ITEM,
      description: '',
    });
  }, [stopCamera]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
        setStep('preview');
      }
    } catch {
      galleryInputRef.current?.click();
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0);
    const data = canvas.toDataURL('image/jpeg', 0.92);
    setImageData(data);
    stopCamera();
    runParse(data);
  };

  const handleFile = (file: File) => {
    setStep('parsing');
    setParseProgress('Loading image…');
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result as string;
      if (!data) {
        reset();
        return;
      }
      setImageData(data);
      runParse(data);
    };
    reader.onerror = () => reset();
    reader.readAsDataURL(file);
  };

  const runParse = async (data: string) => {
    setStep('parsing');
    setParseProgress(aiAvailable ? 'Analyzing receipt with AI…' : 'Running OCR on receipt…');
    try {
      const parsed = await parseReceipt(data, aiAvailable);
      setForm({
        merchant: parsed.merchant || '',
        date: parsed.date || new Date().toISOString().slice(0, 10),
        time: parsed.time?.slice(0, 5) || new Date().toTimeString().slice(0, 5),
        amount: parsed.amount != null ? parsed.amount.toFixed(2) : '',
        lineItem: parsed.lineItem || DEFAULT_LINE_ITEM,
        description: parsed.description || '',
      });
      setParseProgress(
        parsed.confidence > 0.7
          ? 'Receipt parsed successfully — review and confirm'
          : 'Partial parse — please verify all fields'
      );
    } catch {
      setParseProgress('Could not auto-parse — please fill in details manually');
    }
    setStep('review');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageData || !form.amount) return;

    const expense: Expense = {
      id: uuidv4(),
      merchant: form.merchant,
      date: form.date,
      time: form.time,
      amount: parseFloat(form.amount),
      lineItem: form.lineItem,
      category: lineItemToCategory(form.lineItem),
      description: form.description,
      imageData,
      createdAt: new Date().toISOString(),
    };

    onAddExpense(expense);
    reset();
  };

  return (
    <section className="card p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Add Receipt</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Snap a photo or upload an image — we'll extract the date, time, and amount automatically.
      </p>

      {step === 'idle' && (
        <div className="grid sm:grid-cols-2 gap-4">
          {isMobile ? (
            <>
              <label className="flex flex-col items-center gap-3 p-8 rounded-xl border-2 border-dashed border-brand-300 dark:border-brand-700 bg-brand-50 dark:bg-brand-950 hover:bg-brand-100 dark:hover:bg-brand-900 transition-colors cursor-pointer">
                <div className="w-14 h-14 bg-brand-600 rounded-full flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <span className="font-medium text-brand-800 dark:text-brand-200">Take Photo</span>
                <span className="text-xs text-brand-600 dark:text-brand-400">Opens your camera</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  onChange={onFileInputChange}
                />
              </label>

              <label className="flex flex-col items-center gap-3 p-8 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                <div className="w-14 h-14 bg-gray-600 rounded-full flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="font-medium text-gray-800">Choose Photo</span>
                <span className="text-xs text-gray-500">From your photo library</span>
                <input
                  type="file"
                  accept={GALLERY_ACCEPT}
                  className="sr-only"
                  onChange={onFileInputChange}
                />
              </label>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={startCamera}
                className="flex flex-col items-center gap-3 p-8 rounded-xl border-2 border-dashed border-brand-300 dark:border-brand-700 bg-brand-50 dark:bg-brand-950 hover:bg-brand-100 dark:hover:bg-brand-900 transition-colors"
              >
                <div className="w-14 h-14 bg-brand-600 rounded-full flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <span className="font-medium text-brand-800">Take Photo</span>
                <span className="text-xs text-brand-600">Use your device camera</span>
              </button>

              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="flex flex-col items-center gap-3 p-8 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="w-14 h-14 bg-gray-600 rounded-full flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="font-medium text-gray-800">Upload Image</span>
                <span className="text-xs text-gray-500">JPG, PNG, or HEIC</span>
              </button>

              <input
                ref={galleryInputRef}
                type="file"
                accept={GALLERY_ACCEPT}
                className="hidden"
                onChange={onFileInputChange}
              />
            </>
          )}
        </div>
      )}

      {step === 'preview' && cameraActive && (
        <div className="space-y-4">
          <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3] max-h-96">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={capturePhoto} className="btn-primary flex-1">
              Capture Receipt
            </button>
            <button type="button" onClick={reset} className="btn-secondary">
              Cancel
            </button>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {step === 'parsing' && imageData && (
        <div className="flex flex-col items-center py-12 gap-4">
          <img src={imageData} alt="Receipt" className="w-48 h-48 object-cover rounded-lg shadow-md" />
          <div className="flex items-center gap-3 text-brand-700">
            <Spinner />
            <span className="text-sm font-medium">{parseProgress}</span>
          </div>
        </div>
      )}

      {step === 'review' && imageData && (
        <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-6">
          <div>
            <img src={imageData} alt="Receipt preview" className="w-full rounded-lg border border-gray-200 shadow-sm" />
            <p className="text-xs text-gray-500 mt-2">{parseProgress}</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label">Merchant</label>
              <input
                className="input"
                value={form.merchant}
                onChange={(e) => setForm({ ...form, merchant: e.target.value })}
                placeholder="Store or restaurant name"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Date</label>
                <input
                  type="date"
                  className="input"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label">Time</label>
                <input
                  type="time"
                  className="input"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label className="label">Line item</label>
                <select
                  className="input"
                  value={form.lineItem}
                  onChange={(e) => setForm({ ...form, lineItem: e.target.value as LineItemType })}
                >
                  {LINE_ITEMS.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="label">Description</label>
              <input
                className="input"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Optional notes"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary flex-1">
                Add to Expense Log
              </button>
              <button type="button" onClick={reset} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}
    </section>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}
