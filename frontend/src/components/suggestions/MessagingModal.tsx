/**
 * MoodLens - Contact Check-In Messaging Modal
 * Quick social messaging reach-out composer via SMS, WhatsApp, and Clipboard.
 */
import React, { useState } from 'react';
import { X, Send, Copy, MessageSquare, Check, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { INTEGRATION_CONFIG } from '../../../../shared/configuration/integrations.config';

interface MessagingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MessagingModal: React.FC<MessagingModalProps> = ({ isOpen, onClose }) => {
  const templates = INTEGRATION_CONFIG.MESSAGING.CHECKIN_TEMPLATES;
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(templates[0].id);
  const [messageText, setMessageText] = useState<string>(templates[0].text);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen) return null;

  const handleSelectTemplate = (id: string, text: string) => {
    setSelectedTemplateId(id);
    setMessageText(text);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setIsCopied(true);
    toast.success('Message copied to clipboard!');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSendSMS = () => {
    const encoded = encodeURIComponent(messageText);
    const uri = phoneNumber ? `sms:${phoneNumber}?body=${encoded}` : `sms:?body=${encoded}`;
    window.location.href = uri;
    toast.success('Opening SMS app...');
  };

  const handleSendWhatsApp = () => {
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    const encoded = encodeURIComponent(messageText);
    const uri = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${encoded}` 
      : `https://wa.me/?text=${encoded}`;
    window.open(uri, '_blank', 'noopener,noreferrer');
    toast.success('Opening WhatsApp...');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden space-y-4 p-6 animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-pink-100 dark:bg-pink-950/60 flex items-center justify-center text-pink-600 dark:text-pink-400">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Contact Check-In & Reach Out
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Share an unexpected moment or check in with a close contact.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Templates */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Choose a quick template:
          </label>
          <div className="flex flex-wrap gap-2">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => handleSelectTemplate(t.id, t.text)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  selectedTemplateId === t.id
                    ? 'bg-pink-50 dark:bg-pink-950/50 border-pink-400 text-pink-600 dark:text-pink-300 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Phone number optional input */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Recipient phone (optional):
          </label>
          <div className="relative">
            <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="tel"
              placeholder="+1 (555) 000-0000"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500/50"
            />
          </div>
        </div>

        {/* Message Editor */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Message:
          </label>
          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            rows={3}
            className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500/50 resize-none leading-relaxed"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={handleCopy}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center space-x-1.5"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{isCopied ? 'Copied' : 'Copy Text'}</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleSendWhatsApp}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center space-x-1.5"
            >
              <span>WhatsApp</span>
            </button>
            <button
              onClick={handleSendSMS}
              className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold shadow-md shadow-pink-600/20 transition-all flex items-center space-x-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send SMS</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
