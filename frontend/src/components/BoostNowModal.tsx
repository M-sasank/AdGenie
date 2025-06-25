import React, { useState } from 'react';

interface BoostNowModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (prompt: string) => void;
}

const examplePrompt = "Announce a 35% discount on all coffees for our one-year anniversary. Highlight our cozy atmosphere and invite customers to join the celebration. Add a fun emoji and a call to action.";

export const BoostNowModal: React.FC<BoostNowModalProps> = ({ open, onClose, onSubmit }) => {
  const [prompt, setPrompt] = useState('');

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative flex flex-col gap-6">
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="text-2xl font-bold mb-1 text-gray-900">What's on your mind?</h2>
        <p className="text-gray-600 mb-2 text-base">
          Describe your offer or announcement. <span className="font-semibold">The image will be visual only</span>—your offer details will appear in the Instagram caption.
        </p>
        <textarea
          className="w-full border border-gray-200 rounded-lg p-4 min-h-[120px] mb-2 focus:outline-none focus:ring-2 focus:ring-gray-900 text-base resize-none bg-gray-50"
          placeholder={examplePrompt}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
        />
        <div className="bg-gray-100 rounded-lg p-3 mb-2">
          <div className="text-xs text-gray-500 mb-1">
            <span className="font-semibold">Example:</span> <span className="italic">{examplePrompt}</span>
          </div>
          <div className="text-xs text-gray-400">
            Tip: Focus on your offer, announcement, or event. The AI will create a matching image, and your details will be used in the caption for best results.
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-2">
          <button
            className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800"
            onClick={() => {
              onSubmit(prompt);
              setPrompt('');
              onClose();
            }}
            disabled={!prompt.trim()}
          >
            Generate Post
          </button>
        </div>
      </div>
    </div>
  );
}; 