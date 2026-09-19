import React, { useState, useRef } from 'react';
import { 
  Camera, 
  Upload, 
  Sparkles, 
  Check, 
  Trash2, 
  AlertCircle, 
  RefreshCw,
  Image as ImageIcon
} from 'lucide-react';
import { 
  PRESET_3D_AVATARS, 
  compressImageFile, 
  getEffectiveAvatar 
} from '../lib/avatar';
import { PlatformType } from '../types';
import { PlatformIcon } from './PlatformIcon';

interface AvatarPickerProps {
  currentAvatarUrl?: string;
  seedName?: string;
  platform?: PlatformType;
  onChangeAvatar: (url: string | undefined) => void;
  label?: string;
  description?: string;
}

export const AvatarPicker: React.FC<AvatarPickerProps> = ({
  currentAvatarUrl,
  seedName = 'friend',
  platform,
  onChangeAvatar,
  label = "Contact Profile Picture",
  description = "Upload a profile photo or select an avatar for your ad",
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'presets'>('upload');
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const effectiveAvatar = getEffectiveAvatar(currentAvatarUrl, seedName);
  const isCustomPhoto = currentAvatarUrl?.startsWith('data:image/');
  const isPresetSelected = PRESET_3D_AVATARS.some(p => p.url === currentAvatarUrl);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so re-selecting same file works
    e.target.value = '';

    try {
      setIsCompressing(true);
      setErrorMessage(null);
      
      const { dataUrl, sizeKb } = await compressImageFile(file, 120, 0.78);
      onChangeAvatar(dataUrl);
      setCompressionInfo(`Photo optimized (${sizeKb} KB)`);
    } catch (err: any) {
      console.error("Image compression error:", err);
      setErrorMessage(err.message || "Failed to process photo.");
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSelectPreset = (url: string) => {
    setCompressionInfo(null);
    setErrorMessage(null);
    onChangeAvatar(url);
  };

  const handleRemove = () => {
    setCompressionInfo(null);
    setErrorMessage(null);
    onChangeAvatar(undefined);
  };

  return (
    <div className="space-y-3 p-3.5 bg-white/70 border border-orange-200/70 rounded-2xl shadow-2xs">
      
      {/* Header & Live Avatar Preview */}
      <div className="flex items-center gap-3">
        {/* Circle Preview with Platform Mini-Badge */}
        <div className="relative flex-shrink-0">
          <div className="w-14 h-14 rounded-full overflow-hidden bg-slate-100 border-2 border-orange-400 shadow-sm flex items-center justify-center">
            {isCompressing ? (
              <RefreshCw className="w-6 h-6 animate-spin text-orange-500" />
            ) : (
              <img
                src={effectiveAvatar}
                alt="Profile Preview"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            )}
          </div>
          {platform && (
            <div className="absolute -bottom-1 -right-1 bg-white p-0.5 rounded-full shadow-xs border border-slate-200">
              <PlatformIcon platform={platform} size="sm" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-slate-800 tracking-tight">{label}</h4>
            {currentAvatarUrl && (
              <button
                type="button"
                onClick={handleRemove}
                className="text-[10px] font-bold text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
          <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">
            {description}
          </p>
          {compressionInfo && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full mt-1">
              <span>✨</span> {compressionInfo}
            </span>
          )}
          {errorMessage && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full mt-1">
              <AlertCircle className="w-3 h-3" /> {errorMessage}
            </span>
          )}
        </div>
      </div>

      {/* Tabs: Upload vs 3D Avatars */}
      <div className="flex bg-slate-100/90 p-1 rounded-xl gap-1 text-[11px] font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'upload'
              ? 'bg-white text-orange-600 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Upload Real Photo</span>
          {isCustomPhoto && <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('presets')}
          className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'presets'
              ? 'bg-white text-orange-600 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>3D Avatars (16)</span>
          {isPresetSelected && <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>}
        </button>
      </div>

      {/* Tab 1: Upload Phone Photo */}
      {activeTab === 'upload' && (
        <div className="pt-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <button
            type="button"
            disabled={isCompressing}
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-2.5 px-3 border-2 border-dashed border-orange-300 hover:border-orange-500 bg-orange-50/50 hover:bg-orange-50 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-orange-700 transition-all active:scale-98"
          >
            {isCompressing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-orange-600" />
                <span>Optimizing & Compressing in browser...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 text-orange-600" />
                <span>{isCustomPhoto ? 'Change Uploaded Photo' : 'Select Photo from Phone / Camera'}</span>
              </>
            )}
          </button>
          <p className="text-[9px] text-center text-slate-500 mt-1 font-medium">
            Photo will be automatically centered and sized for social feeds
          </p>
        </div>
      )}

      {/* Tab 2: 1-Tap 3D Avatar Gallery */}
      {activeTab === 'presets' && (
        <div className="pt-1 space-y-1.5">
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 max-h-44 overflow-y-auto p-1 bg-slate-50/70 rounded-xl border border-slate-200/80">
            {PRESET_3D_AVATARS.map((avatar) => {
              const isSelected = currentAvatarUrl === avatar.url;
              return (
                <button
                  key={avatar.id}
                  type="button"
                  onClick={() => handleSelectPreset(avatar.url)}
                  title={avatar.name}
                  className={`group relative rounded-full p-1 transition-all aspect-square flex items-center justify-center ${
                    isSelected
                      ? 'ring-2 ring-orange-500 scale-105 bg-orange-100 shadow-xs'
                      : 'hover:scale-105 hover:bg-slate-200'
                  }`}
                >
                  <img
                    src={avatar.url}
                    alt={avatar.name}
                    className="w-10 h-10 rounded-full object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                  {isSelected && (
                    <div className="absolute -top-1 -right-1 bg-orange-500 text-white rounded-full p-0.5 shadow-2xs">
                      <Check className="w-2.5 h-2.5" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-[9px] text-slate-500 font-medium text-center">
            Tap any avatar to select instantly. Perfect for privacy or meme vibes!
          </p>
        </div>
      )}

    </div>
  );
};
